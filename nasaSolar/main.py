#!/usr/bin/env python3
import argparse
import json
import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict

from skyfield.api import load

AU_KM = 149_597_870.7
G_REAL = 6.67430e-11  # m^3 kg^-1 s^-2

@dataclass(frozen=True)
class BodySpec:
    name: str
    key: str            # Skyfield key
    mass_kg: float
    mean_radius_km: float
    color: str
    orbit_period: str
    is_star: bool = False
    
    # Analytic orbit support
    parent: Optional[str] = None  # Name of parent body (must exist in SPECS before this)
    # Simple Keplerian params: a (km), e (eccentricity), i (deg), omega (deg), M0 (deg at epoch) - simplified
    # We will assume coplanar for simplicity or just 2D projection
    kepler_params: Optional[Dict[str, float]] = field(default=None)

SPECS = [
    BodySpec("Soleil",  "sun",     1.9885e30,   695_700.0, "#FFFF00", "Not orbiting", True),
    BodySpec("Mercure", "mercury", 3.3011e23,     2_439.7, "#A9A9A9", "87.969 jours"),
    BodySpec("Vénus",   "venus",   4.8675e24,     6_051.8, "#F5DEB3", "224.701 jours"),
    BodySpec("Terre", "earth barycenter", 5.97237e24, 6371.0, "#1E90FF", "365.256 jours"),
    BodySpec(
        "Lune",
        "moon",
        7.342e22,
        1737.4,
        "#CCCCCC",
        "27.3 jours",
        is_star=False
    ),
    BodySpec("Mars", "mars barycenter", 6.4171e23, 3389.5, "#FF4500", "686.980 jours"),
    BodySpec("Jupiter", "jupiter barycenter", 1.8982e27, 69911.0, "#D2691E", "11.862 ans"),
    BodySpec(
        "Io",
        "artificial_io",
        8.9319e22,
        1821.6,
        "#FFFF00",
        "1.769 jours",
        is_star=False,
        parent="Jupiter",
        kepler_params={"a": 421700.0, "e": 0.0041, "phase": 0.0}
    ),
    BodySpec(
        "Europa",
        "artificial_europa",
        4.7998e22,
        1560.8,
        "#F5F5DC",
        "3.551 jours",
        is_star=False,
        parent="Jupiter",
        kepler_params={"a": 671034.0, "e": 0.0094, "phase": 90.0}
    ),
    BodySpec(
        "Ganymede",
        "artificial_ganymede",
        1.4819e23,
        2634.1,
        "#4B0082",
        "7.154 jours",
        is_star=False,
        parent="Jupiter",
        kepler_params={"a": 1070412.0, "e": 0.0011, "phase": 180.0}
    ),
    BodySpec(
        "Callisto",
        "artificial_callisto",
        1.0759e23,
        2410.3,
        "#696969",
        "16.689 jours",
        is_star=False,
        parent="Jupiter",
        kepler_params={"a": 1882709.0, "e": 0.0074, "phase": 270.0}
    ),
    BodySpec("Saturne", "saturn barycenter", 5.6834e26, 58232.0, "#F4A460", "29.457 ans"),
    BodySpec("Uranus",  "uranus barycenter",  8.6810e25,    25_362.0, "#AFEEEE", "84.016 ans"),
    BodySpec("Neptune", "neptune barycenter", 1.02413e26,   24_622.0, "#4169E1", "164.79 ans"),
    BodySpec("Pluton",  "pluto barycenter",   1.3090e22,     1_188.3, "#DEB887", "247.94 ans"),
]

def iso_to_dt(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def km_to_sim_units(km: float, sim_units_per_au: float) -> float:
    return (km / AU_KM) * sim_units_per_au

def kms_to_sim_units_per_sim_sec(kms: float, sim_units_per_au: float, t_unit_s: float) -> float:
    # 1 real sec -> t_unit_s sim sec ??? 
    # NO: T_unit means "1 Simulation Second represents T_unit Real Seconds".
    # Velocity in Sim Units per Sim Second (V_sim)
    # V_real (m/s) = dx_real / dt_real
    # V_sim = dx_sim / dt_sim
    #       = (dx_real / L_unit) / (dt_real / T_unit)
    #       = (dx_real / dt_real) * (T_unit / L_unit)
    #       = V_real * (T_unit / L_unit)
    
    # Check: V_real = 30 km/s = 30000 m/s
    # L_unit = 1000000 m (if small scale)
    # T_unit = 1000 s
    # V_sim = 30000 * 1000 / 1000000 = 30 units/sim_sec.
    
    # In argument, we have kms (km/s).
    # scale factor = T_unit_s / (AU_km / sim_units_per_au) ???
    # Let's derive simpler:
    # AU_per_sec = kms / AU_KM
    # SimUnits_per_RealSec = AU_per_sec * sim_units_per_au
    # SimUnits_per_SimSec = SimUnits_per_RealSec * t_unit_s
    # (Since 1 sim sec = t_unit_s real seconds, we travel t_unit_s times further in 1 sim sec)
    
    au_per_real_sec = kms / AU_KM
    sim_per_real_sec = au_per_real_sec * sim_units_per_au
    return sim_per_real_sec * t_unit_s

def solve_kepler_orbit(params, central_mass_kg, t_unit_s, sim_units_per_au):
    """
    Returns (pos_km, vel_kms) list of 3 floats each.
    """
    a_km = params["a"]
    phase_deg = params.get("phase", 0.0)
    
    # Convert phase to radians
    theta = math.radians(phase_deg)
    
    a_m = a_km * 1000.0
    
    # Orbital speed for circular orbit: v = sqrt(GM / r) in m/s
    v_m_s = math.sqrt((G_REAL * central_mass_kg) / a_m)
    
    # Position (x, y, z) in km
    x_km = a_km * math.cos(theta)
    y_km = a_km * math.sin(theta)
    z_km = 0.0
    
    # Velocity vector perpendicular to position
    vx_kms = - (v_m_s / 1000.0) * math.sin(theta)
    vy_kms = (v_m_s / 1000.0) * math.cos(theta)
    vz_kms = 0.0
    
    return [x_km, y_km, z_km], [vx_kms, vy_kms, vz_kms]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epoch", default="2026-01-10T00:00:00Z", help="ISO datetime")
    ap.add_argument("--bsp", default="de440s.bsp", help="JPL ephemeris")
    ap.add_argument("--out", default="solar_system.json", help="Output path")
    
    # Physics & Scaling Args
    ap.add_argument("--simUnitsPerAU", type=float, default=100000.0, help="Pixels/Units per AU (Distance Scale)")
    ap.add_argument("--G", type=float, default=0.5, help="Simulation Gravity Constant")
    ap.add_argument("--targetSunMass", type=float, default=None, help="If set, auto-calculates time scale to simulate this mass")
    ap.add_argument("--targetSunRadius", type=float, default=None, help="If set, auto-calculates sun radius")
    
    # Original args (some used for config/visuals)
    ap.add_argument("--timeStep", type=float, default=0.008, help="physicsConfig.timeStep (rendering step)")
    ap.add_argument("--collisions", action="store_true", help="Enable collisions")
    ap.add_argument("--minRadius", type=float, default=3.0, help="Min rendered radius")
    ap.add_argument("--sunRadius", type=float, default=45.0, help="Visual Sun Radius")
    ap.add_argument("--cameraScale", type=float, default=0.00025, help="Camera Zoom")
    
    args = ap.parse_args()

    epoch_dt = iso_to_dt(args.epoch)
    timestamp_ms = int(epoch_dt.timestamp() * 1000)

    # --- SCALING LOGIC ---
    
    # L_unit: Meters per simulation distance unit
    L_unit_m = (AU_KM * 1000.0) / args.simUnitsPerAU
    
    # M_unit and T_unit calculation
    if args.targetSunMass is not None:
        # User wants Sun to be exactly 'targetSunMass' in simulation units
        sun_real_kg = 1.9885e30
        M_unit_kg = sun_real_kg / args.targetSunMass
        
        # Derive Time Scale (T_unit_s) to satisfy G_sim
        # G_sim = G_real * (M_unit * T_unit^2 / L_unit^3)
        # T_unit^2 = (G_sim * L_unit^3) / (G_real * M_unit)
        
        term = (args.G * (L_unit_m ** 3)) / (G_REAL * M_unit_kg)
        T_unit_s = math.sqrt(term)
    else:
        # Default behavior: Assume T_unit = 1.0 real second (Real-Time Physics)
        T_unit_s = 1.0
        # Determine M_unit required to make G_sim correct for this timescales
        # M_unit = (G_sim * L_unit^3) / (G_real * T_unit^2)
        M_unit_kg = (args.G * (L_unit_m ** 3)) / (G_REAL * (T_unit_s ** 2))

    # --- VISUALS ---
    visual_sun_radius = args.sunRadius
    if args.targetSunRadius is not None:
        visual_sun_radius = args.targetSunRadius
        
    # --- REPORTING ---
    print(f"\n--- SCALING REPORT ---")
    print(f"Goal: Sim 1AU = {args.simUnitsPerAU} units, G = {args.G}")
    if args.targetSunMass:
         print(f"Goal: Sun Mass = {args.targetSunMass} units")
    
    print(f"\nDerived Scales:")
    print(f"  [Distance] 1 Unit    = {L_unit_m:.4e} meters")
    print(f"  [Mass]     1 Unit    = {M_unit_kg:.4e} kg")
    print(f"  [Time]     1 Sim Sec = {T_unit_s:.4f} real seconds")
    
    human_time = T_unit_s
    time_unit_str = "seconds"
    if human_time > 86400:
        human_time /= 86400; time_unit_str = "days"
    elif human_time > 3600:
        human_time /= 3600; time_unit_str = "hours"
    elif human_time > 60:
        human_time /= 60; time_unit_str = "minutes"
        
    print(f"             (1 Sim Sec = ~{human_time:.2f} real {time_unit_str})")
    
    earth_vel_real_kms = 29.78
    earth_vel_sim = kms_to_sim_units_per_sim_sec(earth_vel_real_kms, args.simUnitsPerAU, T_unit_s)
    print(f"\nExpected Values sim-space:")
    print(f"  Earth Velocity ~ {earth_vel_sim:.4f} units/sim-sec")
    
    # --- ROCKET SCALING (Reference: Falcon 9) ---
    # Mass: ~549,000 kg
    # Height: 70 m
    # Thrust: ~7,600,000 N
    
    ref_mass_kg = 549000.0
    ref_height_m = 70.0
    ref_thrust_N = 7600000.0
    
    # Mass Sim
    ref_mass_sim = ref_mass_kg / M_unit_kg
    
    # Length Sim (Height)
    ref_height_sim = ref_height_m / L_unit_m
    
    # Force (Thrust) Sim
    # F_sim = F_real * (T_unit^2 / (M_unit * L_unit))
    thrust_factor = (T_unit_s ** 2) / (M_unit_kg * L_unit_m)
    ref_thrust_sim = ref_thrust_N * thrust_factor
    
    print(f"\nREFERENCE ROCKET (e.g. Falcon 9) SCALED:")
    print(f"  Real Mass: {ref_mass_kg:.2e} kg -> Sim Mass: {ref_mass_sim:.4e} units")
    print(f"  Real Height: {ref_height_m} m -> Sim Height: {ref_height_sim:.4e} units")
    print(f"  Real Thrust: {ref_thrust_N:.2e} N -> Sim Thrust: {ref_thrust_sim:.4e} force-units")
    
    if ref_mass_sim < 1e-15:
        print("  [!] Warning: Mass is extremely small. Floating point precision issues likely.")
    if ref_thrust_sim < 1e-15:
         print("  [!] Warning: Thrust is extremely small.")
         
    print(f"----------------------\n")


    # --- EXECUTION ---

    ts = load.timescale()
    t = ts.from_datetime(epoch_dt)
    eph = load(args.bsp)
    sun = eph["sun"]

    positions = {}
    velocities = {}
    mass_map = {}

    for spec in SPECS:
        mass_map[spec.name] = spec.mass_kg

        if spec.parent and spec.kepler_params:
            parent_pos = positions.get(spec.parent, [0.0, 0.0, 0.0])
            parent_vel = velocities.get(spec.parent, [0.0, 0.0, 0.0])
            parent_mass = mass_map.get(spec.parent, 1.989e30)
            
            # Analytic solver needs T_unit now? No, solve_kepler returns pure km and km/s.
            # Convert to sim units outside.
            rel_pos_km, rel_vel_kms = solve_kepler_orbit(spec.kepler_params, parent_mass, T_unit_s, args.simUnitsPerAU)
            
            # We store km and km/s here, convert later
            abs_pos = [parent_pos[i] + rel_pos_km[i] for i in range(3)]
            abs_vel = [parent_vel[i] + rel_vel_kms[i] for i in range(3)]
            
            positions[spec.name] = abs_pos
            velocities[spec.name] = abs_vel
            continue

        if spec.key == "sun":
            pos_km = [0.0, 0.0, 0.0]
            vel_kms = [0.0, 0.0, 0.0]
        else:
            try:
                obj = eph[spec.key]
                v = (obj - sun).at(t)
                pos_km = v.position.km
                vel_kms = v.velocity.km_per_s
            except KeyError:
                 print(f"Warning: Key {spec.key} missing.")
                 pos_km = [0.0, 0.0, 0.0]
                 vel_kms = [0.0, 0.0, 0.0]

        positions[spec.name] = pos_km
        velocities[spec.name] = vel_kms

    bodies = []
    total_mass_sim = 0.0
    com_x = 0.0
    com_y = 0.0

    # 1st pass
    for spec in SPECS:
        m_sim = spec.mass_kg / M_unit_kg
        if spec.is_star:
            x, y, vx, vy = 0.0, 0.0, 0.0, 0.0
        else:
            pk = positions[spec.name]
            vk = velocities[spec.name]
            x = km_to_sim_units(pk[0], args.simUnitsPerAU)
            y = km_to_sim_units(pk[1], args.simUnitsPerAU)
            vx = kms_to_sim_units_per_sim_sec(vk[0], args.simUnitsPerAU, T_unit_s)
            vy = kms_to_sim_units_per_sim_sec(vk[1], args.simUnitsPerAU, T_unit_s)

        total_mass_sim += m_sim
        com_x += m_sim * x
        com_y += m_sim * y

    com_x /= total_mass_sim
    com_y /= total_mass_sim

    sun_spec = next(s for s in SPECS if s.is_star)
    sun_x = -com_x
    sun_y = -com_y
    sun_vx = 0.0
    sun_vy = 0.0
    
    def rendered_radius(spec: BodySpec) -> float:
        if spec.is_star:
            return float(visual_sun_radius)
        r_sim = (spec.mean_radius_km * 1000.0) / L_unit_m
        return float(max(args.minRadius, min(r_sim, 18.0))) # clamp max

    for i, spec in enumerate(SPECS):
        m_sim = spec.mass_kg / M_unit_kg

        if spec.is_star:
            x, y, vx, vy = sun_x, sun_y, sun_vx, sun_vy
        else:
            pk = positions[spec.name]
            vk = velocities[spec.name]
            x = km_to_sim_units(pk[0], args.simUnitsPerAU) - com_x
            y = km_to_sim_units(pk[1], args.simUnitsPerAU) - com_y
            vx = kms_to_sim_units_per_sim_sec(vk[0], args.simUnitsPerAU, T_unit_s)
            vy = kms_to_sim_units_per_sim_sec(vk[1], args.simUnitsPerAU, T_unit_s)

        body = {
            "id": f"nasa_{timestamp_ms}_{i:02d}",
            "name": spec.name,
            "mass": float(m_sim),
            "radius": rendered_radius(spec),
            "color": spec.color,
            "position": {"x": float(x), "y": float(y)},
            "velocity": {"x": float(vx), "y": float(vy)},
            "trail": [],
            "description": "Scaled Solar System",
            "realMass": f"{spec.mass_kg:.2e} kg",
            "realDiameter": f"{(2.0*spec.mean_radius_km):.0f} km",
            "orbitPeriod": spec.orbit_period,
            "isStar": bool(spec.is_star),
        }
        bodies.append(body)

    payload = {
        "version": 1,
        "timestamp": timestamp_ms,
        "bodies": bodies,
        "visualConfig": {
            "showGrid": False,
            "gridSpacing": 100,
            "gridOpacity": 0.25,
            "showWaves": True,
            "waveSpeedMultiplier": 0.1,
            "showGlow": True,
            "glowIntensity": 1,
            "showTrails": True,
            "trailLength": 12000,
            "centerOfMassThreshold": 2000,
            "showStars": True,
            "showNebula": True,
            "starDensity": 800,
            "starTwinkleSpeed": 2,
            "nebulaCloudCount": 40,
            "nebulaOpacity": 0.9,
            "showCenterOfMass": False,
            "showEclipses": False
        },
        "physicsConfig": {
            "gravitationalConstant": float(args.G),
            "collisions": bool(args.collisions),
            "timeStep": float(args.timeStep)
        },
        "camera": {
            "scale": float(args.cameraScale),
            "offset": {"x": 0, "y": 0}
        },
        "followBodyId": None,
        "followCenterOfMass": True,
        "speed": 1.0
    }
    
    json_path = Path(args.out)
    json_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"Generated {json_path}")

if __name__ == "__main__":
    main()