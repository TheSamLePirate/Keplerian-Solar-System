import React, { useState, useMemo } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import InfoPanel from './components/InfoPanel';
import PlanetList from './components/PlanetList';
import { PlanetData } from './types';

const App: React.FC = () => {
    // Simulation State
    const [speedLog, setSpeedLog] = useState(0); // Slider 0-100
    const [paused, setPaused] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(0.5);
    const [showOrbits, setShowOrbits] = useState(true);
    const [showLabels, setShowLabels] = useState(true);

    // State separation: 
    // selectedPlanet = Planet displayed in InfoPanel / Highlighted in scene
    // followingBody = Planet the camera is tracking
    const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
    const [followingBody, setFollowingBody] = useState<PlanetData | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    const [simTime, setSimTime] = useState(0);
    const [fps, setFps] = useState(0);

    // Atmosphere Settings
    const [atmOpacity, setAtmOpacity] = useState(2.5);
    const [atmPow, setAtmPow] = useState(4.0);

    // Light Settings
    const [ambientLight, setAmbientLight] = useState(0.05);

    // Triggers
    const [resetTimeTrigger, setResetTimeTrigger] = useState(0);
    const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

    // Calculate actual speed
    const actualSpeed = useMemo(() => {
        const minSpeed = 1 / 86400;
        const maxSpeed = 365.25;
        if (speedLog === 0) return minSpeed;
        const r = Math.pow(maxSpeed / minSpeed, speedLog / 100);
        return minSpeed * r;
    }, [speedLog]);

    // Handlers

    // Click on 3D Object
    const handle3DPlanetClick = (p: PlanetData) => {
        setSelectedPlanet(p);
        setFollowingBody(p);
        setIsFollowing(true);
    };

    const handleBackgroundClick = () => {
        setSelectedPlanet(null);
        // Do not stop following if background is clicked, just close info panel
        // But if we want to stop following, we can use the controls or esc
    };

    // List: Click Name
    const handleListSelect = (p: PlanetData) => {
        setSelectedPlanet(p);
        // Does NOT automatically follow
    };

    // List: Click Scope/Target
    const handleListFollow = (p: PlanetData) => {
        setSelectedPlanet(p); // Also select it for info
        setFollowingBody(p);
        setIsFollowing(true);
    };

    // InfoPanel: Click Track
    const handleTrackFromPanel = () => {
        if (selectedPlanet) {
            setFollowingBody(selectedPlanet);
            setIsFollowing(true);
        }
    };

    const handleResetTime = () => {
        setSimTime(0);
        setResetTimeTrigger(prev => prev + 1);
    };

    const handleResetCamera = () => {
        setFollowingBody(null);
        setIsFollowing(false);
        setResetCameraTrigger(prev => prev + 1);
    };

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
            <Scene
                speed={actualSpeed}
                paused={paused}
                scaleFactor={scaleFactor}
                showOrbits={showOrbits}
                showLabels={showLabels}
                selectedPlanet={selectedPlanet}
                followingBody={followingBody}
                isFollowing={isFollowing}
                onPlanetClick={handle3DPlanetClick}
                onBackgroundClick={handleBackgroundClick}
                onTimeUpdate={setSimTime}
                onFpsUpdate={setFps}
                atmOpacity={atmOpacity}
                atmPow={atmPow}
                ambientLightIntensity={ambientLight}
                resetTimeTrigger={resetTimeTrigger}
                resetCameraTrigger={resetCameraTrigger}
            />

            <PlanetList
                onSelect={handleListSelect}
                onFollow={handleListFollow}
                selectedId={selectedPlanet?.id}
                followingId={followingBody?.id}
                isFollowingActive={isFollowing}
            />

            <Controls
                speedLog={speedLog} setSpeedLog={setSpeedLog}
                actualSpeed={actualSpeed}
                scaleFactor={scaleFactor} setScaleFactor={setScaleFactor}
                showOrbits={showOrbits} setShowOrbits={setShowOrbits}
                showLabels={showLabels} setShowLabels={setShowLabels}
                paused={paused} setPaused={setPaused}
                isFollowing={isFollowing} setIsFollowing={setIsFollowing}
                date={simTime}
                fps={fps}
                atmOpacity={atmOpacity} setAtmOpacity={setAtmOpacity}
                atmPow={atmPow} setAtmPow={setAtmPow}
                onResetTime={handleResetTime}
                onResetCamera={handleResetCamera}
                ambientLight={ambientLight} setAmbientLight={setAmbientLight}
            />

            <InfoPanel
                planet={selectedPlanet}
                onClose={() => setSelectedPlanet(null)}
                onFollow={handleTrackFromPanel}
                isFollowingThisPlanet={isFollowing && followingBody?.id === selectedPlanet?.id}
            />

            {/* Title Overlay */}
            <div className="absolute top-4 left-4 pointer-events-none z-10 select-none">
                <h1 className="text-3xl font-thin tracking-widest text-white/90 drop-shadow-md">ORBITAL</h1>
                <p className="text-xs text-blue-400 font-bold tracking-[0.3em] uppercase drop-shadow-sm">Keplerian Simulation</p>
            </div>
        </div>
    );
};

export default App;