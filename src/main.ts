import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lorenz } from './integration';
import { LorenzVisualizer } from './lorenz';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="scene">
  </div>
`
const width = 800;
const height = 600;

const scene = new THREE.Scene();
const aspect = height / width;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

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

const instances: LorenzVisualizer[] = []
const colors = [
  0x845ec2,
  0xd65db1,
  0xff6f91,
  0xff9671,
  0xffc75f,
  0xf9f871,
];

for (let i = 0; i < colors.length; i++) {
  const vis = new LorenzVisualizer({
    rungeKuttaParams: {
      f: lorenz,
      x0: new Float32Array([1 + i, 2 - i, i * 10]),
      t0: 0,
      dt: 0.01,
      eps: 1e-6,
    },
    color: colors[i],
    count: 1024,
    radius: 0.3,
  });
  vis.addTo(scene);
  instances.push(vis);
}

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
