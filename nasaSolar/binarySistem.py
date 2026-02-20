import spiceypy as sp
import struct
import urllib.request
import pathlib

# --- auto download kernels ---
KERNELS = {
    "naif0012.tls":
        "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
    "pck00010.tpc":
        "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc",
    "de440s.bsp":
        "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp"
}

for k, url in KERNELS.items():
    if not pathlib.Path(k).exists():
        urllib.request.urlretrieve(url, k)

# --- load kernels ---
for k in KERNELS:
    sp.furnsh(k)

bodies = {
    "sun": "SUN",
    "earth": "EARTH",
    "moon": "MOON"
}

start_et = sp.utc2et("2026-01-01T00:00:00")
end_et   = sp.utc2et("2026-01-02T00:00:00")
step = 1.0

def write_record(f, et, pos, quat):
    f.write(struct.pack(
        "8d",
        et,
        pos[0], pos[1], pos[2],
        quat[0], quat[1], quat[2], quat[3]
    ))

files = {k: open(f"{k}.bin", "wb") for k in bodies}

et = start_et
while et <= end_et:
    for key, body in bodies.items():
        state, _ = sp.spkezr(body, et, "J2000", "NONE", "SUN")
        pos = state[:3]
        rot = sp.pxform(f"IAU_{body}", "J2000", et)
        quat = sp.m2q(rot)
        write_record(files[key], et, pos, quat)
    et += step

for f in files.values():
    f.close()

sp.kclear()