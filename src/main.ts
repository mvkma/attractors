import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lorenz } from './systems';
import { Spheres } from './visualizers';
import { RungeKuttaIntegrator } from './integration';
import colormaps from './colormaps';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="scene">
  </div>
`
const width = 800;
const height = 600;

const scene = new THREE.Scene();
const aspect = height / width;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
const gui = new GUI();

const renderer = new THREE.WebGLRenderer()
renderer.setSize(width, height);

document.querySelector("#scene")?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

const pointLight = new THREE.PointLight(0xffffff, 1.0);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
scene.add(directionalLight);

camera.position.z = 55;

function render() {
  renderer.render(scene, camera);
}

controls.addEventListener("change", render);

const instances: Spheres[] = []
const parameters = {
  colormap: "red",
};

let colormap = colormaps.get(parameters.colormap)!;
const count = 5;

for (let i = 0; i < count; i++) {
  const integrator = new RungeKuttaIntegrator({
      f: lorenz,
      x0: new Float32Array([1 + i, 2 - i, i * 10]),
      t0: 0,
      dt: 0.01,
      eps: 1e-6,
  });

  const spheres = new Spheres({
    integrator: integrator,
    color: colormap.sample((i + 0.5) / count),
    count: 1024,
    radius: 0.3,
  });
  scene.add(spheres);
  instances.push(spheres);
}

gui.add(parameters, "colormap", [...colormaps.keys()]).onChange((key) => {
  if (!colormaps.has(key)) {
    return;
  }

  colormap = colormaps.get(key)!;

  for (let i = 0; i < count; i++) {
    instances[i].setColor(colormap.sample((i + 0.5) / count));

    if (paused) {
      render();
    }
  }
});

function animate() {
  if (!paused) {
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, 50);
  }
  instances.forEach((instance) => instance.update());
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
