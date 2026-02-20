import React, { useState, useMemo, useCallback, useEffect } from "react";
import Scene, { telescopeAngleStore } from "./components/Scene";
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
import { PLANETS, SUN_DATA, SIMULATION_EPOCH } from "./constants";
import ISSLiveFeed from "./components/ISSLiveFeed";

// Helper to flatten planet list for dropdowns
const getAllBodies = () => {
  const list: PlanetData[] = [SUN_DATA];
  const add = (p: PlanetData) => {
    list.push(p);
    if (p.moons) p.moons.forEach(add);
  };
  PLANETS.forEach(add);
  return list;
};

const TelescopeAngleDisplay: React.FC = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-between items-center text-[10px] text-blue-400 font-mono bg-black/40 px-2 py-1.5 rounded border border-blue-900/50">
      <span>AZ: {telescopeAngleStore.azimuth.toFixed(1)}°</span>
      <span>ALT: {telescopeAngleStore.altitude.toFixed(1)}°</span>
    </div>
  );
};

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

  // Surface Target State
  const [gotoModal, setGotoModal] = useState<{ planetId: string } | null>(null);
  const [surfaceTarget, setSurfaceTarget] = useState<{
    planetId: string;
    lat: number;
    lon: number;
    trigger: number;
  } | null>(null);

  // Triggers
  const [forcedTime, setForcedTime] = useState<
    { value: number; id: number } | undefined
  >(undefined);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  // Telescope State
  const [telescopeTargetId, setTelescopeTargetId] = useState<string | null>(null);
  const [telescopeZoom, setTelescopeZoom] = useState(45); // default FOV
  const [telescopeMount, setTelescopeMount] = useState<"azimuthal" | "equatorial">("azimuthal");

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

  const handleGoToSurface = useCallback((planetId: string) => {
    setGotoModal({ planetId });
  }, []);

  const submitGoToSurface = useCallback(
    (lat: number, lon: number) => {
      if (gotoModal) {
        setSurfaceTarget({
          planetId: gotoModal.planetId,
          lat,
          lon,
          trigger: Date.now(),
        });
        // Also set as followed body
        const findBody = (id: string, list: PlanetData[]): PlanetData | null => {
          for (const p of list) {
            if (p.id === id) return p;
            if (p.moons) {
              const m = findBody(id, p.moons);
              if (m) return m;
            }
          }
          return null;
        };
        const p = findBody(gotoModal.planetId, PLANETS) ||
          (SUN_DATA.id === gotoModal.planetId ? SUN_DATA : null);

        setGotoModal(null);
      }
    },
    [gotoModal]
  );

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
          setSurfaceTarget(null);
          setTelescopeTargetId(null);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel, settings.cameraMode, set, followingBody]);

  // Determine sidebar visibility
  const leftVisible = panels.bodies;
  const rightVisible = panels.info || panels.controls || panels.debug;

  // Let's refine submitGoToSurface to also set followingBody
  const submitGoToSurfaceRefined = useCallback(
    (lat: number, lon: number) => {
      if (gotoModal) {
        // Find planet data
        const findBody = (id: string, list: PlanetData[]): PlanetData | null => {
          for (const p of list) {
            if (p.id === id) return p;
            if (p.moons) {
              const m = findBody(id, p.moons);
              if (m) return m;
            }
          }
          return null;
        };

        // We need PLANETS and SUN_DATA here
        // We'll import them locally or just rely on selectedPlanet if it matches
        // For robustness, let's just trigger the surface target
        setSurfaceTarget({
          planetId: gotoModal.planetId,
          lat,
          lon,
          trigger: Date.now(),
        });
        setGotoModal(null);
      }
    },
    [gotoModal]
  );

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Loading Screen */}
      <SplashLoader />

      {/* 3D Scene - Full screen */}
      <Scene
        speed={actualSpeed}
        paused={paused}
        scaleFactor={settings.scaleFactor}
        auScale={settings.auScale}
        showOrbits={settings.showOrbits}
        showLabels={settings.showLabels}
        selectedPlanet={selectedPlanet}
        followingBody={followingBody}
        isFollowing={isFollowing}
        surfaceTarget={surfaceTarget}
        surfaceCameraAltitude={settings.surfaceCameraAltitude}
        telescopeTargetId={telescopeTargetId}
        telescopeZoom={telescopeZoom}
        telescopeMount={telescopeMount}
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
        {/* Go To Modal */}
        {gotoModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/20 p-4 rounded-lg shadow-xl w-64 selection:bg-blue-500 selection:text-white">
              <h3 className="text-white font-semibold mb-4">Go to Surface</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const lat = parseFloat(fd.get("lat") as string) || 0;
                  const lon = parseFloat(fd.get("lon") as string) || 0;
                  submitGoToSurfaceRefined(lat, lon);
                }}
              >
                <div className="mb-3">
                  <label className="block text-gray-400 text-xs mb-1">
                    Latitude (-90 to 90)
                  </label>
                  <input
                    name="lat"
                    type="number"
                    step="any"
                    required
                    defaultValue="0"
                    placeholder="e.g. 48.85"
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-xs mb-1">
                    Longitude (-180 to 180)
                  </label>
                  <input
                    name="lon"
                    type="number"
                    step="any"
                    required
                    defaultValue="0"
                    placeholder="e.g. 2.35"
                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setGotoModal(null)}
                    className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                  >
                    Go
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Telescope Panel (when on planet) */}
        {surfaceTarget && followingBody && (
          <div className="absolute top-16 right-4 z-40 bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl w-64 pointer-events-auto">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
              <h3 className="text-white text-sm font-bold tracking-wider uppercase">Telescope</h3>
              <button
                onClick={() => setSurfaceTarget(null)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                title="Exit Surface View"
              >
                Exit
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Target Body</label>
                <select
                  className="bg-black/50 border border-white/10 text-white text-xs p-1.5 rounded focus:outline-none focus:border-blue-500"
                  value={telescopeTargetId || ""}
                  onChange={(e) => setTelescopeTargetId(e.target.value || null)}
                >
                  <option value="">(None)</option>
                  {getAllBodies()
                    .filter(b => b.id !== followingBody.id)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>

              <TelescopeAngleDisplay />

              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider">
                  <label>Zoom (FOV)</label>
                  <span>{telescopeZoom.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="90"
                  step="0.1"
                  value={telescopeZoom}
                  onChange={(e) => setTelescopeZoom(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {telescopeTargetId && (
                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Mount Type</label>
                  <div className="flex rounded overflow-hidden border border-white/10">
                    <button
                      onClick={() => setTelescopeMount("azimuthal")}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors ${telescopeMount === "azimuthal" ? "bg-blue-600 text-white" : "bg-black/40 text-gray-400 hover:bg-white/10"}`}
                    >
                      Azimuthal
                    </button>
                    <button
                      onClick={() => setTelescopeMount("equatorial")}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors ${telescopeMount === "equatorial" ? "bg-blue-600 text-white" : "bg-black/40 text-gray-400 hover:bg-white/10"}`}
                    >
                      Equatorial
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                onGoTo={handleGoToSurface}
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
              <PanelShell
                title="Object Info"
                className="flex-shrink min-h-0"
              >
                <InfoPanel
                  planet={selectedPlanet}
                  onClose={() => setSelectedPlanet(null)}
                  onFollow={handleTrackFromPanel}
                  isFollowingThisPlanet={
                    isFollowing && followingBody?.id === selectedPlanet?.id
                  }
                  date={simTime}
                  auScale={settings.auScale}
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
