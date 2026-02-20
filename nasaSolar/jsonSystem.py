import spiceypy as sp
import urllib.request
import pathlib
import json

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

start_et = sp.utc2et("2000-01-01T00:00:00")
end_et   = sp.utc2et("2000-01-02T00:00:00")
step = 1.0

data = {k: [] for k in bodies}

et = start_et
while et <= end_et:
    for key, body in bodies.items():
        state, _ = sp.spkezr(body, et, "J2000", "NONE", "SUN")
        pos = state[:3].tolist()
        rot = sp.pxform(f"IAU_{body}", "J2000", et)
        quat = sp.m2q(rot).tolist()
        utc = sp.et2utc(et, "ISOC", 6)

        data[key].append({
            "timestamp": float(et),
            "utc": utc,
            "position": pos,
            "rotation": quat
        })

    et += step

for key in bodies:
    with open(f"{key}.json", "w") as f:
        json.dump(data[key], f, indent=2)

sp.kclear()