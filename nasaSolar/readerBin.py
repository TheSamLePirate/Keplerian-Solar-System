import struct
import sys
import spiceypy as sp

RECORD_SIZE = 8 * 8  # 8 float64

# leap second kernel needed for ET→UTC conversion
sp.furnsh("naif0012.tls")

def read_bin(path):
    with open(path, "rb") as f:
        while True:
            buf = f.read(RECORD_SIZE)
            if not buf:
                break

            et, x, y, z, qw, qx, qy, qz = struct.unpack("8d", buf)
            utc = sp.et2utc(et, "ISOC", 6)

            print(
                f"UTC={utc} | ET={et:.15f} | "
                f"POS=({x:.6f}, {y:.6f}, {z:.6f}) | "
                f"QUAT=({qw:.6f}, {qx:.6f}, {qy:.6f}, {qz:.6f})"
            )

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python view_bin.py sun.bin")
        sys.exit(1)

    read_bin(sys.argv[1])
    sp.kclear()