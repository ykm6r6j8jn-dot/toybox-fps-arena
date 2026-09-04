import * as THREE from "three";
import { projectBoxShadow } from "../render-systems.mjs";

export function createDaylightEnvironment(renderer: THREE.WebGLRenderer) {
  const sky = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        vec3 ground = vec3(0.22, 0.25, 0.23);
        vec3 horizon = vec3(0.72, 0.81, 0.87);
        vec3 zenith = vec3(0.27, 0.48, 0.71);
        vec3 color = direction.y < 0.0 ? mix(horizon, ground, min(1.0, -direction.y * 4.0))
          : mix(horizon, zenith, pow(direction.y, 0.45));
        float sun = pow(max(0.0, dot(direction, normalize(vec3(42.0, 72.0, 36.0)))), 180.0);
        gl_FragColor = vec4(color + vec3(4.0, 3.5, 2.7) * sun, 1.0);
      }`
  }));
  sky.add(shell);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(sky, 0.04, 0.1, 100);
  generator.dispose();
  shell.geometry.dispose();
  shell.material.dispose();
  return target;
}

// World-space coordinates keep concrete grain the same size on long and short walls.
export function applyWorldMaterial(material: THREE.MeshStandardMaterial, scale = 0.32) {
  material.bumpMap = null;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vSurfacePosition; varying vec3 vSurfaceNormal;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      vec4 surfacePosition = vec4(transformed, 1.0);
      vec3 surfaceNormal = objectNormal;
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
        surfaceNormal = mat3(instanceMatrix) * surfaceNormal;
      #endif
      vSurfacePosition = (modelMatrix * surfacePosition).xyz;
      vSurfaceNormal = normalize(mat3(modelMatrix) * surfaceNormal);`);
    shader.fragmentShader = `varying vec3 vSurfacePosition; varying vec3 vSurfaceNormal;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      #ifdef USE_MAP
        vec3 axes = abs(normalize(vSurfaceNormal));
        vec2 surfaceUv = axes.y > max(axes.x, axes.z) ? vSurfacePosition.xz
          : axes.x > axes.z ? vSurfacePosition.zy : vSurfacePosition.xy;
        diffuseColor *= texture2D(map, surfaceUv * ${scale.toFixed(4)});
      #endif`);
  };
  material.customProgramCacheKey = () => `world-material-7-${scale}`;
  material.needsUpdate = true;
}

export function createBakedGroundShadow(boxes: THREE.Box3[], size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(7, 19, 28, 0.34)";
  // All polygons form a single union, so overlapping buildings do not darken repeatedly.
  ctx.beginPath();
  for (const box of boxes) {
    if (box.max.y < 1.4 || box.max.x - box.min.x < 0.8 || box.max.z - box.min.z < 0.8) continue;
    const points = projectBoxShadow(box, { x: 42, y: 72, z: 36 });
    points.forEach((point, index) => {
      const x = (point.x + 97) / 194 * size;
      const y = (point.z + 97) / 194 * size;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(194, 194), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  }));
  shadow.name = "baked daylight shadows";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.055;
  shadow.renderOrder = 2;
  return shadow;
}
