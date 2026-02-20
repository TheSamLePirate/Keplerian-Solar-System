import React, { useEffect, useRef } from "react";
import { PlanetData } from "../types";
import { PLANETS } from "../constants";
import { calculateOrbitalPositionWithPeriod } from "../utils/physics";

interface ISSGroundTrackProps {
    planet: PlanetData;
    date: number; // Simulation time in days
    auScale: number;
}

const EARTH_ROTATION_PERIOD_DAYS = 0.99726968; // Sidereal day

const ISSGroundTrack: React.FC<ISSGroundTrackProps> = ({ planet, date, auScale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Use the passed simulation date (in days) directly
        const timeInDays = date;

        const width = canvas.width;
        const height = canvas.height;

        // Get Earth data for rotation offset
        const earth = PLANETS.find(p => p.id === 'earth');
        // Fallback to the value we tuned if not found
        const rotationOffset = earth?.rotationOffset ?? 0.8226146575870014;

        // Clear
        ctx.clearRect(0, 0, width, height);

        const getCoords = (tDays: number) => {
            const pos = calculateOrbitalPositionWithPeriod(planet.elements, tDays, planet.period, auScale);
            const x = pos[0];
            const z = pos[2];
            const y = pos[1];

            // Cartesian to Spherical
            const r = Math.sqrt(x * x + y * y + z * z);
            const lat = Math.asin(y / r); // -PI/2 to PI/2

            // Longitude (Right Ascension)
            // In Three.js Scene: X is Right, Y is Up, Z is Back (South).
            // Prograde orbit (CCW from Top) means angle X -> -Z -> -X -> Z
            // atan2(z, x) gives decreasing angle. We want increasing angle for Prograde RA.
            // So we use atan2(-z, x).
            let ra = Math.atan2(-z, x);

            // Adjust for Earth's Rotation
            const earthRotation = (2 * Math.PI * tDays) / EARTH_ROTATION_PERIOD_DAYS;

            // Longitude = RA - GST - Offset
            // We interpret RA as Longitude on Celestial Sphere.
            let lon = ra - earthRotation - rotationOffset;

            // Wrap to -PI to PI
            lon = (lon % (2 * Math.PI));
            if (lon < -Math.PI) lon += 2 * Math.PI;
            if (lon > Math.PI) lon -= 2 * Math.PI;

            // Map to X/Y
            const screenX = ((lon + Math.PI) / (2 * Math.PI)) * width;
            const screenY = ((Math.PI / 2 - lat) / Math.PI) * height;

            return { x: screenX, y: screenY };
        };

        const drawPath = (startT: number, endT: number, style: string, lineWidth: number) => {
            const steps = 100;
            ctx.strokeStyle = style;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();

            let prev: { x: number, y: number } | null = null;

            for (let i = 0; i <= steps; i++) {
                const t = startT + ((endT - startT) * i) / steps;
                const curr = getCoords(t);

                if (prev) {
                    const dist = Math.abs(curr.x - prev.x);
                    if (dist < width / 2) {
                        ctx.lineTo(curr.x, curr.y);
                    } else {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(curr.x, curr.y);
                    }
                } else {
                    ctx.moveTo(curr.x, curr.y);
                }
                prev = curr;
            }
            ctx.stroke();
        };

        const periodDays = planet.period * 365.25;

        // Draw History (Past -> Now) - Fainter
        drawPath(timeInDays - periodDays * 0.75, timeInDays, "rgba(255, 255, 255, 0.2)", 1);

        // Draw Future (Now -> Future) - Brighter
        drawPath(timeInDays, timeInDays + periodDays * 0.75, "rgba(255, 255, 255, 0.6)", 1.5);

        // Draw Current Position
        const current = getCoords(timeInDays);

        // Pulse effect based on time
        ctx.beginPath();
        const pulse = (Date.now() / 200);
        ctx.arc(current.x, current.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#00ff00";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(current.x, current.y, 8 + Math.sin(pulse) * 3, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 0, ${0.5 + Math.sin(pulse) * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

    }, [date, planet]);

    return (
        <div className="w-full relative border border-white/20 rounded overflow-hidden select-none bg-black">
            <img src="/textures/earth_daymap.jpg" alt="Earth Map" className="w-full h-auto block opacity-50" />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                width={400}
                height={200}
            />
            <div className="absolute bottom-1 left-1 text-[9px] text-white/50 font-mono">
                Ground Track (Sim)
            </div>
            {/* Legend */}
            <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-white/60"></div>
                    <span className="text-[8px] text-white/60">Future</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-white/20"></div>
                    <span className="text-[8px] text-white/40">Past</span>
                </div>
            </div>
        </div>
    );
};

export default ISSGroundTrack;
