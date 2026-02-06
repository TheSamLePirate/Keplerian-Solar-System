
import numpy as np
from skyfield.api import Star, load
from skyfield.data import hipparcos

def test_hipparcos():
    print("Loading Hipparcos catalog...")
    try:
        with load.open(hipparcos.URL) as f:
            df = hipparcos.load_dataframe(f)
        
        print(f"Loaded {len(df)} stars.")
        
        # Filter by magnitude (visible stars, approx < 6.5)
        bright_stars = df[df['magnitude'] <= 5.0]
        print(f"Stars visible to naked eye (mag <= 5.0): {len(bright_stars)}")
        
        # Check columns
        print("Columns:", bright_stars.columns)
        print(bright_stars.head())
        
        return True
    except Exception as e:
        print(f"Error loading Hipparcos: {e}")
        return False

if __name__ == "__main__":
    test_hipparcos()
