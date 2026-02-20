import math

base_au = 149.6
moon_orbit_scale = 59.33
moon_radius = 0.273
moon_semi = 0.0026201713

sun_radius = 10.0
sun_semi = 1.0

moon_dist = moon_semi * base_au * moon_orbit_scale
moon_ang = math.degrees(2 * math.atan(moon_radius / moon_dist))

sun_dist = sun_semi * base_au
sun_ang = math.degrees(2 * math.atan(sun_radius / sun_dist))

print(f"Moon dist: {moon_dist:.2f}, Moon ang: {moon_ang:.2f} deg")
print(f"Sun dist: {sun_dist:.2f}, Sun ang: {sun_ang:.2f} deg")
print(f"Ratio (Moon/Sun): {moon_ang / sun_ang:.2f}")

