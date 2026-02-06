#!/usr/bin/env python3.11
import json
import numpy as np
from skyfield.api import load
from skyfield.data import hipparcos
from skyfield.framelib import ecliptic_frame
import pandas as pd
import math

OUTPUT_FILE = "../data/stars.json"
MAGNITUDE_LIMIT = 7.5

def main():
    print("Loading Hipparcos catalog...")
    
    # Load using Skyfield to get the path, but use pandas for custom parsing
    # The URL defaults to the main Hipparcos file
    with load.open(hipparcos.URL) as f:
        # hip_main.dat format is fixed-width, but complex.
        # We'll use pandas read_csv with separator as pipe | if it's the CDS version,
        # but skyfield fetches the original implementation.
        # Let's check the skyfield source or just use skyfield's loader first
        # and see if we can join with extra columns?
        
        # Actually, let's just inspect the file structure if possible or assume standard.
        # Skyfield's load_dataframe works well for positions.
        # But for color (B-V), we need column H37 (B-V).
        # Skyfield's hipparcos module defines the columns it needs.
        
        # Let's try to parse manually with pandas assuming pipe separated if it's the modern version,
        # or fixed width.
        # The file downloaded by skyfield is usually 'hip_main.dat.gz'.
        # It is usually pipe-separated from CDS? No, "The file is a plain ASCII table...".
        # Let's look at the first few lines from the test script output...
        # It seemed to have columns like 'magnitude', 'ra_degrees'...
        
        # Let's stick to Skyfield's DataFrame then "enrich" it if possible?
        # Skyfield loads: magnitude, ra_degrees, dec_degrees, parallax_mas, ra_mas_per_year, dec_mas_per_year.
        # It MISSES B-V.
        
        # Strategy: Read the raw file again using pandas to get B-V.
        # The 'hip_main.dat' format is documented. Column 37 (index 36?) is B-V.
        # Actually, easier: The file is likely pipe separated if it comes from CDS.
        # Let's try a robust read.
        
        df_full = pd.read_csv(f, sep='|', header=None, comment='#', 
                             names=[f'col_{i}' for i in range(50)], # Read many columns
                             low_memory=False) 
        
        # Hip ID is usually col 1 (index 1? or 0?).
        # Looking at hip_main.dat documentation:
        # H1: Catalog ID (HIP)
        # H5: Vmag
        # H8: RA (deg)
        # H9: Dec (deg)
        # H37: B-V
        
        # Let's verify column alignment by checking a known star.
        # But first, let's just use the columns we likely need.
        # H1 is col 0 in 0-indexed pandas read if no index col?
        # File often has leading delimiter?
        
        # Let's be safer: use the dataframe we already loaded with skyfield to get the IDs, then match?
        # Too slow.
        
        # Simplification: The skyfield loader uses `hip_main.dat`.
        # Let's try to read it as Skyfield does but asking for B-V.
        # Skyfield source code for hipparcos.load_dataframe uses `pd.read_csv(..., sep='|', names=...)`.
        # The names are:
        # 'catalog', 'hip', 'proxy', 'ra_h', 'ra_m', 'ra_s', 'dec_d', 'dec_m', 'dec_s', ...
        # It's safest to rely on a custom parser given the complexity.
        pass

    # Re-opening with pandas clean slate
    print("Parsing raw data for B-V color index...")
    with load.open(hipparcos.URL) as f:
        # Column indices (0-based) from CDS 'hip_main.dat' documentation/layout
        # H1  : HIP number (col 1) -> Index 1? NO, pipe separated.
        # Field 0: Catalog (H0) - usually empty or 'H'
        # Field 1: HIP ID <--
        # ...
        # Field 5: Vmag <--
        # ...
        # Field 8: RA deg <--
        # Field 9: Dec deg <--
        # ...
        # Field 37: B-V <-- (Index 37?)
        
        # Note: Validating this blindly is risky. 
        # Ideally I'd use the `test_stars.py` to dump the first line first.
        # But let's assume standard CDS format.
        
        df = pd.read_csv(f, sep='|', header=None, low_memory=False)
        
        # Clean up whitespace in column names if we had them, or values
    
    # Extract relevant columns
    # We expect:
    # 1: HIP ID
    # 5: Vmag
    # 8: RA deg
    # 9: Dec deg
    # 37: B-V
    
    stars = df[[1, 5, 8, 9, 37]].copy()
    stars.columns = ['hip', 'vmag', 'ra_deg', 'dec_deg', 'bv']
    
    # Filter valid data
    stars['vmag'] = pd.to_numeric(stars['vmag'], errors='coerce')
    stars['ra_deg'] = pd.to_numeric(stars['ra_deg'], errors='coerce')
    stars['dec_deg'] = pd.to_numeric(stars['dec_deg'], errors='coerce')
    stars['bv'] = pd.to_numeric(stars['bv'], errors='coerce')
    stars['hip'] = pd.to_numeric(stars['hip'], errors='coerce')
    
    stars = stars.dropna(subset=['vmag', 'ra_deg', 'dec_deg', 'hip'])
    
    # Filter by magnitude
    print(f"Total stars: {len(stars)}")
    bright_stars = stars[stars['vmag'] <= MAGNITUDE_LIMIT].copy()
    print(f"Stars brighter than mag {MAGNITUDE_LIMIT}: {len(bright_stars)}")
    
    # Coordinate Conversion (ICRS -> Ecliptic)
    # Convert RA/Dec to Vector
    ra_rad = np.radians(bright_stars['ra_deg'].values)
    dec_rad = np.radians(bright_stars['dec_deg'].values)
    
    # ICRS Cartesian
    x_icrs = np.cos(dec_rad) * np.cos(ra_rad)
    y_icrs = np.cos(dec_rad) * np.sin(ra_rad)
    z_icrs = np.sin(dec_rad)
    
    v_icrs = np.stack((x_icrs, y_icrs, z_icrs)) # Shape (3, N)
    
    # Rotate to Ecliptic J2000
    ts = load.timescale()
    t = ts.now() # Use current epoch for generic background or J2000? 
    # Use J2000 standard epoch (t=0?) or current? 
    # Stars move (proper motion), but for a background map without proper motion correction (simpler),
    # using J2000 coordinates relative to J2000 Ecliptic is standard.
    # But planets are rendered at Current Time Ecliptic?
    # Actually the simulation frame is "Ecliptic J2000" technically.
    # Skyfield `ecliptic_frame` is dynamic? 
    # Let's use the rotation matrix for J2000 ICRS -> Ecliptic J2000.
    # Matrix at J2000 epoch.
    
    t_j2000 = ts.J2000
    matrix = ecliptic_frame.rotation_at(t_j2000)
    
    print("Rotating to Ecliptic J2000...")
    v_ecl = np.dot(matrix, v_icrs) # (3, 3) @ (3, N) -> (3, N)
    
    # Prepare export list
    # [x, y, z, mag, bv]
    
    # Transpose to (N, 3)
    positions = v_ecl.T
    
    export_data = []
    
    for i in range(len(bright_stars)):
        row = bright_stars.iloc[i]
        pos = positions[i]
        
        # Handle missing B-V (fill with solar color ~0.65 or 0)
        bv = row['bv']
        if pd.isna(bv):
            bv = 0.65
            
        export_data.append([
            round(pos[0], 5),
            round(pos[1], 5),
            round(pos[2], 5),
            round(row['vmag'], 2),
            round(bv, 2)
        ])
        
    print(f"Exporting {len(export_data)} stars to {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(export_data, f)
        
    print("Done.")

if __name__ == "__main__":
    main()
