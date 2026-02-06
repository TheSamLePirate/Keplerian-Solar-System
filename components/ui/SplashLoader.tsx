import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

export default function SplashLoader() {
    const { active, progress } = useProgress();
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (!active && progress === 100) {
            // Start fade out when loading finishes
            // Add a small delay for suspense effect
            const timer = setTimeout(() => {
                setFadeOut(true);
            }, 500);

            // Remove from DOM after fade animation
            const removeTimer = setTimeout(() => {
                setVisible(false);
            }, 1000); // 500ms delay + 500ms transition

            return () => {
                clearTimeout(timer);
                clearTimeout(removeTimer);
            };
        } else {
            // If loading starts again, show immediately
            if (active) {
                setVisible(true);
                setFadeOut(false);
            }
        }
    }, [active, progress]);

    if (!visible) return null;

    return (
        <div
            className={`absolute inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="relative flex flex-col items-center">
                {/* Splash Image */}
                <div className="w-[80vw] h-[80vh] relative mb-8 animate-pulse" style={{ animationDuration: '3s' }}>
                    <img
                        src="/textures/Splash.png"
                        alt="Loading..."
                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                </div>

                {/* Loading Bar */}
                <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Text */}
                <div className="mt-4 font-mono text-blue-400 text-xs tracking-[0.2em] uppercase">
                    Initializing Simulation... {Math.round(progress)}%
                </div>
            </div>
        </div>
    );
}
