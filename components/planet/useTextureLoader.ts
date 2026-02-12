import { useState, useEffect } from "react";
import * as THREE from "three";
import { PlanetData } from "../../types";

export interface LoadedTextures {
  map: THREE.Texture | null;
  normal: THREE.Texture | null;
  specular: THREE.Texture | null;
  ring: THREE.Texture | null;
  displacement: THREE.Texture | null;
}

export interface EarthTextures {
  day: THREE.CubeTexture | null;
  night: THREE.CubeTexture | null;
  clouds: THREE.CubeTexture | null;
  normal: THREE.Texture | null;
  specular: THREE.Texture | null;
  loadedLOD: string | null;
}

interface UseTextureLoaderParams {
  data: PlanetData;
  earthTextureLOD: "low" | "med" | "high" | "ultra";
  earthUniforms: Record<string, { value: unknown }>;
  moonMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  jupiterMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  bumpScale: number;
  displacementScale: number;
  dayIntensity: number;
}

export function useTextureLoader({
  data,
  earthTextureLOD,
  earthUniforms,
  moonMaterialRef,
  jupiterMaterialRef,
  bumpScale,
  displacementScale,
  dayIntensity,
}: UseTextureLoaderParams) {
  const [loadedTextures, setTextures] = useState<LoadedTextures>({
    map: null,
    normal: null,
    specular: null,
    ring: null,
    displacement: null,
  });

  const [earthTextures, setEarthTextures] = useState<EarthTextures>({
    day: null,
    night: null,
    clouds: null,
    normal: null,
    specular: null,
    loadedLOD: null,
  });

  // Sync Moon Textures to Uniforms (using material ref)
  useEffect(() => {
    if (data.id === "moon" && moonMaterialRef.current) {
      const u = moonMaterialRef.current.uniforms;

      if (loadedTextures.map) {
        console.log("Moon: Setting map texture");
        u.map.value = loadedTextures.map;
      }
      if (loadedTextures.normal) {
        console.log("Moon: Setting normal texture");
        u.normalMap.value = loadedTextures.normal;
      }
      if (loadedTextures.displacement) {
        console.log(
          "Moon: Setting displacement texture",
          loadedTextures.displacement,
        );
        u.displacementMap.value = loadedTextures.displacement;
      }

      u.bumpScale.value = bumpScale;
      u.displacementScale.value = displacementScale;
      u.dayIntensity.value = dayIntensity;

      console.log("Moon displacement scale:", displacementScale);
    }
  }, [data.id, loadedTextures, bumpScale, displacementScale, dayIntensity]);

  // Sync Jupiter Textures to Uniforms
  useEffect(() => {
    if (data.id === "jupiter" && jupiterMaterialRef.current) {
      const u = jupiterMaterialRef.current.uniforms;

      if (loadedTextures.map) {
        console.log("Jupiter: Setting map texture");
        u.map.value = loadedTextures.map;
      }
      if (loadedTextures.normal) {
        console.log("Jupiter: Setting normal texture");
        u.normalMap.value = loadedTextures.normal;
      }
      // Jupiter doesn't usually use displacement but we support it if available
      if (loadedTextures.displacement) {
        u.displacementMap.value = loadedTextures.displacement;
      }

      u.bumpScale.value = 0.0;
      u.displacementScale.value = 0.0;
      u.dayIntensity.value = dayIntensity;
    }
  }, [data.id, loadedTextures, bumpScale, displacementScale, dayIntensity]);

  // Main texture loading effect
  useEffect(() => {
    let cancelled = false;

    // Earth Specific Loader
    if (data.id === "earth") {
      const manager = new THREE.LoadingManager();
      const loader = new THREE.TextureLoader(manager);
      const cubeLoader = new THREE.CubeTextureLoader(manager);
      const lod = earthTextureLOD || "high";

      // Only reload if LOD changed
      if (earthTextures.loadedLOD === lod) return;

      const path = "/tex";
      const fallbackLod = lod === "ultra" ? "high" : lod;

      const dayPath = `${path}/cubemap/earth-day-${lod}/`;
      const nightPath = `${path}/cubemap/earth-night-${lod}/`;
      const cloudPath = `${path}/cubemap/earth-cloud-${fallbackLod}/`;

      const normalPath = `${path}/base/earth-normal-${fallbackLod}.jpg`;
      const specularPath = `${path}/base/earth-specular-${fallbackLod}.jpg`;
      const heightPath = `${path}/base/earth-height-${fallbackLod}.jpg`;

      const loadCubemap = (p: string, prefix: string) =>
        new Promise<THREE.CubeTexture>((resolve, reject) => {
          const suffixes = [
            "_rt.jpg",
            "_lf.jpg",
            "_up.jpg",
            "_dn.jpg",
            "_ft.jpg",
            "_bk.jpg",
          ];
          const files = suffixes.map((s) => `${prefix}${s}`);

          cubeLoader.setPath(p).load(
            files,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              resolve(tex);
            },
            undefined,
            reject,
          );
        });

      const load2D = (p: string, isSRGB = true) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            p,
            (tex) => {
              tex.colorSpace = isSRGB
                ? THREE.SRGBColorSpace
                : THREE.NoColorSpace;
              resolve(tex);
            },
            undefined,
            reject,
          );
        });

      Promise.all([
        loadCubemap(dayPath, "earth-day"),
        loadCubemap(nightPath, "earth-night"),
        loadCubemap(cloudPath, "earth-cloud"),
        load2D(normalPath, false),
        load2D(specularPath, true),
        load2D(heightPath, true),
      ])
        .then(([day, night, clouds, normal, specular, height]) => {
          if (cancelled) return;
          setEarthTextures({
            day,
            night,
            clouds,
            normal,
            specular,
            loadedLOD: lod,
          });

          // Update Uniforms
          if (earthUniforms) {
            earthUniforms.dayMap.value = day;
            earthUniforms.nightMap.value = night;
            earthUniforms.cloudMap.value = clouds;
            earthUniforms.normalMap.value = normal;
            earthUniforms.specularMap.value = specular;
            earthUniforms.displacementMap.value = height;
          }
        })
        .catch((err) => {
          console.error("Failed to load earth textures for LOD " + lod, err);
        });

      return () => {
        cancelled = true;
      };
    }

    // Standard Loader for other planets
    const loadedTexturesList: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();

    if (data.textureUrl) {
      loader.load(
        data.textureUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, map: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load texture: ${data.textureUrl}`, err);
        },
      );
    }
    if (data.normalMapUrl) {
      loader.load(
        data.normalMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, normal: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load normal map: ${data.normalMapUrl}`, err);
        },
      );
    }
    if (data.specularMapUrl) {
      loader.load(
        data.specularMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, specular: tex }));
        },
        undefined,
        (err) => {
          console.warn(
            `Failed to load specular map: ${data.specularMapUrl}`,
            err,
          );
        },
      );
    }
    if (data.displacementMapUrl) {
      loader.load(
        data.displacementMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, displacement: tex }));
        },
        undefined,
        (err) => {
          console.warn(
            `Failed to load displacement map: ${data.displacementMapUrl}`,
            err,
          );
        },
      );
    }
    if (data.ringMapUrl) {
      loader.load(
        data.ringMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, ring: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load ring texture: ${data.ringMapUrl}`, err);
        },
      );
    }

    return () => {
      cancelled = true;
      loadedTexturesList.forEach((tex) => tex.dispose());
    };
  }, [
    data.id,
    data.textureUrl,
    data.normalMapUrl,
    data.specularMapUrl,
    data.ringMapUrl,
    earthTextureLOD,
  ]);

  return { loadedTextures, earthTextures };
}
