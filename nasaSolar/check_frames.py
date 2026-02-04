from skyfield.api import load
from skyfield.framelib import ecliptic_frame
import numpy as np

eph = load('de440s.bsp')
ts = load.timescale()
t = ts.now()
earth = eph['earth']
sun = eph['sun']

pos = (earth - sun).at(t)
p_icrs = pos.position.au

# Check standard frame_xyz method
p_ecl_method = pos.frame_xyz(ecliptic_frame).au
print(f"Earth Z (method): {p_ecl_method[2]}")

# Check Matrix T
matrix = ecliptic_frame.rotation_at(t)
p_ecl_T = np.dot(matrix.T, p_icrs)
print(f"Earth Z (matrix.T): {p_ecl_T[2]}")

# Check Matrix Normal
p_ecl_N = np.dot(matrix, p_icrs)
print(f"Earth Z (matrix): {p_ecl_N[2]}")
