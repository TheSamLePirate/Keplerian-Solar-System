#!/usr/bin/env python3
"""
saveExportSpice_fast.py — Optimized parallel exporter for SPICE kernels.

Optimizations:
1. Multiprocessing: Exports multiple targets in parallel.
2. Strategy Pre-calculation: Determines the valid SPICE frame computation method (Direct, SSB-relative, Jup-relative) ONCE per target, removing try/except blocks from the inner loop.
3. Frame Caching: Resolves reference frame names (e.g. IAU_EARTH) once per target.
4. Removed redundant string formatting and lookups in the hot loop.

Usage:
  python3 saveExportSpice_fast.py --preset planets+jupiter-moons --jup-kernel jup365.bsp --format bin --out out_fast
"""

from __future__ import annotations

import argparse
import json
import multiprocessing
import pathlib
import re
import struct
import sys
import time
import urllib.request
from typing import Dict, Iterable, List, Optional, Tuple, Any

import spiceypy as sp

# -------------------------
# Constants
# -------------------------
JUP_BARY_ID = 5
SSB_ID = 0

KERNEL_URLS = {
    "naif0012.tls": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
    "pck00010.tpc": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc",
    "de440s.bsp":   "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp",
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

# -------------------------
# Helpers
# -------------------------

def is_int_token(s: str) -> bool:
    return re.fullmatch(r"[+-]?\d+", s.strip()) is not None

def safe_stem(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "target"

def ensure_file(path: pathlib.Path, url: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        urllib.request.urlretrieve(url, path.as_posix())

def load_kernels(paths: List[str]) -> None:
    # sp.furnsh is process-local in CSPICE usually, but in Python multithreading it might share?
    # In multiprocessing, each process has its own memory space, so we MUST load kernels in each worker.
    sp.kclear() # Clear any existing to be safe
    for p in paths:
        sp.furnsh(p)

# -------------------------
# Selection / Setup Logic
# -------------------------

def build_spk_coverage_index(spk_files: List[str], et_probe: float, frame: str, abcorr: str) -> Dict[int, bool]:
    # We do a temporary load here in the main process just to check existence
    sp.kclear()
    for p in spk_files:
        sp.furnsh(p)
    
    present_and_works: Dict[int, bool] = {}
    
    # helper internal function since kernels are loaded
    def check_id(oid):
        try:
            sp.spkez(oid, et_probe, frame, abcorr, SSB_ID)
            return True
        except:
            pass
        try:
            sp.spkez(oid, et_probe, frame, abcorr, JUP_BARY_ID)
            return True
        except:
            pass
        return False

    for spk in spk_files:
        try:
            ids = sp.spkobj(spk)
        except Exception:
            continue

        for obj_id in ids:
            oid = int(obj_id)
            if present_and_works.get(oid) is True:
                continue
            present_and_works[oid] = check_id(oid)
            
    return present_and_works

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
    
    # We need the kernels loaded to call bodc2n for naming, if strictly following original logic.
    # Main process has kernels loaded from build_spk_coverage_index usually, but let's ensure.
    
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

# -------------------------
# Worker Logic
# -------------------------

# Initializer for the pool to load kernels once
def init_worker(kernel_paths: List[str], q: multiprocessing.Queue):
    load_kernels(kernel_paths)
    global progress_queue
    progress_queue = q

def determine_strategy(target_id: int, observer_id: int, et: float, frame: str, abcorr: str) -> int:
    """
    Returns an integer representing the strategy:
    0: DIRECT (target -> observer)
    1: SSB_REL (target->SSB - observer->SSB)
    2: JUP_REL (target->JUP - observer->JUP)
    -1: FAILURE
    """
    if target_id == observer_id:
        return 0 # Trivial
    
    # Try direct
    try:
        sp.spkez(target_id, et, frame, abcorr, observer_id)
        return 0
    except:
        pass
        
    # Try SSB
    try:
        sp.spkez(target_id, et, frame, abcorr, SSB_ID)
        sp.spkez(observer_id, et, frame, abcorr, SSB_ID)
        return 1
    except:
        pass
        
    # Try JUP
    try:
        sp.spkez(target_id, et, frame, abcorr, JUP_BARY_ID)
        sp.spkez(observer_id, et, frame, abcorr, JUP_BARY_ID)
        return 2
    except:
        pass
        
    return -1

def get_rotation_frame(target_id: int) -> str:
    try:
        name = sp.bodc2n(target_id)
        return f"IAU_{name}"
    except:
        return ""

def export_target_task(args):
    """
    Worker function to export a single target.
    args is a tuple/dict containing all necessary info.
    """
    (key, target_id, observer_id, frame, abcorr, start_et, end_et, step, fmt, out_dir_str, utc_format, utc_prec) = args
    
    out_dir = pathlib.Path(out_dir_str)
    
    # 1. Determine Strategy
    strategy = determine_strategy(target_id, observer_id, start_et, frame, abcorr)
    if strategy == -1:
        return (key, False, "Could not determine valid SPICE strategy")
    
    # 2. Determine Rotation Frame
    rot_from_frame = get_rotation_frame(target_id)
    
    # 3. Open File
    ext = "bin" if fmt == "bin" else "json"
    filepath = out_dir / f"{key}.{ext}"
    
    # Prepare data structures
    data_json = [] # used only if fmt == 'json'
    f_bin = None
    
    if fmt == "bin":
        f_bin = open(filepath, "wb")
    
    # Pre-resolve functions to avoid dot lookups in loop
    _spkez = sp.spkez
    _pxform = sp.pxform
    _m2q = sp.m2q
    _pack = struct.pack
    
    # Constants for loop
    ssb_id = SSB_ID
    jup_id = JUP_BARY_ID
    
    total_steps = int((end_et - start_et) / step) + 1
    current_step = 0
    steps_since_update = 0
    et = start_et
    
    # Performance optimization: local variables
    # Only calculate rot_frame if valid
    has_rot = bool(rot_from_frame)
    
    try:
        while et <= end_et + 1e-12:
            # --- Position ---
            x, y, z = 0.0, 0.0, 0.0
            
            if target_id != observer_id:
                if strategy == 0: # Direct
                    st, _ = _spkez(target_id, et, frame, abcorr, observer_id)
                    x, y, z = st[0], st[1], st[2]
                elif strategy == 1: # SSB
                    st_t, _ = _spkez(target_id, et, frame, abcorr, ssb_id)
                    st_o, _ = _spkez(observer_id, et, frame, abcorr, ssb_id)
                    x, y, z = st_t[0] - st_o[0], st_t[1] - st_o[1], st_t[2] - st_o[2]
                elif strategy == 2: # JUP
                    st_t, _ = _spkez(target_id, et, frame, abcorr, jup_id)
                    st_o, _ = _spkez(observer_id, et, frame, abcorr, jup_id)
                    x, y, z = st_t[0] - st_o[0], st_t[1] - st_o[1], st_t[2] - st_o[2]
            
            # --- Rotation ---
            qw, qx, qy, qz = 1.0, 0.0, 0.0, 0.0
            if has_rot:
                try:
                    rot = _pxform(rot_from_frame, frame, et)
                    q = _m2q(rot)
                    qw, qx, qy, qz = q[0], q[1], q[2], q[3]
                except:
                    pass # Keep identity
            
            # --- Write ---
            if fmt == "bin":
                f_bin.write(_pack(RECORD_FMT, et, x, y, z, qw, qx, qy, qz))
            else:
                # JSON needs UTC
                # We do this calculation only if JSON
                utc = sp.et2utc(et, utc_format, utc_prec)
                data_json.append({
                    "utc": utc,
                    "et": float(et),
                    "position": [float(x), float(y), float(z)],
                    "rotation": [float(qw), float(qx), float(qy), float(qz)],
                })

            current_step += 1
            steps_since_update += 1
            et += step
            
            # Progress update hook
            if steps_since_update >= 1000:
                progress_queue.put(steps_since_update)
                steps_since_update = 0

        # Send remaining steps
        if steps_since_update > 0:
            progress_queue.put(steps_since_update)

        if fmt == "json":
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data_json, f, ensure_ascii=False, indent=2)
                
    except Exception as e:
        return (key, False, str(e))
    finally:
        if f_bin:
            f_bin.close()
            
    return (key, True, f"Steps: {current_step}")

# -------------------------
# Main
# -------------------------

def print_progress(current: int, total: int, prefix: str = "", suffix: str = "", decimals: int = 1, length: int = 50, fill: str = "█", print_end: str = "\r") -> None:
    percent = ("{0:." + str(decimals) + "f}").format(100 * (current / float(total)))
    filled_length = int(length * current // total)
    bar = fill * filled_length + "-" * (length - filled_length)
    print(f"\r{prefix} |{bar}| {percent}% {suffix}", end=print_end, file=sys.stderr)
    if current == total:
        print(file=sys.stderr)

def parse_args(argv: List[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="spice_export_fast.py")

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
    p.add_argument("--workers", type=int, default=None, help="Number of worker processes (default: cpu count)")

    return p.parse_args(argv)

def main(argv: List[str]) -> int:
    args = parse_args(argv)
    frame = FRAME_BY_UP[args.up]
    kernel_dir = pathlib.Path(args.kernels_dir)

    # 1. Ensure Kernels (Single threaded, fast enough)
    if not args.no_download:
        ensure_file(kernel_dir / args.lsk, KERNEL_URLS[args.lsk])
        ensure_file(kernel_dir / args.pck, KERNEL_URLS[args.pck])
        ensure_file(kernel_dir / args.spk, KERNEL_URLS[args.spk])
        if args.jup_kernel != "none":
            ensure_file(kernel_dir / args.jup_kernel, JUP_KERNEL_URLS[args.jup_kernel])

    # 2. Collect Kernel Paths
    paths = [str(kernel_dir / args.lsk), str(kernel_dir / args.pck)]
    # Satellites
    if args.jup_kernel != "none":
        paths.append(str(kernel_dir / args.jup_kernel))
    # Extra
    for ek in args.extra_kernel:
        paths.append(str(ek))
    # Planets
    paths.append(str(kernel_dir / args.spk))

    for pth in paths:
        if not pathlib.Path(pth).exists():
            print(f"Missing kernel: {pth}", file=sys.stderr)
            return 2

    print(f"Loading kernels for setup...", file=sys.stderr)
    load_kernels(paths) # Load in main process for ID resolution

    try:
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
             if str(ek).lower().endswith((".bsp", ".spk")):
                spk_files.append(str(ek))

        print(f"Building coverage index...", file=sys.stderr)
        present = build_spk_coverage_index(spk_files, start_et, frame, args.abcorr)
        
        targets = parse_targets(args, present)
        print(f"Targets to export: {[t[0] for t in targets]}", file=sys.stderr)
        
    finally:
        sp.kclear() # Clear in main process, workers will load their own
        
    # 3. Prepare Tasks
    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    tasks = []
    for key, tid in targets:
        tasks.append((
            key, tid, observer_id, frame, args.abcorr,
            start_et, end_et, float(args.step),
            args.format, str(out_dir), args.utc_format, int(args.utc_prec)
        ))

    # 4. Run Parallel Output
    workers = args.workers if args.workers else multiprocessing.cpu_count()
    print(f"Starting pool with {workers} workers for {len(tasks)} targets...", file=sys.stderr)
    
    t0 = time.time()
    
    # Calculate total steps for progress bar
    steps_per_target = int((end_et - start_et) / float(args.step)) + 1
    total_steps_all = steps_per_target * len(tasks)
    
    manager = multiprocessing.Manager()
    queue = manager.Queue()
    
    # Use map_async to allow main thread to monitor queue
    with multiprocessing.Pool(processes=workers, initializer=init_worker, initargs=(paths, queue)) as pool:
        async_result = pool.map_async(export_target_task, tasks)
        
        # Monitor Loop
        processed_steps = 0
        while not async_result.ready():
            # Consume all currently available items in queue
            while not queue.empty():
                try:
                    processed_steps += queue.get_nowait()
                except:
                    break
            
            print_progress(processed_steps, total_steps_all, prefix="Total Progress:", suffix="Complete", length=40)
            time.sleep(0.1)
        
        # Final update
        while not queue.empty():
            try:
                processed_steps += queue.get_nowait()
            except:
                break
        print_progress(total_steps_all, total_steps_all, prefix="Total Progress:", suffix="Complete", length=40)
        
        results = async_result.get()
        
    t1 = time.time()
    
    # 5. Report
    print(f"\nDone in {t1-t0:.2f}s", file=sys.stderr)
    for key, success, msg in results:
        status = "OK" if success else "FAIL"
        print(f"{key:>15}: {status} ({msg})", file=sys.stderr)

    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
