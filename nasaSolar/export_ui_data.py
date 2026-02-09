#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import math
from skyfield.api import load, Topos
from skyfield.framelib import ecliptic_frame
from skyfield.elementslib import osculating_elements_of

# --- Configuration ---
BSP_PLANETS = "de440s.bsp"
BSP_JUPITER = "jup365.bsp"
OUTPUT_FILE = "../constants.ts"


# Simulation Scales
AU_SCALE = 50.0          # 1 AU = 50 3D units
PLANET_SCALE = 0.5       # Base visual scale for planets
MOON_ORBIT_SCALE = 30.0  # Visual exaggeration for moon orbits

# Visual Data (Preserved from original constants.ts)
VISUAL_DATA = {
    "mercury": {
        "name": "Mercury",
        "type": "planet",
        "color": "#A5A5A5",
        "radius": 0.38,
        "description": "The smallest planet in the Solar System and the closest to the Sun.",
        "rotationPeriod": 1407.6,
        "axialTilt": 0.03,
        "textureUrl": "/tex/base/mercury-high.jpg",
        "displacementMapUrl": "/tex/base/mercury-height-high.jpg"
    },
    "venus": {
        "name": "Venus",
        "type": "planet",
        "color": "#E3BB76",
        "atmosphereColor": "#FFA500",
        "radius": 0.95,
        "description": "The second planet from the Sun. It has a thick atmosphere that traps heat.",
        "rotationPeriod": -5832.5,
        "axialTilt": 177.3,
        "textureUrl": "/tex/base/venus-high.jpg",
        "normalMapUrl": "/tex/base/venus-normal.jpg"
    },
    "earth": {
        "name": "Earth",
        "type": "planet",
        "color": "#22A6B3",
        "atmosphereColor": "#4CA6FF",
        "radius": 1.0,
        "description": "Our home. The only known planet to support life.",
        "rotationPeriod": 23.93,
        "axialTilt": 23.44,
        "textureUrl": "/textures/earth_daymap.jpg",
        "normalMapUrl": "/textures/earth_normal.jpg",
        "specularMapUrl": "/textures/earth_specular.jpg"
    },
    "moon": { # Earth's Moon
        "name": "Moon",
        "type": "moon",
        "color": "#DDDDDD",
        "radius": 0.273,
        "description": "Earth's only natural satellite.",
        "rotationPeriod": 655.7,
        "axialTilt": 6.68,
        "textureUrl": "/tex/base/moon-high.jpg",
        "normalMapUrl": "/tex/base/moon-normal-high.jpg",
        "displacementMapUrl": "/tex/base/moon-height-high.jpg"
    },
    "mars": {
        "name": "Mars",
        "type": "planet",
        "color": "#FF6B6B",
        "atmosphereColor": "#C1440E",
        "radius": 0.53,
        "textureUrl": "/textures/mars_daymap.jpg",
        "normalMapUrl": "/textures/mars_normal.jpg",
        "displacementMapUrl": "/tex/base/mars-height-high.jpg",
        "description": "The Red Planet. Dusty, cold, desert world with a very thin atmosphere.",
        "rotationPeriod": 24.62,
        "axialTilt": 25.19
    },
    "jupiter": {
        "name": "Jupiter",
        "type": "planet",
        "color": "#D4A373",
        "atmosphereColor": "#C6A584",
        "radius": 11.2,
        "textureUrl": "/textures/jupiter_daymap.jpg",
        "description": "The largest planet in the Solar System. A gas giant with a Great Red Spot.",
        "rotationPeriod": 9.93,
        "axialTilt": 3.13
    },
    "io": {
        "name": "Io",
        "type": "moon",
        "color": "#F4D03F",
        "radius": 0.286,
        "description": "The most geologically active body in the Solar System.",
        "rotationPeriod": 42.46,
        "axialTilt": 0.0,
        "textureUrl": "/tex/base/io-high.jpg",
        "normalMapUrl": "/tex/base/io-normal-high.jpg"
    },
    "europa": {
        "name": "Europa",
        "type": "moon",
        "color": "#C39BD3",
        "radius": 0.245,
        "description": "An icy moon with a subsurface ocean.",
        "rotationPeriod": 85.22,
        "axialTilt": 0.0,
        "textureUrl": "/tex/base/europa-high.jpg",
        "normalMapUrl": "/tex/base/europa-normal-high.jpg"
    },
    "ganymede": {
        "name": "Ganymede",
        "type": "moon",
        "color": "#AAB7B8",
        "radius": 0.413,
        "description": "The largest moon in the Solar System.",
        "rotationPeriod": 171.7,
        "axialTilt": 0.0,
        "textureUrl": "/tex/base/ganymede-high.jpg",
        "normalMapUrl": "/tex/base/ganymede-normal-high.jpg"
    },
    "callisto": {
        "name": "Callisto",
        "type": "moon",
        "color": "#566573",
        "radius": 0.378,
        "description": "One of the most heavily cratered objects in the Solar System.",
        "rotationPeriod": 400.5,
        "axialTilt": 0.0,
        "textureUrl": "/tex/base/callisto-diffuse-low.jpg",
        "displacementMapUrl": "/tex/base/callisto-height-low.jpg"
    },
    "saturn": {
        "name": "Saturn",
        "type": "planet",
        "color": "#EAD6B8",
        "atmosphereColor": "#D4C2AD",
        "radius": 9.45,
        "textureUrl": "/textures/saturn_daymap.jpg",
        "ringMapUrl": "/textures/saturn_ring.png",
        "ringInnerRadius": 1.2,
        "ringOuterRadius": 2.3,
        "description": "Adorned with a dazzling, complex system of icy rings.",
        "rotationPeriod": 10.66,
        "axialTilt": 26.73
    },
    "uranus": {
        "name": "Uranus",
        "type": "planet",
        "color": "#74B9FF",
        "atmosphereColor": "#A0E4FF",
        "radius": 4.0,
        "description": "An ice giant with a unique tilt, rotating on its side.",
        "rotationPeriod": -17.24,
        "axialTilt": 97.77,
        "textureUrl": "/tex/base/uranus-low.jpg"
    },
    "neptune": {
        "name": "Neptune",
        "type": "planet",
        "color": "#0984E3",
        "atmosphereColor": "#4b70dd",
        "radius": 3.88,
        "description": "The most distant major planet. Dark, cold, and whipped by supersonic winds.",
        "rotationPeriod": 16.11,
        "axialTilt": 28.32,
        "textureUrl": "/tex/base/neptune-low.jpg"
    },
    "iss": {
        "name": "ISS",
        "type": "satellite",
        "color": "#FFFFFF",
        "radius": 0.008,  # Tiny compared to planets, but visible
        "description": "The International Space Station, a modular space station in low Earth orbit.",
        "rotationPeriod": 0.0,  # No rotation (or attitude controlled)
        "axialTilt": 0.0,
        "modelUrl": "/models/ISS2.glb"  # 3D model path
    }
}

PLANET_ORDER = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]

BODY_MAPPING = {
    "mercury": "mercury",
    "venus": "venus",
    "earth": "earth barycenter", # Use barycenter for planets usually
    "mars": "mars barycenter",
    "jupiter": "jupiter barycenter",
    "saturn": "saturn barycenter",
    "uranus": "uranus barycenter",
    "neptune": "neptune barycenter",
    "moon": "moon",
    "io": "501",
    "europa": "502",
    "ganymede": "503",
    "callisto": "504"
}

MOON_PARENTS = {
    "earth": ["moon", "iss"],
    "jupiter": ["io", "europa", "ganymede", "callisto"]
}

# GM Constants (AU^3/day^2)
# Derived from DE440 or standard ratios relative to Sun
GM_SUN = 0.0002959122082855911
GM_VALUES = {
    "sun": GM_SUN,
    "mercury": GM_SUN / 6023600.0,
    "venus": GM_SUN / 408523.71,
    "earth": GM_SUN / 332946.0487,
    "moon": (GM_SUN / 332946.0487) / 81.30059, # Earth/81.3
    "mars": GM_SUN / 3098708.0,
    "jupiter": GM_SUN / 1047.3486,
    "saturn": GM_SUN / 3497.898,
    "uranus": GM_SUN / 22902.98,
    "neptune": GM_SUN / 19412.24,
    "io": GM_SUN / 1047.3486 * 4.704e-5, # Approx ratio to Jupiter
    "europa": GM_SUN / 1047.3486 * 2.528e-5,
    "ganymede": GM_SUN / 1047.3486 * 7.804e-5,
    "callisto": GM_SUN / 1047.3486 * 5.667e-5,
    "iss": 1.0e-15 # Negligible
}

def get_gm(name):
    # Map Skyfield names to our GM_VALUES keys
    if name == "sun" or name == "0" or name == "10":
        return GM_VALUES["sun"]
    elif name == "mercury":
        return GM_VALUES["mercury"]
    elif name == "venus":
        return GM_VALUES["venus"]
    elif name == "earth" or name == "399": # 399 is Earth
        return GM_VALUES["earth"]
    elif name == "earth barycenter" or name == "3": # 3 is Earth Barycenter
        # For Earth barycenter, use Earth+Moon mass
        return GM_VALUES["earth"] + GM_VALUES["moon"]
    elif name == "moon" or name == "301": # 301 is Moon
        return GM_VALUES["moon"]
    elif name == "mars" or name == "4" or name == "mars barycenter":
        return GM_VALUES["mars"]
    elif name == "jupiter" or name == "599": # 599 is Jupiter
        return GM_VALUES["jupiter"]
    elif name == "jupiter barycenter" or name == "5": # 5 is Jupiter Barycenter
        # For Jupiter barycenter, use Jupiter + Galilean moons mass
        return GM_VALUES["jupiter"] + GM_VALUES["io"] + GM_VALUES["europa"] + GM_VALUES["ganymede"] + GM_VALUES["callisto"]
    elif name == "saturn" or name == "6" or name == "saturn barycenter":
        return GM_VALUES["saturn"]
    elif name == "uranus" or name == "7" or name == "uranus barycenter":
        return GM_VALUES["uranus"]
    elif name == "neptune" or name == "8" or name == "neptune barycenter":
        return GM_VALUES["neptune"]
    elif name == "io" or name == "501":
        return GM_VALUES["io"]
    elif name == "europa" or name == "502":
        return GM_VALUES["europa"]
    elif name == "ganymede" or name == "503":
        return GM_VALUES["ganymede"]
    elif name == "callisto" or name == "504":
        return GM_VALUES["callisto"]
    elif name == "iss":
        return GM_VALUES["iss"]
    else:
        print(f"Warning: GM value not found for '{name}', returning 0.0")
        return 0.0

# ISS TLE URL from Celestrak
ISS_TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"

# IAU North Pole Data (RA, Dec in degrees)
# Source: Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements (2015)
POLE_DATA = {
    "mercury": {"ra": 281.01, "dec": 61.41},
    "venus":   {"ra": 272.76, "dec": 67.16}, # Positive pole (north) points "down" relative to orbit plane sometimes called 177 tilt
    "earth":   {"ra": 0.0,    "dec": 90.0},  # Geometric North Pole (ICRS)
    "moon":    {"ra": 266.86, "dec": 65.64},
    "mars":    {"ra": 317.68, "dec": 52.89},
    "jupiter": {"ra": 268.05, "dec": 64.49},
    "saturn":  {"ra": 40.58,  "dec": 83.54},
    "uranus":  {"ra": 257.31, "dec": -15.18}, # 98 degree tilt
    "neptune": {"ra": 299.33, "dec": 42.95}
}

def get_pole_vector(name, t):
    """
    Returns the North Pole direction vector [x, y, z] in ECLIPTIC J2000 frame.
    """
    if name not in POLE_DATA:
        return None
        
    data = POLE_DATA[name]
    ra_rad = math.radians(data["ra"])
    dec_rad = math.radians(data["dec"])
    
    # Convert Spherical (RA, Dec) to Cartesian ICRS (x, y, z)
    # x = cos(dec) * cos(ra)
    # y = cos(dec) * sin(ra)
    # z = sin(dec)
    
    x_icrs = math.cos(dec_rad) * math.cos(ra_rad)
    y_icrs = math.cos(dec_rad) * math.sin(ra_rad)
    z_icrs = math.sin(dec_rad)
    
    v_icrs = np.array([x_icrs, y_icrs, z_icrs])
    
    # Transform ICRS -> Ecliptic
    # Using Skyfield's matrix, same as for positions.
    matrix = ecliptic_frame.rotation_at(t)
    v_ecl = np.dot(matrix, v_icrs)
    
    return [float(v_ecl[0]), float(v_ecl[1]), float(v_ecl[2])]

def get_iss_elements(t, ts):
    """
    Get ISS orbital elements from real TLE data using Skyfield.
    Fetches current TLE from Celestrak and computes orbital elements.
    """
    from skyfield.api import EarthSatellite
    import urllib.request
    
    try:
        print("    Fetching ISS TLE from Celestrak...")
        
        # Fetch TLE data
        with urllib.request.urlopen(ISS_TLE_URL, timeout=10) as response:
            tle_data = response.read().decode('utf-8').strip().split('\n')
        
        if len(tle_data) >= 3:
            name = tle_data[0].strip()
            line1 = tle_data[1].strip()
            line2 = tle_data[2].strip()
        elif len(tle_data) >= 2:
            name = "ISS (ZARYA)"
            line1 = tle_data[0].strip()
            line2 = tle_data[1].strip()
        else:
            raise ValueError("Invalid TLE data")
        
        print(f"    TLE Name: {name}")
        print(f"    TLE Line1: {line1[:30]}...")
        print(f"    TLE Line2: {line2[:30]}...")
        
        # Create satellite object
        satellite = EarthSatellite(line1, line2, name, ts)
        
        # Get geocentric position at time t
        geocentric = satellite.at(t)
        
        # Get position and velocity relative to Earth center
        pos = geocentric.position.km  # km
        vel = geocentric.velocity.km_per_s  # km/s
        
        # Convert to AU and AU/day for consistency
        km_per_au = 1.496e8
        sec_per_day = 86400.0
        
        r_au = np.array(pos) / km_per_au
        v_au_day = np.array(vel) * sec_per_day / km_per_au
        
        # Transform from ICRS (Equatorial) to Ecliptic J2000
        # The simulation universe is Ecliptic-based.
        matrix = ecliptic_frame.rotation_at(ts.now()) # Use current matrix
        
        r_au_ecl = np.dot(matrix, r_au)
        v_au_ecl = np.dot(matrix, v_au_day)

        # Calculate orbital elements from state vectors in Ecliptic Frame
        elements = elements_from_vectors(r_au_ecl, v_au_ecl, get_gm("earth"))
        
        # DO NOT OVERRIDE semi-major axis. Use the real physics one.
        # Physics engine needs real 'a' to calculate real period.
        # elements["semiMajorAxis"] = 0.0003  # REMOVED
        
        print(f"    ISS inclination: {elements['inclination']:.2f} deg")
        print(f"    ISS ascending node: {elements['ascendingNode']:.2f} deg")
        print(f"    ISS mean longitude: {elements['meanLongitude']:.2f} deg")
        print(f"    ISS eccentricity: {elements['eccentricity']:.6f}")
        print(f"    ISS period (min): {elements['period'] * 365.25 * 24 * 60:.2f}")
        
        return elements
        
    except Exception as e:
        print(f"    Warning: Could not fetch ISS TLE: {e}")
        print("    Using fallback orbital parameters...")
        
        # Fallback to approximate values
        return {
            "semiMajorAxis": 4.5e-5, # Approx 6700km / 1.5e8 km
            "eccentricity": 0.0002,
            "inclination": 51.64,
            "ascendingNode": 0.0,
            "perihelion": 0.0,
            "meanLongitude": 0.0,
            "period": 1.77e-4 # ~92 mins
        }

def find_body(kernels, name):
    target = name
    if isinstance(name, str) and name.isdigit():
        target = int(name)

    for k in kernels:
        try:
            # Try original name first (in case string "399" exists as name)
            return k[name]
        except (KeyError, ValueError):
            pass
            
    if target != name:
        for k in kernels:
            try:
                return k[target]
            except (KeyError, ValueError):
                continue
                
    raise KeyError(f"{name} not found in any kernel")

def elements_from_vectors(r_vec, v_vec, mu):
    """
    Calculate Keplerian elements from position and velocity vectors.
    r_vec: Position vector [x, y, z] (AU)
    v_vec: Velocity vector [vx, vy, vz] (AU/day)
    mu: Gravitational parameter (AU^3/day^2)
    """
    h_vec = np.cross(r_vec, v_vec)
    h = np.linalg.norm(h_vec)
    
    r = np.linalg.norm(r_vec)
    v = np.linalg.norm(v_vec)
    
    # Eccentricity vector
    # e_vec = ( (v^2 - mu/r)*r_vec - (r_vec.v_vec)*v_vec ) / mu
    e_vec = ((v**2 - mu/r) * r_vec - np.dot(r_vec, v_vec) * v_vec) / mu
    e = np.linalg.norm(e_vec)
    
    # Node vector n = k x h = (-hy, hx, 0)
    # k = (0, 0, 1) usually (Ecliptic North Pole)
    n_vec = np.array([-h_vec[1], h_vec[0], 0.0])
    n = np.linalg.norm(n_vec)
    
    # Inclination
    # cos(i) = hz / h
    i = np.arccos(h_vec[2] / h)
    
    # Right Ascension of Ascending Node (Omega)
    # cos(Omega) = nx / n
    if n != 0:
        Omega = np.arccos(n_vec[0] / n)
        if n_vec[1] < 0:
            Omega = 2 * np.pi - Omega
    else:
        Omega = 0.0
        
    # Argument of Periapsis (omega)
    # cos(omega) = (n_vec . e_vec) / (n * e)
    if n != 0 and e != 0:
        dot = np.dot(n_vec, e_vec) / (n * e)
        # clamp for float errors
        dot = max(-1.0, min(1.0, dot))
        omega = np.arccos(dot)
        if e_vec[2] < 0:
            omega = 2 * np.pi - omega
    elif e != 0 and n == 0:
        # Equatorial orbit?
        # angle between e and x axis?
        omega = 0.0 
    else:
        omega = 0.0
        
    # True Anomaly (nu)
    # cos(nu) = (e_vec . r_vec) / (e * r)
    if e != 0:
        dot = np.dot(e_vec, r_vec) / (e * r)
        dot = max(-1.0, min(1.0, dot))
        nu = np.arccos(dot)
        if np.dot(r_vec, v_vec) < 0:
            nu = 2 * np.pi - nu
    else:
        nu = 0.0
        
    # Mean Anomaly
    # E via tan(E/2) = sqrt((1-e)/(1+e)) * tan(nu/2)
    E = 2 * np.arctan(np.sqrt((1 - e) / (1 + e)) * np.tan(nu / 2))
    M = E - e * np.sin(E)
    if M < 0:
        M += 2 * np.pi
    
    # Semi-major axis
    # a = mu / (2*mu/r - v^2)
    # or from period: T = 2*pi * sqrt(a^3/mu)
    energy = (v**2) / 2 - mu / r
    if abs(energy) < 1e-10:
        # Parabolic
        a = float('inf')
    else:
        a = -mu / (2 * energy)
        
    # Mean Longitude = Omega + omega + M (loosely)
    # Or just return M? The UI uses meanLongitude.
    # In types.ts: meanLongitude: number; // L (degrees) at epoch J2000
    # L = Omega + omega + M
    L = Omega + omega + M
    L = L % (2 * np.pi)
    
    # Period
    # T = 2*pi*sqrt(a^3/mu)
    if a > 0:
        period_days = 2 * np.pi * np.sqrt(a**3 / mu)
        period_years = period_days / 365.25
    else:
        period_years = 0.0

    return {
        "semiMajorAxis": float(a),
        "eccentricity": float(e),
        "inclination": float(np.degrees(i)),
        "ascendingNode": float(np.degrees(Omega)),
        "perihelion": float(np.degrees(omega)),
        "meanLongitude": float(np.degrees(L)),
        "period": float(period_years)
    }

def get_elements_for_body(kernels, body_name, center_name, t, body_id):
    """
    Returns dict of orbital elements relative to center in ECLIPTIC frame.
    """
    try:
        center = find_body(kernels, center_name)
        body = find_body(kernels, body_name)
    except KeyError as e:
        print(f"Error: {e}")
        return None

    icrs_pos = (body - center).at(t)
    
    # Transform to Ecliptic Frame
    # ecliptic_frame is J2000 Ecliptic (inertial)
    
    # Get rotation matrix (3x3)
    # Note: rotation_at(t) returns the matrix to rotate FROM the frame TO J2000? 
    # Or FROM J2000 TO the frame?
    # Skyfield docs: frame.rotation_at(t) returns M such that r_new = M * r_old?
    # Usually it returns reflection of J2000 to Frame?
    # Frame object has 'rotation_at(t)'.
    # If I have a Position in ICRS (J2000), and I want Ecliptic.
    # ICRS is the base.
    # The matrix should be J2000 -> Ecliptic.
    
    matrix = ecliptic_frame.rotation_at(t)
    
    # Check if matrix needs distinct handling given Skyfield version?
    # matrix is likely a numpy array (3,3).
    
    # icrs_pos.position.au is (3,)
    # We use matrix multiply. 
    # Actually Skyfield matrices are usually for multiplying column vectors.
    # r_ecl = M @ r_icrs
    
    r_j2000 = icrs_pos.position.au
    v_j2000 = icrs_pos.velocity.au_per_d
    
    # Based on verify check: np.dot(matrix, p_icrs) gives correct Ecliptic coordinates.
    # So matrix is ICRS -> Frame.
    
    r_vec = np.dot(matrix, r_j2000)
    v_vec = np.dot(matrix, v_j2000)
    
    # r_vec is now in Ecliptic J2000.
    
    # Determine mu
    mu = get_gm(center_name)
    if mu == 0.0:
        print(f"Warning: Gravitational parameter (GM) for center '{center_name}' is 0.0. Orbital elements might be incorrect.")
        
    return elements_from_vectors(r_vec, v_vec, mu)

def generate_ts_object(data, elements, moons_content=None):
    """
    Generates the TS object string.
    """
    indent = "    "
    s = "  {\n"
    s += f'{indent}id: "{data["id"]}",\n'
    s += f'{indent}name: "{data["name"]}",\n'
    s += f'{indent}type: "{data["type"]}",\n'
    s += f'{indent}color: "{data["color"]}",\n'
    if "atmosphereColor" in data:
        s += f'{indent}atmosphereColor: "{data["atmosphereColor"]}",\n'
    s += f'{indent}radius: {data["radius"]},\n'
    if "textureUrl" in data:
        s += f'{indent}textureUrl: "{data["textureUrl"]}",\n'
    if "normalMapUrl" in data:
        s += f'{indent}normalMapUrl: "{data["normalMapUrl"]}",\n'
    if "specularMapUrl" in data:
        s += f'{indent}specularMapUrl: "{data["specularMapUrl"]}",\n'
    if "displacementMapUrl" in data:
        s += f'{indent}displacementMapUrl: "{data["displacementMapUrl"]}",\n'
    if "modelUrl" in data:
        s += f'{indent}modelUrl: "{data["modelUrl"]}",\n'
    s += f'{indent}rotationPeriod: {data["rotationPeriod"]},\n'
    s += f'{indent}axialTilt: {data["axialTilt"]},\n'
    if "poleDirection" in data:
        pd = data["poleDirection"]
        s += f'{indent}poleDirection: {{ x: {pd[0]:.6f}, y: {pd[1]:.6f}, z: {pd[2]:.6f} }},\n'
    if "rotationOffset" in data:
        s += f'{indent}rotationOffset: {data["rotationOffset"]},\n'
    if "ringMapUrl" in data:
        s += f'{indent}ringMapUrl: "{data["ringMapUrl"]}",\n'
        s += f'{indent}ringInnerRadius: {data["ringInnerRadius"]},\n'
        s += f'{indent}ringOuterRadius: {data["ringOuterRadius"]},\n'
    s += f'{indent}description: "{data["description"]}",\n'
    s += f'{indent}period: {elements["period"]:.6f},\n'
    s += f'{indent}mass: {get_gm(data["id"]):.16f},\n'
    s += f'{indent}elements: {{\n'
    s += f'{indent}  semiMajorAxis: {elements["semiMajorAxis"]:.10f},\n'
    s += f'{indent}  eccentricity: {elements["eccentricity"]:.6f},\n'
    s += f'{indent}  inclination: {elements["inclination"]:.4f},\n'
    s += f'{indent}  ascendingNode: {elements["ascendingNode"]:.4f},\n'
    s += f'{indent}  perihelion: {elements["perihelion"]:.4f},\n'
    s += f'{indent}  meanLongitude: {elements["meanLongitude"]:.4f},\n'
    s += f'{indent}}},\n'
    
    if moons_content:
        s += f'{indent}moons: [\n'
        for m in moons_content:
            s += m
        s += f'{indent}]\n'
        
    s += "  },\n"
    return s

def main():
    print("Loading kernels...")
    
    # Load primary planet kernel
    if not Path(BSP_PLANETS).exists():
        print(f"Error: {BSP_PLANETS} not found. Please download it or run the setup script.")
        return

    kernels = []
    try:
        eph = load(BSP_PLANETS)
        print(f"Loaded {BSP_PLANETS}")
        kernels.append(eph)
        
        try:
            print(f"Loading {BSP_JUPITER} (downloading if missing)...")
            eph_jup = load(BSP_JUPITER)
            print(f"Jupiter Kernel Bodies: {eph_jup}")
            kernels.append(eph_jup)
        except Exception as e:
             print(f"Warning: Could not load {BSP_JUPITER}: {e}")
            
    except Exception as e:
        print(f"Failed to load kernels: {e}")
        import traceback
        traceback.print_exc()
        return

    ts = load.timescale()
    t = ts.now()
    # Or strict J2000? User said "as it is now".
    # t = ts.utc(2026, 2, 4) # Debugging equivalent to "now"
    
    print(f"Exporting Solar System for {t.utc_iso()}...")

    # Calculate GAST for Earth (Greenwich Apparent Sidereal Time)
    # This aligns the Prime Meridian correctly with the Equinox
    gast_hours = t.gast
    gast_rad = (gast_hours / 24.0) * 2 * math.pi
    VISUAL_DATA["earth"]["rotationOffset"] = gast_rad

    ts_content = f"""import {{ PlanetData }} from "./types";

// Scaling constants
export const AU_SCALE = {AU_SCALE}; // 1 AU = {AU_SCALE} 3D units
export const PLANET_SCALE = {PLANET_SCALE}; // Base visual scale for planets
export const MOON_ORBIT_SCALE = {MOON_ORBIT_SCALE}; // Visual exaggeration for moon orbits

// Simulation Epoch (Start derived from Python export time)
"""
    ts_content += f'export const SIMULATION_EPOCH = new Date("{t.utc_iso()}").getTime();\n\n'
    
    ts_content += f"""// Sun data (at origin, no orbit)
export const SUN_DATA: PlanetData = {{
  id: "sun",
  name: "Sun",
  type: "star",
  color: "#FFD700",
  radius: 109.2,
  rotationPeriod: 609.12,
  axialTilt: 7.25,
  description: "The star at the center of the Solar System. A G-type main-sequence star (G2V) containing 99.86% of the system mass.",
  period: 0,
  mass: {GM_SUN:.16f},
  elements: {{
    semiMajorAxis: 0,
    eccentricity: 0,
    inclination: 0,
    ascendingNode: 0,
    perihelion: 0,
    meanLongitude: 0,
  }},
}};

// Orbital elements computed from Skyfield for current epoch
export const PLANETS: PlanetData[] = [
"""

    for pid in PLANET_ORDER:
        p_data = VISUAL_DATA[pid].copy()
        p_data["id"] = pid
        
        # Determine center
        center = "sun"
        body_key = BODY_MAPPING.get(pid, pid)
        
        # Get Elements
        print(f"Processing {pid}...")
        elements = get_elements_for_body(kernels, body_key, center, t, pid)
        
        if not elements:
            print(f"Skipping {pid} due to error.")
            continue
        
        # Calculate Pole Vector
        pole_vec = get_pole_vector(pid, t)
        if pole_vec:
             p_data["poleDirection"] = pole_vec
             print(f"    Pole Direction ({pid}): {pole_vec}")
            
        # Process Moons
        moons_content = []
        if pid in MOON_PARENTS:
            for mid in MOON_PARENTS[pid]:
                print(f"  Processing moon {mid}...")
                m_data = VISUAL_DATA[mid].copy()
                m_data["id"] = mid
                
                # Center for moon is the planet
                # Note: 'earth barycenter' -> 'earth' for moon center?
                # Skyfield: 'moon' orbits 'earth' (not barycenter) usually inside the kernel?
                # Actually de440s has 'earth' relative to 'earth barycenter'.
                # But 'moon' is relative to 'earth barycenter' implicitly or 'earth'?
                # Usually we ask for (moon - earth).
                
                moon_center = body_key
                # Need to be careful with barycenters. 
                # Earth Barycenter = Earth + Moon.
                # Center for Moon orbit should be Earth (399), not Barycenter (3).
                # But de440s usually has 3 (Earth Barycenter), and 399 (Earth), 301 (Moon).
                # If we select "earth barycenter" as planet, and orbit moon around it...
                # The UI treats the planet as the center. 
                # So we should calculate moon elements relative to the PLANET body (399), not Barycenter.
                # Also we should probably export the PLANET (399) elements relative to Sun (or Sun Barycenter).
                # But likely the difference for Earth vs Earth Barycenter relative to Sun is small but distinct.
                # VISUAL_DATA["earth"] calls it "Earth".
                # Let's try to use "earth" (399) if available for the moon's center.
                
                if pid == "earth":
                    # For Earth Planet Orbit: Use Barycenter (3) relative to Sun? Or Earth (399)?
                    # Standard is Barycenter orbits Sun.
                    # Moon orbits Earth (399).
                    moon_center = "399" # Earth
                elif pid == "jupiter":
                    # Galilean moons orbit Jupiter (599).
                    moon_center = "599" # Jupiter
                
                # Check if these specific centers exist in kernel
                # 'earth' (399) might be present if de440s has it.
                # de440s usually has 399.
                
                # Special handling for ISS (not in ephemeris)
                if mid == 'iss':
                    m_elements = get_iss_elements(t, ts)
                    moons_content.append(generate_ts_object(m_data, m_elements, None))
                else:
                    m_elements = get_elements_for_body(kernels, BODY_MAPPING.get(mid, mid), moon_center, t, mid)
                    if m_elements:
                        # Special logic for Moon rotation alignment (tidal locking)
                        if mid == 'moon':
                             ml_deg = m_elements['meanLongitude']
                             m_data['rotationOffset'] = math.radians(ml_deg) + math.pi

                        moons_content.append(generate_ts_object(m_data, m_elements, None))
                    else:
                        print(f"Skipping moon {mid}")

        ts_content += generate_ts_object(p_data, elements, moons_content)

    ts_content += "];\n"
    
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        f.write(ts_content)
    
    print("Done!")

if __name__ == "__main__":
    main()
