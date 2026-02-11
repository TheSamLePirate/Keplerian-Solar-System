import React, { useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LensflareProps {
    opacity?: number;
    color?: string; // Hex color for the main flare
}

export const LensflareEffect: React.FC<LensflareProps> = ({ opacity = 1.0, color = "#ffeeaa" }) => {
    const { camera, scene } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    // Texture Generation
    const [texGlow, texStreak, texRing, texHex, texDisc] = useMemo(() => {
        const createTexture = (drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext("2d", { alpha: true });
            if (context) {
                context.clearRect(0, 0, 512, 512);
                drawFn(context, 512, 512);
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace; // Optional: Try SRGB for punchy colors
            return tex;
        };

        // 1. Soft Glow (Main Sun)
        const tGlow = createTexture((ctx, w, h) => {
            const cx = w / 2, cy = h / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
            g.addColorStop(0, "rgba(255, 255, 255, 1)");
            g.addColorStop(0.1, "rgba(255, 255, 240, 0.8)");
            g.addColorStop(0.5, "rgba(255, 200, 100, 0.2)");
            g.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        // 2. Anamorphic Streak (Sci-Fi look)
        const tStreak = createTexture((ctx, w, h) => {
            const cx = w / 2, cy = h / 2;
            const g = ctx.createLinearGradient(0, cy, w, cy);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(0.2, "rgba(100, 150, 255, 0.1)"); // Blue tint
            g.addColorStop(0.5, "rgba(255, 255, 255, 0.8)"); // Center white
            g.addColorStop(0.8, "rgba(100, 150, 255, 0.1)");
            g.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = g;
            // Draw a thin horizontal bar, faded vertically
            const gV = ctx.createLinearGradient(cx, 0, cx, h);
            gV.addColorStop(0, "rgba(255,255,255,0)");
            gV.addColorStop(0.45, "rgba(255,255,255,0)");
            gV.addColorStop(0.5, "rgba(255,255,255,1)");
            gV.addColorStop(0.55, "rgba(255,255,255,0)");
            gV.addColorStop(1, "rgba(255,255,255,0)");

            // Composite
            ctx.fillStyle = g;
            ctx.globalCompositeOperation = "source-over";
            ctx.fillRect(0, cy - 20, w, 40); // Base streak

            // Apply vertical fade
            ctx.globalCompositeOperation = "destination-in";
            ctx.fillStyle = gV;
            ctx.fillRect(0, 0, w, h);
        });

        // 3. Ring (Camera internal reflection)
        const tRing = createTexture((ctx, w, h) => {
            const cx = w / 2, cy = h / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, w * 0.4, 0, 2 * Math.PI);
            ctx.lineWidth = w * 0.05;
            ctx.strokeStyle = "rgba(100, 150, 255, 0.5)"; // Blueish ring
            ctx.stroke();

            // Fade edges
            const g = ctx.createRadialGradient(cx, cy, w * 0.3, cx, cy, w * 0.5);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(0.2, "rgba(255,255,255,0.2)");
            g.addColorStop(0.5, "rgba(255,255,255,1)");
            g.addColorStop(0.8, "rgba(255,255,255,0.2)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalCompositeOperation = "destination-in";
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        // 4. Hexagon (Aperture shape)
        const tHex = createTexture((ctx, w, h) => {
            const cx = w / 2, cy = h / 2;
            const r = w * 0.4;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 255, 255, 1)";
            ctx.fill();

            // Soften edges
            const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalCompositeOperation = "destination-in";
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        // 5. Hard Disc
        const tDisc = createTexture((ctx, w, h) => {
            const cx = w / 2, cy = h / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
            g.addColorStop(0, "rgba(255, 255, 255, 1)");
            g.addColorStop(0.8, "rgba(255, 240, 200, 0.5)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        return [tGlow, tStreak, tRing, tHex, tDisc];
    }, []);

    // Element Configuration
    // Offset: 0 = at Sun, 1 = Center, 2 = Opposite side
    // Actually: 0 = Sun, > 1 = Past center away from sun.
    // Screen coords: Sun=(x,y), Center=(0,0). Ghost = Sun + (Center-Sun) * scalar?
    // Let's use scalar where 0 = Sun, 1 = Center 
    // Actually typical formula: pos = sunPos + (center - sunPos) * dist
    // where dist is a multiplier.
    // dist=0 -> Sun
    // dist=1 -> Center
    // dist=2 -> Opposite
    const elements = useMemo(() => [
        { id: 'streak', tex: texStreak, scale: 5.0, opacity: 0.6, color: '#aaaaff', dist: 0.0, blend: THREE.AdditiveBlending },
        { id: 'glow', tex: texGlow, scale: 3.0, opacity: 1.0, color: color, dist: 0.0, blend: THREE.AdditiveBlending },
        { id: 'ring', tex: texRing, scale: 1.5, opacity: 0.3, color: '#88ccff', dist: 0.6, blend: THREE.AdditiveBlending }, // Near center
        { id: 'ghost1', tex: texHex, scale: 0.4, opacity: 0.4, color: '#ffaa88', dist: 1.2, blend: THREE.AdditiveBlending },
        { id: 'ghost2', tex: texDisc, scale: 0.2, opacity: 0.6, color: '#ccffcc', dist: 1.5, blend: THREE.AdditiveBlending },
        { id: 'ghost3', tex: texHex, scale: 0.6, opacity: 0.3, color: '#aabbff', dist: 2.2, blend: THREE.AdditiveBlending },
        { id: 'ghost4', tex: texDisc, scale: 0.3, opacity: 0.5, color: '#ffaaaa', dist: 0.4, blend: THREE.AdditiveBlending },
        { id: 'ghost5', tex: texHex, scale: 0.1, opacity: 0.8, color: '#ffffff', dist: 2.8, blend: THREE.AdditiveBlending },
    ], [color, texStreak, texGlow, texRing, texHex, texDisc]);

    const spritesRef = useRef<(THREE.Sprite | null)[]>([]);
    const raycaster = useMemo(() => {
        const rc = new THREE.Raycaster();
        rc.layers.enableAll(); // Check collision with all layers (focused objects are Layer 1)
        return rc;
    }, []);
    const sunWorldPos = new THREE.Vector3(0, 0, 0); // Sun is always at 0,0,0

    // Helper vectors (avoid GC)
    const _sunScreenPos = new THREE.Vector3();
    const _center = new THREE.Vector2(0, 0); // NDC center
    const _dir = new THREE.Vector3();
    const _camDir = new THREE.Vector3();

    const visibilityRef = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // 1. Raycast Occlusion
        // Direction from camera to sun
        const distToSun = camera.position.distanceTo(sunWorldPos);
        _dir.copy(sunWorldPos).sub(camera.position).normalize();

        raycaster.set(camera.position, _dir);
        (raycaster as any).camera = camera; // Crucial fix for Sprite checking
        raycaster.far = distToSun - 5; // Stop before hitting the sun itself

        const intersects = raycaster.intersectObjects(scene.children, true);
        const occluded = intersects.some(hit => {
            return hit.object instanceof THREE.Mesh &&
                hit.object.visible &&
                (hit.object.userData as any)?.isOccluder;
        });

        const targetVis = occluded ? 0 : 1;
        visibilityRef.current = THREE.MathUtils.lerp(visibilityRef.current, targetVis, delta * 8); // Fast fade

        if (visibilityRef.current < 0.001) {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;

        // 2. Position Sprites
        // Get Sun position in Screen Space (NDC: -1 to +1)
        _sunScreenPos.copy(sunWorldPos);
        _sunScreenPos.project(camera);

        const x = _sunScreenPos.x;
        const y = _sunScreenPos.y;
        const z = _sunScreenPos.z;

        // Check if sun is behind camera
        camera.getWorldDirection(_camDir);

        // _dir is vector from Camera TO Sun
        // _camDir is vector Camera is facing
        // Dot product > 0 means sun is roughly in front (angle < 90)
        // Dot product < 0 means sun is behind
        if (_dir.dot(_camDir) < 0.2) { // Add a small threshold (approx 78 degrees) to fade out before 90
            visibilityRef.current = 0;
            groupRef.current.visible = false;
            return;
        }

        // Calculate vector from Sun to Center
        // Center is 0,0
        const vecX = -x;
        const vecY = -y;

        // Place sprites at fixed distance from camera so they stay "Screen Size"
        // Placing them at camera.near + small_offset is safer
        const placementDistance = 2.0; // Fixed distance from camera

        spritesRef.current.forEach((sprite, i) => {
            if (!sprite) return;
            const config = elements[i];

            // Formula: sunPos + vec * dist
            const posX = x + vecX * config.dist;
            const posY = y + vecY * config.dist;

            // Unproject to get world position at fixed distance
            // NDC (posX, posY, 0.5) -> World
            // We want it at specific distance from camera.
            // construct ray from camera through screen pixel (posX, posY)
            const ndc = new THREE.Vector3(posX, posY, 0.5);
            ndc.unproject(camera);
            ndc.sub(camera.position).normalize();

            // Final position
            sprite.position.copy(camera.position).add(ndc.multiplyScalar(placementDistance));

            // Scale
            // At distance 2.0, we can define scale roughly relative to screen height
            // config.scale is arbitrary. Let's tune.
            // Main glow (scale 3.0) at dist 2.0 covers a lot.
            sprite.scale.setScalar(config.scale * 0.5); // Tune multiplier

            // Streak aspect ratio correction
            if (config.id === 'streak') {
                sprite.scale.set(config.scale * 2.0, config.scale * 0.1, 1);
            }

            // Opacity: Fade out if far from center
            // Optional: Distance from center of screen
            // const dCtx = Math.sqrt(posX*posX + posY*posY);
            // const falloff = Math.max(0, 1 - dCtx * 0.5);

            // Fade master visibility + individual opacity
            let finalOpacity = visibilityRef.current * opacity * config.opacity;

            // Extra fade for ghosts when sun is far offscreen
            if (Math.abs(x) > 1.5 || Math.abs(y) > 1.5) {
                finalOpacity *= 0.0;
            } else if (Math.abs(x) > 0.8 || Math.abs(y) > 0.8) {
                finalOpacity *= (1.5 - Math.max(Math.abs(x), Math.abs(y)));
            }

            sprite.material.opacity = finalOpacity;

            // Rotation
            if (config.id !== 'streak') {
                // Rotate ghosts slightly based on position or time
                // or just zero
                sprite.material.rotation = 0;
            }
        });

    });

    return (
        <group ref={groupRef}>
            {elements.map((el, i) => (
                <sprite key={el.id} ref={ref => { spritesRef.current[i] = ref; }}>
                    <spriteMaterial
                        map={el.tex}
                        color={el.color}
                        blending={el.blend}
                        depthTest={false} // Always on top
                        depthWrite={false}
                        transparent
                    />
                </sprite>
            ))}
        </group>
    );
};
