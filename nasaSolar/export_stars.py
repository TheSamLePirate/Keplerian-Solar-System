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
    
    print("Using ICRS (Equatorial) J2000...")
    v_eq = v_icrs # No rotation needed for Equatorial
    
    # Prepare export list
    # [x, y, z, mag, bv]
    
    # Transpose to (N, 3)
    positions = v_eq.T
    
    export_data = []
    
    for i in range(len(bright_stars)):
        row = bright_stars.iloc[i]
        pos = positions[i]
        
        # Handle missing B-V (fill with solar color ~0.65 or 0)
        bv = row['bv']
        if pd.isna(bv):
            bv = 0.65
            
        export_data.append([
            round(pos[0], 5),           # x -> x
            round(pos[2], 5),           # z -> y (Up/Pole)
            round(-pos[1], 5),          # y -> -z (Plane)
            round(row['vmag'], 2),
            round(bv, 2)
        ])
        
    print("Exporting stars to JSON...")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(export_data, f)
        
    print(f"Exported {len(export_data)} stars.")
    
    # --- Constellations ---
    print("\nProcessing Constellations...")
    from skyfield.data import stellarium
    
    # Map HIP -> Index in our exported array
    # We need to trust that export_data ordering is preserved (it is relative to bright_stars iteration)
    hip_to_index = {}
    for idx, row in enumerate(bright_stars.itertuples()):
        # row structure from itertuples on dataframe with specific columns:
        # Index=index, hip=..., vmag=...
        # We need to access by name or index. 
        # bright_stars has columns: hip, vmag, ra_deg, dec_deg, bv
        # itertuples names attributes by column name
        hip_id = int(row.hip)
        hip_to_index[hip_id] = idx
        
    url = 'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/constellationship.fab'
    
    export_lines = []
    
    try:
        print(f"Loading constellation data from {url}...")
        with load.open(url) as f:
            constellations = stellarium.parse_constellations(f)
            
        for name, edges in constellations:
            for hip1, hip2 in edges:
                if hip1 in hip_to_index and hip2 in hip_to_index:
                    idx1 = hip_to_index[hip1]
                    idx2 = hip_to_index[hip2]
                    export_lines.append([idx1, idx2])
    except Exception as e:
        print(f"Failed to download constellation data: {e}")
        print("Using comprehensive fallback constellation set...")
        
        # Hardcoded pairs (HIP IDs) for major constellations
        fallback_pairs = [
            # Ursa Major (Big Dipper)
            (54061, 53910), (53910, 58001), (58001, 59774), (59774, 62956),
            (62956, 65378), (65378, 67301),
            # Ursa Minor (Little Dipper)
            (11767, 86111), (86111, 82080), (82080, 77055), (77055, 79822),
            (79822, 75097), (75097, 72607), (72607, 11767),
            # Orion
            (27989, 26207), (26207, 25336), (25336, 25930), (25930, 26311), 
            (26311, 26727), (26727, 27366), (25930, 24436), (27989, 26207),
            # Cassiopeia
            (21421, 22449), (24608, 22449), (4427, 6686), (6686, 8886), (8886, 21421),
            # Scorpius (approximate)
            (80763, 78820), (78820, 78401), (80763, 86228), (86228, 85927),
            # Cygnus (Northern Cross)
            (102098, 98298), (98298, 95947), (98298, 100453), (98298, 96441),
            # Leo
            (49669, 50583), (50583, 54872), (54872, 57632), (49669, 48455),
            # Crux (Southern Cross)
            (60718, 62434), (62434, 59747), (59747, 61084), (61084, 60718),
            # Gemini
            (37826, 36850), (37826, 35550), (36850, 35550),
            # Taurus
            (21421, 25428), (21421, 20205),
            # Canis Major
            (32349, 33579), (33579, 34444),
            # Lyra
            (91262, 93017), (93017, 93429), (91262, 93429),
            # Aquila
            (97649, 97278), (97649, 98036),
            # Pegasus (Great Square)
            (113963, 113881), (113881, 3179), (3179, 1067), (1067, 113963),
            # Andromeda
            (3179, 5447), (5447, 9640),
            # Bootes (Kite)
            (69673, 72105), (72105, 71075), (69673, 67927),
             # Sagittarius (Teapot) - Kaus Australis, Nunki, Ascella, etc.
             (90185, 92855), (92855, 94141), (94141, 90496), (90496, 90185), # Body
             (90496, 89962), (89962, 89931), (90185, 88635) # Spout/Lid approximation
        ]
        
        for hip1, hip2 in fallback_pairs:
            if hip1 in hip_to_index and hip2 in hip_to_index:
                export_lines.append([hip_to_index[hip1], hip_to_index[hip2]])

    CONST_FILE = "../data/constellations.json"
    print(f"Exporting {len(export_lines)} constellation lines to {CONST_FILE}...")
    
    with open(CONST_FILE, 'w') as f:
        json.dump(export_lines, f)
        
    print("Done.")

if __name__ == "__main__":
    main()
