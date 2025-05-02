import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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


const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({
  color: 0x00ff00,
});

const cube = new THREE.Mesh(geometry, material);

scene.add(cube);
camera.position.z = 5;

const pointLight = new THREE.PointLight(0xffffff, 1.0);
pointLight.position.set(1, 1, 0);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

function render() {
  renderer.render(scene, camera);
}

render();

controls.addEventListener("change", render);
