import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LorenzSystem, RoesslerSystem } from './systems';
import { Spheres, Traces } from './visualizers';
import { RungeKuttaIntegrator } from './integration';
import colormaps from './colormaps';
import GUI  from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Planes } from './planes';

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
controls.update();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
directionalLight.position.set(0, 50, 50);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);

camera.position.z = -55;

const planes = new Planes({
  width: 50,
  height: 50,
  color: 0x253b56,
});
scene.add(planes);

function render() {
  renderer.render(scene, camera);
}

controls.addEventListener("change", render);

const controllers: any[] = [];
const instances: Spheres[] | Traces[] = []
const parameters = {
  system: "lorenz",
  colormap: "red",
  tail: 1000,
  interval: 50,
};

let colormap = colormaps.get(parameters.colormap)!;
const count = 5;

function init(count: number, system: string) {
  let odeSystem;

  if (system === "lorenz") {
    odeSystem = new LorenzSystem();
  } else if (system === "roessler") {
    odeSystem = new RoesslerSystem();
  } else {
    return;
  }

  const params = odeSystem.parameters;
  for (const k of Object.keys(params)) {
    const controller = gui.add(params, k).onChange(() => {
      odeSystem.parameters = params;
    });
    controllers.push(controller);
  }

  for (let i = 0; i < count; i++) {
    const integrator = new RungeKuttaIntegrator({
      f: odeSystem.func.bind(odeSystem),
      x0: new Float32Array([1 + i, 2 - i, i * 10]),
      t0: 0,
      dt: 0.01,
      eps: 1e-6,
    });

    colormap.mirror = true;
    const spheres = new Traces({
      integrator: integrator,
      colorOptions: {
        // type: "constant",
        // color: colormap.sample((i + 0.5) / count),
        type: "colormap",
        colormap: colormap,
      },
      count: 1024,
      // radius: 0.3,
    });
    scene.add(spheres);
    instances.push(spheres);
  }
}

gui.add(parameters, "system", ["lorenz", "roessler"]).onChange((system) => {
  for (let i = 0; i < count; i++) {
    const sphere = instances.pop();
    if (!sphere) {
      break;
    }

    while (controllers.length > 0) {
      const c = controllers.pop();
      c.destroy();
    }

    scene.remove(sphere)
  }

  controllers.forEach((controller) => {
    controller.destroy();
  });

  init(count, system);
});

gui.add(parameters, "colormap", [...colormaps.keys()]).onChange((key) => {
  if (!colormaps.has(key)) {
    return;
  }

  colormap = colormaps.get(key)!;
  colormap.mirror = true;

  for (let i = 0; i < count; i++) {
    switch (instances[i].colorOptions.type) {
      case "constant":
        instances[i].colorOptions = {
          type: "constant",
          color: colormap.sample((i + 0.5) / count)
        };
        break;
      case "colormap":
        instances[i].colorOptions = {
          type: "colormap",
          colormap: colormap
        };
        break;
    }

    if (paused) {
      render();
    }
  }
});

gui.add(parameters, "tail", 1, 1000, 1).onChange((tail) => {
  for (let i = 0; i < count; i++) {
    instances[i].setCount(tail);

    if (paused) {
      render();
    }
  }
});

gui.add(parameters, "interval", 0, 500, 10);

init(count, parameters.system);

function animate() {
  if (!paused) {
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, parameters.interval);
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
