import React, { useState, useMemo, useCallback, useEffect } from "react";
import Scene from "./components/Scene";
import Controls from "./components/Controls";
import InfoPanel from "./components/InfoPanel";
import PlanetList from "./components/PlanetList";
import Toolbar from "./components/ui/Toolbar";
import BottomBar from "./components/ui/BottomBar";
import PanelShell from "./components/ui/PanelShell";
import ResizableSidebar from "./components/ui/ResizableSidebar";
import SplashLoader from "./components/ui/SplashLoader";
import DebugPanel from "./components/DebugPanel";
import { usePanelLayout } from "./hooks/usePanelLayout";
import { useSettings } from "./hooks/useSettings";
import { PlanetData } from "./types";
import { SIMULATION_EPOCH } from "./constants";
import ISSLiveFeed from "./components/ISSLiveFeed";

const App: React.FC = () => {
  // Persisted settings (localStorage)
  const { settings, set, resetSettings } = useSettings();

  // Session-only state (not persisted)
  const [paused, setPaused] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [followingBody, setFollowingBody] = useState<PlanetData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [fps, setFps] = useState(0);

  // Triggers
  const [forcedTime, setForcedTime] = useState<
    { value: number; id: number } | undefined
  >(undefined);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  // Panel Layout State
  const { panels, accordionState, togglePanel, toggleAccordion } =
    usePanelLayout();

  // Calculate actual speed
  const actualSpeed = useMemo(() => {
    const minSpeed = 1 / 86400;
    const maxSpeed = 365.25;
    if (settings.speedLog === 0) return minSpeed;
    const r = Math.pow(maxSpeed / minSpeed, settings.speedLog / 100);
    return minSpeed * r;
  }, [settings.speedLog]);

  // Handlers
  const handle3DPlanetClick = useCallback((p: PlanetData) => {
    setSelectedPlanet(p);
    setFollowingBody(p);
    setIsFollowing(true);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedPlanet(null);
  }, []);

  const handleListSelect = useCallback((p: PlanetData) => {
    setSelectedPlanet(p);
  }, []);

  const handleListFollow = useCallback((p: PlanetData) => {
    setSelectedPlanet(p);
    setFollowingBody(p);
    setIsFollowing(true);
  }, []);

  const handleTrackFromPanel = useCallback(() => {
    if (selectedPlanet) {
      setFollowingBody(selectedPlanet);
      setIsFollowing(true);
    }
  }, [selectedPlanet]);

  const handleSetTime = useCallback((timestamp: number) => {
    const simDays = (timestamp - SIMULATION_EPOCH) / (1000 * 86400);
    setSimTime(simDays);
    setForcedTime({ value: simDays, id: Math.random() });
  }, []);

  const handleResetTime = useCallback(() => {
    handleSetTime(SIMULATION_EPOCH);
  }, [handleSetTime]);

  const handleResetCamera = useCallback(() => {
    setFollowingBody(null);
    setIsFollowing(false);
    setResetCameraTrigger((prev) => prev + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      switch (e.key) {
        case "1":
          togglePanel("bodies");
          break;
        case "2":
          togglePanel("info");
          break;
        case "3":
          togglePanel("controls");
          break;
        case "4":
          togglePanel("debug");
          break;
        case " ":
          e.preventDefault();
          setPaused((p) => !p);
          break;
        case "f":
          if (followingBody) {
            setIsFollowing((prev) => !prev);
          }
          break;
        case "r":
          set(
            "cameraMode",
            settings.cameraMode === "equatorial" ? "ecliptic" : "equatorial",
          );
          break;
        case "Escape":
          setSelectedPlanet(null);
          setIsFollowing(false);
          setFollowingBody(null);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel, settings.cameraMode, set, followingBody]);

  // Determine sidebar visibility
  const leftVisible = panels.bodies;
  const rightVisible = panels.info || panels.controls || panels.debug;

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Loading Screen */}
      <SplashLoader />

      {/* 3D Scene - Full screen */}
      <Scene
        speed={actualSpeed}
        paused={paused}
        scaleFactor={settings.scaleFactor}
        showOrbits={settings.showOrbits}
        showLabels={settings.showLabels}
        selectedPlanet={selectedPlanet}
        followingBody={followingBody}
        isFollowing={isFollowing}
        onPlanetClick={handle3DPlanetClick}
        onBackgroundClick={handleBackgroundClick}
        onTimeUpdate={setSimTime}
        onFpsUpdate={setFps}
        atmOpacity={settings.atmOpacity}
        atmPow={settings.atmPow}
        atmSamples={settings.atmSamples}
        ambientLightIntensity={settings.ambientLight}
        sunLuminosity={settings.sunLuminosity}
        sunShaderEnabled={settings.sunShaderEnabled}
        sunColorA={settings.sunColorA}
        sunColorB={settings.sunColorB}
        sunSpeed={settings.sunSpeed}
        sunNoiseScale={settings.sunNoiseScale}
        sunTurbulence={settings.sunTurbulence}
        sunRayCount={settings.sunRayCount}
        sunSpotIntensity={settings.sunSpotIntensity}
        sunSpotCount={settings.sunSpotCount}
        sunRimPower={settings.sunRimPower}
        sunRimColor={settings.sunRimColor}
        sunCoronas={settings.sunCoronas}
        sunCoronaOpacity={settings.sunCoronaOpacity}
        sunFilamentScale={settings.sunFilamentScale}
        sunFilamentIntensity={settings.sunFilamentIntensity}
        sunSurfaceRelief={settings.sunSurfaceRelief}
        sunProminenceSize={settings.sunProminenceSize}
        eclipseShadowIntensity={settings.eclipseShadowIntensity}
        lensflareEnabled={settings.lensflareEnabled}
        lensflareOpacity={settings.lensflareOpacity}
        shadowEnabled={settings.shadowEnabled}
        shadowMapSize={settings.shadowMapSize}
        shadowRadius={settings.shadowRadius}
        renderScale={settings.renderScale}
        starsCount={settings.starsCount}
        forcedTime={forcedTime}
        resetCameraTrigger={resetCameraTrigger}
        issModel={settings.issModel}
        starSize={settings.starSize}
        starSizeMagShape={settings.starSizeMagShape}
        starBrightness={settings.starBrightness}
        starBrightnessMagShape={settings.starBrightnessMagShape}
        starSaturation={settings.starSaturation}
        bloomThreshold={settings.bloomThreshold}
        bloomIntensity={settings.bloomIntensity}
        bloomRadius={settings.bloomRadius}
        bloomSmoothing={settings.bloomSmoothing}
        bloomMipmapBlur={settings.bloomMipmapBlur}
        noiseOpacity={settings.noiseOpacity}
        noisePremultiply={settings.noisePremultiply}
        vignetteDarkness={settings.vignetteDarkness}
        vignetteOffset={settings.vignetteOffset}
        vignetteEskil={settings.vignetteEskil}
        chromaticAberrationOffset={settings.chromaticAberrationOffset}
        chromaticRadial={settings.chromaticRadial}
        chromaticModulation={settings.chromaticModulation}
        brightness={settings.brightness}
        contrast={settings.contrast}
        exposure={settings.exposure}
        hue={settings.hue}
        saturation={settings.saturation}
        toneMappingAdaptive={settings.toneMappingAdaptive}
        enableBloom={settings.enableBloom}
        enableNoise={settings.enableNoise}
        enableVignette={settings.enableVignette}
        enableChromaticAberration={settings.enableChromaticAberration}
        enableBrightnessContrast={settings.enableBrightnessContrast}
        enableHueSaturation={settings.enableHueSaturation}
        enableAO={settings.enableAO}
        aoIntensity={settings.aoIntensity}
        aoRadius={settings.aoRadius}
        aoDistanceFalloff={settings.aoDistanceFalloff}
        aoScreenSpace={settings.aoScreenSpace}
        gravityVisible={settings.gravityVisible}
        gravityOpacity={settings.gravityOpacity}
        gravityMin={settings.gravityMin}
        gravityMax={settings.gravityMax}
        gravityIntensityPow={settings.gravityIntensityPow}
        gravityDirectionSat={settings.gravityDirectionSat}
        gravityShowDirection={settings.gravityShowDirection}
        gravityPlaneSize={settings.gravityPlaneSize}
        gravityYOffset={settings.gravityYOffset}
        gravityParticlesVisible={settings.gravityParticlesVisible}
        gravityShowContours={settings.gravityShowContours}
        gravityContourFreq={settings.gravityContourFreq}
        gravityExcludeSun={settings.gravityExcludeSun}
        gravityShowEquilibrium={settings.gravityShowEquilibrium}
        gravityEquilibriumThreshold={settings.gravityEquilibriumThreshold}
        gravityShowEffective={settings.gravityShowEffective}
        volumetricEnabled={settings.volumetricEnabled}
        volumetricIntensity={settings.volumetricIntensity}
        volumetricSamples={settings.volumetricSamples}
        volumetricDecay={settings.volumetricDecay}
        volumetricScatterColor={settings.volumetricScatterColor}
        volumetricShadowSharpness={settings.volumetricShadowSharpness}
        volumetricShadowScale={settings.volumetricShadowScale}
        volumetricMaxDistance={settings.volumetricMaxDistance}
        showConstellations={settings.showConstellations}
        showCelestialGrid={settings.showCelestialGrid}
        showEarthGrid={settings.showEarthGrid}
        gridMode={settings.gridMode}
        cameraMode={settings.cameraMode}
        cameraTransitionSpeed={settings.cameraTransitionSpeed}
        earthTextureLOD={settings.earthTextureLOD}
        showClouds={settings.showClouds}
        cloudSpeed={settings.cloudSpeed}
        cloudOpacity={settings.cloudOpacity}
        showNightLights={settings.showNightLights}
        bumpScale={settings.bumpScale}
        specularStrength={settings.specularStrength}
        nightLightIntensity={settings.nightLightIntensity}
        dayIntensity={settings.dayIntensity}
        earthRotationOffset={settings.earthRotationOffset}
        earthTextureOffset={settings.earthTextureOffset}
        displacementScale={settings.displacementScale}
        cloudRotationOffset={settings.cloudRotationOffset}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 pointer-events-auto bg-black/60 backdrop-blur-md border-b border-white/5 flex-shrink-0">
          {/* Title */}
          <div className="select-none flex-shrink-0">
            <h1 className="text-lg font-thin tracking-widest text-white/90 leading-none">
              ORBITAL
            </h1>
            <p className="text-[8px] text-blue-400 font-bold tracking-[0.25em] uppercase leading-none">
              Keplerian Simulation
            </p>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-white/10 flex-shrink-0" />

          {/* Toolbar */}
          <Toolbar panels={panels} togglePanel={togglePanel} />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mini FPS */}
          <span
            className={`text-[10px] font-mono flex-shrink-0 ${fps < 30 ? "text-red-500" : "text-green-500/60"}`}
          >
            {fps} FPS
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar */}
          <ResizableSidebar
            side="left"
            defaultWidth={220}
            minWidth={160}
            maxWidth={400}
            visible={leftVisible}
          >
            <PanelShell title="Bodies" noPadding maxHeight="100%">
              <PlanetList
                onSelect={handleListSelect}
                onFollow={handleListFollow}
                selectedId={selectedPlanet?.id}
                followingId={followingBody?.id}
                isFollowingActive={isFollowing}
              />
            </PanelShell>
          </ResizableSidebar>

          {/* Center - passthrough */}
          <div className="flex-1" />

          {/* Right Sidebar */}
          <ResizableSidebar
            side="right"
            defaultWidth={300}
            minWidth={220}
            maxWidth={500}
            visible={rightVisible}
          >
            {/* Info Panel */}
            {selectedPlanet?.id === "iss" && panels.info && (
              <PanelShell
                title="ISS Live Feed"
                className="flex-shrink-0"
                maxHeight="400px" // Increased to accommodate aspect ratio
                headerRight={
                  <button
                    onClick={() => setSelectedPlanet(null)}
                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                }
              >
                <ISSLiveFeed visible={true} />
              </PanelShell>
            )}

            {panels.info && selectedPlanet && (
              <PanelShell title="Object Info" className="flex-shrink-0">
                <InfoPanel
                  planet={selectedPlanet}
                  onClose={() => setSelectedPlanet(null)}
                  onFollow={handleTrackFromPanel}
                  isFollowingThisPlanet={
                    isFollowing && followingBody?.id === selectedPlanet?.id
                  }
                />
              </PanelShell>
            )}

            {/* Controls */}
            {panels.controls && (
              <PanelShell
                title="Settings"
                className="flex-1 min-h-0"
                maxHeight="100%"
              >
                <Controls
                  settings={settings}
                  set={set}
                  resetSettings={resetSettings}
                  isFollowing={isFollowing}
                  setIsFollowing={setIsFollowing}
                  onResetCamera={handleResetCamera}
                  accordionState={accordionState}
                  toggleAccordion={toggleAccordion}
                  date={simTime}
                  onSetTime={handleSetTime}
                />
              </PanelShell>
            )}

            {/* Debug Panel */}
            {panels.debug && (
              <PanelShell title="Debug" className="flex-shrink-0">
                <DebugPanel selectedBodyId={selectedPlanet?.id ?? null} />
              </PanelShell>
            )}
          </ResizableSidebar>
        </div>

        {/* Bottom Bar */}
        <div className="flex-shrink-0">
          <BottomBar
            date={simTime}
            fps={fps}
            actualSpeed={actualSpeed}
            paused={paused}
            setPaused={setPaused}
            onResetTime={handleResetTime}
            speedLog={settings.speedLog}
            setSpeedLog={(v) => set("speedLog", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
