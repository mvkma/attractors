import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LorenzSystem, RoesslerSystem, ThomasSystem } from './systems';
import { PointCloud } from './visualizers';
import colormaps from './colormaps';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'stats-gl';
import { buildOdeFragmentShader, ComputeShader } from './compute-shader';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="scene">
  </div>
`
const width = 800;
const height = 600;

const scene = new THREE.Scene();
const aspect = height / width;
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
const gui = new GUI();

const renderer = new THREE.WebGLRenderer()
renderer.setSize(width, height);

document.querySelector("#scene")?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
directionalLight.position.set(0, 50, 50);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);

camera.position.z = -55;

const origin = new THREE.Vector3(0, 0, 0)

const arrows = [
  new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, 10, 0xffff00),
  new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, 10, 0x00ffff),
  new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 10, 0xff00ff),
]

arrows.forEach((arrow) => scene.add(arrow))

const stats = new Stats({ horizontal: true, trackGPU: true })
stats.init(renderer)
document.body.appendChild(stats.dom)

function render() {
  renderer.render(scene, camera);
  stats.update()
}

controls.addEventListener("change", render);

const controllers: any[] = [];
const parameters = {
  system: "lorenz",
  colormap: "red",
  interval: 50,
  iterations: 1,
  reset: () => computeShader.reset(),
  showArrows: true,
};

const computeShader = new ComputeShader({
  width: 256,
  height: 256,
  renderer: renderer,
  fragmentShader: buildOdeFragmentShader(new LorenzSystem())
})

let colormap = colormaps.get(parameters.colormap)!;

function init(system: string) {
  let odeSystem;

  if (system === "lorenz") {
    odeSystem = new LorenzSystem();
  } else if (system === "roessler") {
    odeSystem = new RoesslerSystem();
  } else if (system === "thomas") {
    odeSystem = new ThomasSystem();
  } else {
    return;
  }

  computeShader.setFragmentShader(buildOdeFragmentShader(odeSystem))
  for (const [k, v] of Object.entries(odeSystem.parameters)) {
    computeShader.setUniform(k, v)
  }

  const params = odeSystem.parameters;
  for (const k of Object.keys(params)) {
    const controller = gui.add(params, k).onChange(() => {
      odeSystem.parameters = params;
      for (const [k, v] of Object.entries(odeSystem.parameters)) {
        computeShader.setUniform(k, v)
      }
    });
    controllers.push(controller);
  }
}

gui.add(parameters, "system", ["lorenz", "roessler", "thomas"]).onChange((system) => {
  while (controllers.length > 0) {
    const c = controllers.pop();
    c.destroy();
  }

  init(system);
});

gui.add(parameters, "colormap", [...colormaps.keys()]).onChange((key) => {
  if (!colormaps.has(key)) {
    return;
  }

  colormap = colormaps.get(key)!;
  colormap.mirror = true;
});

gui.add(parameters, "interval", 0, 500, 10);

gui.add(parameters, "iterations", 1, 500, 1).onChange((iterations) => {
  computeShader.setUniform("iterations", iterations)
})

gui.add(parameters, "reset")

gui.add(parameters, "showArrows").onChange((showArrows) => {
  arrows.forEach((arrow) => arrow.visible = showArrows)
  if (paused) {
    render()
  }
})

init(parameters.system);

const pointCloud = new PointCloud({
  height: 256,
  width: 256,
})

scene.add(pointCloud)

function animate() {
  if (!paused) {
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, parameters.interval);
  }

  const activeTexture = computeShader.update()
  pointCloud.setUniform('positions', activeTexture)

  render();
}

let paused = true;

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    paused = !paused;

    if (!paused) {
      animate();
    }
  }
});

controls.update()
