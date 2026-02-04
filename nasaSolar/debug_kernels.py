from skyfield.api import load

def main():
    print("Loading kernels...")
    # Load bsp (de440s) and jup344
    k1 = load('de440s.bsp')
    k2 = load('jup344.bsp')
    
    print("\n--- de440s.bsp ---")
    print(k1)
    
    print("\n--- jup344.bsp ---")
    print(k2)
    
    # Try looking up 501
    print("\nLookup tests:")
    try:
        print("k2[501]:", k2[501])
    except Exception as e:
        print("k2[501] failed:", e)
        
    try:
        print("k2['501']:", k2['501'])
    except Exception as e:
        print("k2['501'] failed:", e)

    # Combined
    print("\nCombined:")
    planets = k1 + k2
    try:
        print("planets[501]:", planets[501])
    except Exception as e:
        print("planets[501] failed:", e)

if __name__ == "__main__":
    main()
