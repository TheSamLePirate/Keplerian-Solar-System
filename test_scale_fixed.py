import math

base_au = 149.6
moon_radius = 0.273
moon_semi = 0.0026201713
sun_radius = 10.0
sun_semi = 1.0

# D_M = R_P + (R_M / R_S) * (D_S - R_P)
R_P = 1.0
D_S = sun_semi * base_au
targetD_M = R_P + (moon_radius / sun_radius) * max(0, D_S - R_P)

moon_dist_from_surface = targetD_M - R_P
moon_ang = math.degrees(2 * math.atan(moon_radius / moon_dist_from_surface))

sun_dist_from_surface = D_S - R_P
sun_ang = math.degrees(2 * math.atan(sun_radius / sun_dist_from_surface))

print(f"Target Moon dist from center: {targetD_M:.2f}")
print(f"Moon dist from surface: {moon_dist_from_surface:.2f}, Moon ang: {moon_ang:.2f} deg")
print(f"Sun dist from surface: {sun_dist_from_surface:.2f}, Sun ang: {sun_ang:.2f} deg")
print(f"Ratio (Moon/Sun): {moon_ang / sun_ang:.2f}")

base_dist = moon_semi * base_au
print(f"Base Dist: {base_dist:.4f}")
print(f"Calculated Orbit Scale: {targetD_M / base_dist:.2f}")
