#!/usr/bin/env python3
"""
spice_export.py — Best-effort robust exporter (DE440/DE440s + jup365/jup344)

Outputs ONE file per target:
- BIN: float64 records [et, x, y, z, qw, qx, qy, qz]
- JSON: [{"utc": "...", "et": ..., "position":[...], "rotation":[...]}]  (UTC always included)

Robust ID resolution:
- Read loaded SPK files
- For each SPK file: spkobj() => IDs present
- For each candidate ID: spkcov() => time coverage window; check that ET is included
- Choose first candidate ID that exists+covers ET (ordered by --prefer center|barycenter)

Relative state computation:
1) spkez(target, et, frame, abcorr, observer)
2) (target wrt SSB) - (observer wrt SSB)  using spkez(*, observer=0)
3) error

Rotation:
- quaternion from IAU_<BODYNAME> -> frame; identity if unavailable

Examples:
  python3.11 spice_export.py --preset planets+jupiter-moons --jup-kernel jup365.bsp --format bin --out out_all
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import struct
import sys
import urllib.request
from typing import Dict, Iterable, List, Optional, Tuple

import spiceypy as sp


JUP_BARY_ID = 5
# -------------------------
# Kernel URLs (NAIF)
# -------------------------
KERNEL_URLS = {
    "naif0012.tls": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
    "pck00010.tpc": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc",
    "de440s.bsp":   "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp",
    #"de440.bsp":    "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440.bsp",
}

JUP_KERNEL_URLS = {
    "jup365.bsp": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/jup365.bsp",
    "jup344.bsp": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/jup344.bsp",
}

FRAME_BY_UP = {
    "earth": "J2000",
    "ecliptic": "ECLIPJ2000",
}

RECORD_FMT = "8d"  # et, x,y,z, qw,qx,qy,qz
IDENTITY_QUAT = (1.0, 0.0, 0.0, 0.0)

SSB_ID = 0

ALIASES = {
    "sun": "sun",
    "mercury": "mercury",
    "venus": "venus",
    "earth": "earth",
    "moon": "moon",
    "mars": "mars",
    "jupiter": "jupiter",
    "saturn": "saturn",
    "uranus": "uranus",
    "neptune": "neptune",
    "pluto": "pluto",
    "io": "io",
    "europa": "europa",
    "ganymede": "ganymede",
    "callisto": "callisto",
    "j1": "io",
    "j2": "europa",
    "j3": "ganymede",
    "j4": "callisto",
}

PRESETS = {
    "planets": ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"],
    "planets+moon": ["mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune"],
    "planets+jupiter-moons": ["mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune",
                             "io", "europa", "ganymede", "callisto"],
}

# Candidate NAIF IDs for each logical body.
# prefer=center tries centers first, prefer=barycenter tries barycenters first.
CANDIDATES_CENTER = {
    "sun":      [10],
    "mercury":  [199, 1],
    "venus":    [299, 2],
    "earth":    [399, 3],
    "moon":     [301],
    "mars":     [499, 4],
    "jupiter":  [599, 5],
    "saturn":   [699, 6],
    "uranus":   [799, 7],
    "neptune":  [899, 8],
    "pluto":    [999, 9],
    "io":       [501],
    "europa":   [502],
    "ganymede": [503],
    "callisto": [504],
}

CANDIDATES_BARY = {
    "sun":      [10],
    "mercury":  [1, 199],
    "venus":    [2, 299],
    "earth":    [3, 399],
    "moon":     [301],
    "mars":     [4, 499],
    "jupiter":  [5, 599],
    "saturn":   [6, 699],
    "uranus":   [7, 799],
    "neptune":  [8, 899],
    "pluto":    [9, 999],
    "io":       [501],
    "europa":   [502],
    "ganymede": [503],
    "callisto": [504],
}


def is_int_token(s: str) -> bool:
    return re.fullmatch(r"[+-]?\d+", s.strip()) is not None


def safe_stem(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "target"


def print_progress(current: int, total: int, prefix: str = "", suffix: str = "", decimals: int = 1, length: int = 50, fill: str = "█", print_end: str = "\r") -> None:
    """
    Call in a loop to create terminal progress bar
    @params:
        current   - Required  : current iteration (Int)
        total     - Required  : total iterations (Int)
        prefix    - Optional  : prefix string (Str)
        suffix    - Optional  : suffix string (Str)
        decimals  - Optional  : positive number of decimals in percent complete (Int)
        length    - Optional  : character length of bar (Int)
        fill      - Optional  : bar fill character (Str)
        print_end - Optional  : end character (e.g. "\r", "\r\n") (Str)
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (current / float(total)))
    filled_length = int(length * current // total)
    bar = fill * filled_length + "-" * (length - filled_length)
    print(f"\r{prefix} |{bar}| {percent}% {suffix}", end=print_end, file=sys.stderr)
    # Print New Line on Complete
    if current == total:
        print(file=sys.stderr)


def ensure_file(path: pathlib.Path, url: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        urllib.request.urlretrieve(url, path.as_posix())


def load_kernels(paths: Iterable[pathlib.Path]) -> None:
    for p in paths:
        sp.furnsh(p.as_posix())


def et_range(start_et: float, end_et: float, step: float) -> Iterable[Tuple[float, int, int]]:
    if step <= 0:
        raise ValueError("step must be > 0 seconds")
    total_steps = int((end_et - start_et) / step) + 1
    current_step = 0
    et = start_et
    while et <= end_et + 1e-12:
        yield et, current_step, total_steps
        current_step += 1
        et += step


def try_spkez(target: int, et: float, frame: str, abcorr: str, observer: int) -> Optional[List[float]]:
    try:
        st, _lt = sp.spkez(target, et, frame, abcorr, observer)
        return list(st)
    except Exception:
        return None


def state_relative(target_id: int, observer_id: int, et: float, frame: str, abcorr: str) -> List[float]:
    if target_id == observer_id:
        return [0.0] * 6

    direct = try_spkez(target_id, et, frame, abcorr, observer_id)
    if direct is not None:
        return direct

    # SSB subtraction
    st_t = try_spkez(target_id, et, frame, abcorr, SSB_ID)
    st_o = try_spkez(observer_id, et, frame, abcorr, SSB_ID)
    if st_t is not None and st_o is not None:
        return [st_t[i] - st_o[i] for i in range(6)]

    # Jupiter barycenter subtraction fallback (helps for Jupiter moons)
    st_t = try_spkez(target_id, et, frame, abcorr, JUP_BARY_ID)
    st_o = try_spkez(observer_id, et, frame, abcorr, JUP_BARY_ID)
    if st_t is not None and st_o is not None:
        return [st_t[i] - st_o[i] for i in range(6)]

    raise RuntimeError(f"Cannot compute relative state target={target_id} observer={observer_id}")
    

def try_quat_from_iau(target_id: int, frame: str, et: float) -> Tuple[float, float, float, float]:
    try:
        name = sp.bodc2n(target_id)
    except Exception:
        return IDENTITY_QUAT

    from_frame = f"IAU_{name}"
    try:
        rot = sp.pxform(from_frame, frame, et)
        q = sp.m2q(rot)
        return float(q[0]), float(q[1]), float(q[2]), float(q[3])
    except Exception:
        return IDENTITY_QUAT


def loaded_spk_files() -> List[str]:
    # Robust across spiceypy/CSPICE variants: scan ALL loaded kernels,
    # keep those whose kernel type is SPK (or filename looks like an SPK).
    n = sp.ktotal("ALL")
    out = []
    for i in range(n):
        kd = sp.kdata(i, "ALL")
        fname = kd[0]
        ftype = kd[1] if len(kd) > 1 else ""
        if (str(ftype).upper() == "SPK") or str(fname).lower().endswith((".bsp", ".spk")):
            out.append(fname)
    return out

def build_spk_coverage_index(spk_files: List[str], et_probe: float, frame: str, abcorr: str) -> Dict[int, bool]:
    present_and_works: Dict[int, bool] = {}

    for spk in spk_files:
        try:
            ids = sp.spkobj(spk)
        except Exception:
            continue

        for obj_id in ids:
            oid = int(obj_id)

            if present_and_works.get(oid) is True:
                continue

            ok = False

            # 1) try wrt SSB
            try:
                sp.spkez(oid, et_probe, frame, abcorr, SSB_ID)
                ok = True
            except Exception:
                pass

            # 2) fallback: Jupiter moons often work wrt Jupiter barycenter
            if not ok:
                try:
                    sp.spkez(oid, et_probe, frame, abcorr, JUP_BARY_ID)
                    ok = True
                except Exception:
                    pass

            present_and_works[oid] = present_and_works.get(oid, False) or ok

    return present_and_works


def resolve_logical_to_working_id(logical: str, prefer: str, present: Dict[int, bool]) -> int:
    logical = logical.lower()
    candidates = (CANDIDATES_BARY if prefer == "barycenter" else CANDIDATES_CENTER).get(logical)
    if not candidates:
        raise ValueError(f"No candidates for '{logical}'")
    for cid in candidates:
        if present.get(cid, False):
            return cid
    raise RuntimeError(f"No working candidate for '{logical}' at probe epoch (spkez wrt SSB failed)")
def resolve_logical_to_working_id(logical: str, prefer: str, present: Dict[int, bool]) -> int:
    logical = logical.lower()
    candidates = (CANDIDATES_BARY if prefer == "barycenter" else CANDIDATES_CENTER).get(logical)
    if not candidates:
        raise ValueError(f"No candidates for '{logical}'")
    for cid in candidates:
        if present.get(cid, False):
            return cid
    raise RuntimeError(f"No candidate for '{logical}' is present+covered in loaded SPKs at the probe epoch")


def parse_targets(args: argparse.Namespace, present: Dict[int, bool]) -> List[Tuple[str, int]]:
    tokens: List[str] = []
    if args.preset:
        tokens.extend(PRESETS[args.preset])
    if args.targets:
        tokens.extend([t.strip() for t in args.targets.split(",") if t.strip()])
    if not tokens:
        raise ValueError("No targets provided (use --preset and/or --targets)")

    out: List[Tuple[str, int]] = []
    used_keys = set()

    for tok in tokens:
        if is_int_token(tok):
            tid = int(tok)
            if not present.get(tid, False):
                raise RuntimeError(f"Requested NAIF id {tid} is not present+covered in loaded SPKs at probe epoch")
            try:
                nm = sp.bodc2n(tid)
                key = safe_stem(nm)
            except Exception:
                key = safe_stem(tok)
        else:
            base = tok.lower().replace(" ", "")
            logical = ALIASES.get(base, base)
            tid = resolve_logical_to_working_id(logical, args.prefer, present)
            key = safe_stem(logical)

        base_key = key
        i = 2
        while key in used_keys:
            key = f"{base_key}_{i}"
            i += 1
        used_keys.add(key)
        out.append((key, tid))

    return out


def export_bin(out_dir: pathlib.Path, targets: List[Tuple[str, int]],
               observer_id: int, frame: str, abcorr: str,
               start_et: float, end_et: float, step: float) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {k: open(out_dir / f"{k}.bin", "wb") for k, _ in targets}
    try:
        print(f"Exporting BIN ({len(targets)} targets)...", file=sys.stderr)
        for et, cur, tot in et_range(start_et, end_et, step):
            print_progress(cur + 1, tot, prefix="Progress:", suffix="Complete", length=40)
            for key, tid in targets:
                st = state_relative(tid, observer_id, et, frame, abcorr)
                x, y, z = st[0], st[1], st[2]
                qw, qx, qy, qz = try_quat_from_iau(tid, frame, et)
                files[key].write(struct.pack(
                    RECORD_FMT,
                    float(et),
                    float(x), float(y), float(z),
                    float(qw), float(qx), float(qy), float(qz),
                ))
    finally:
        for f in files.values():
            f.close()


def export_json(out_dir: pathlib.Path, targets: List[Tuple[str, int]],
                observer_id: int, frame: str, abcorr: str,
                start_et: float, end_et: float, step: float,
                utc_format: str, utc_prec: int) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    data: Dict[str, list] = {k: [] for k, _ in targets}

    print(f"Exporting JSON ({len(targets)} targets)...", file=sys.stderr)
    for et, cur, tot in et_range(start_et, end_et, step):
        print_progress(cur + 1, tot, prefix="Progress:", suffix="Complete", length=40)
        utc = sp.et2utc(et, utc_format, utc_prec)
        for key, tid in targets:
            st = state_relative(tid, observer_id, et, frame, abcorr)
            x, y, z = st[0], st[1], st[2]
            qw, qx, qy, qz = try_quat_from_iau(tid, frame, et)
            data[key].append({
                "utc": utc,
                "et": float(et),
                "position": [float(x), float(y), float(z)],
                "rotation": [float(qw), float(qx), float(qy), float(qz)],
            })

    print("Writing JSON files...", file=sys.stderr)
    for key, _ in targets:
        with open(out_dir / f"{key}.json", "w", encoding="utf-8") as f:
            json.dump(data[key], f, ensure_ascii=False, indent=2)


def parse_args(argv: List[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="spice_export.py")

    p.add_argument("--format", choices=["bin", "json"], default="bin")
    p.add_argument("--out", default="out")

    p.add_argument("--up", choices=["earth", "ecliptic"], default="earth")
    p.add_argument("--abcorr", default="NONE")
    p.add_argument("--observer", default="SUN")  # name or NAIF ID

    p.add_argument("--start-utc", default="2026-01-01T00:00:00")
    p.add_argument("--end-utc", default="2027-01-01T00:00:00")
    p.add_argument("--step", type=float, default=3600.0)

    p.add_argument("--utc-format", default="ISOC")
    p.add_argument("--utc-prec", type=int, default=6)

    p.add_argument("--kernels-dir", default="kernels")
    p.add_argument("--spk", choices=["de440s.bsp", "de440.bsp"], default="de440s.bsp")
    p.add_argument("--lsk", default="naif0012.tls")
    p.add_argument("--pck", default="pck00010.tpc")
    p.add_argument("--jup-kernel", choices=["none", "jup365.bsp", "jup344.bsp"], default="none")
    p.add_argument("--extra-kernel", action="append", default=[])
    p.add_argument("--no-download", action="store_true")

    p.add_argument("--prefer", choices=["center", "barycenter"], default="center")

    p.add_argument("--preset", choices=sorted(PRESETS.keys()), default=None)
    p.add_argument("--targets", default=None)

    p.add_argument("--dump-spk-ids", action="store_true",
                   help="Print IDs present in loaded SPKs (for debugging)")

    return p.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    frame = FRAME_BY_UP[args.up]
    kernel_dir = pathlib.Path(args.kernels_dir)

    if not args.no_download:
        ensure_file(kernel_dir / args.lsk, KERNEL_URLS[args.lsk])
        ensure_file(kernel_dir / args.pck, KERNEL_URLS[args.pck])
        ensure_file(kernel_dir / args.spk, KERNEL_URLS[args.spk])
        if args.jup_kernel != "none":
            ensure_file(kernel_dir / args.jup_kernel, JUP_KERNEL_URLS[args.jup_kernel])

    #paths = [kernel_dir / args.lsk, kernel_dir / args.pck, kernel_dir / args.spk]
    paths = [kernel_dir / args.lsk, kernel_dir / args.pck, kernel_dir / args.spk]

    # satellites first
    if args.jup_kernel != "none":
        paths.append(kernel_dir / args.jup_kernel)

    # extra kernels next
    for ek in args.extra_kernel:
        paths.append(pathlib.Path(ek))

    # planets LAST (highest priority)
    paths.append(kernel_dir / args.spk)

    for pth in paths:
        if not pth.exists():
            print(f"Missing kernel: {pth.as_posix()}", file=sys.stderr)
            return 2

    sp.kclear()
    try:
        load_kernels(paths)

        start_et = float(sp.utc2et(args.start_utc))
        end_et = float(sp.utc2et(args.end_utc))

        # observer id
        if is_int_token(str(args.observer)):
            observer_id = int(str(args.observer))
        else:
            observer_id = int(sp.bodn2c(str(args.observer).upper()))

        # coverage index
        spk_files = [str(kernel_dir / args.spk)]
        if args.jup_kernel != "none":
            spk_files.append(str(kernel_dir / args.jup_kernel))
        for ek in args.extra_kernel:
            p = str(pathlib.Path(ek))
            if p.lower().endswith((".bsp", ".spk")):
                spk_files.append(p)

        present = build_spk_coverage_index(spk_files, start_et, frame, args.abcorr)

        if args.dump_spk_ids:
            print("SPK files scanned:")
            for f in spk_files:
                print("  ", f)
            ids = sorted([i for i, ok in present.items() if ok])
            print("IDs present+covered at start epoch:")
            for i in ids:
                try:
                    nm = sp.bodc2n(i)
                except Exception:
                    nm = "?"
                print(f"  {i:6d}  {nm}")
            return 0

        targets = parse_targets(args, present)

        # validate relative state at start epoch
        for key, tid in targets:
            _ = state_relative(tid, observer_id, start_et, frame, args.abcorr)

        out_dir = pathlib.Path(args.out)
        if args.format == "bin":
            export_bin(out_dir, targets, observer_id, frame, args.abcorr, start_et, end_et, float(args.step))
        else:
            export_json(out_dir, targets, observer_id, frame, args.abcorr, start_et, end_et, float(args.step),
                        args.utc_format, int(args.utc_prec))

        return 0

    finally:
        sp.kclear()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))