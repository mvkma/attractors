import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lorenz, RungeKuttaIntegrator, RungeKuttaParams } from './integration';

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

interface LorenzVisualizerParams {
  rungeKuttaParams: RungeKuttaParams,
  radius: number;
  color: THREE.ColorRepresentation;
  count: number;
}

class LorenzVisualizer {
  private n = 0;

  private readonly integrator;
  private readonly geometry;
  private readonly material;
  private readonly mesh;
  private readonly dummy;
  
  constructor(params: LorenzVisualizerParams) {
    this.geometry = new THREE.SphereGeometry(params.radius);
    this.material = new THREE.MeshPhongMaterial({
      color: params.color,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, params.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();

    this.integrator = new RungeKuttaIntegrator(params.rungeKuttaParams);
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.mesh);
  }

  update() {
    const { x } = this.integrator.next();

    this.dummy.position.set(x[0], x[1], x[2]);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.n % this.mesh.count, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.computeBoundingSphere();
    this.n += 1;
  }
}

camera.position.z = 55;

function render() {
  renderer.render(scene, camera);
}

controls.addEventListener("change", render);

const lorenz1 = new LorenzVisualizer({
  rungeKuttaParams: {
    f: lorenz,
    x0: new Float32Array([1, 2, 1]),
    t0: 0,
    dt: 0.01,
    eps: 1e-6,
  },
  color: 0xff0000,
  count: 1024,
  radius: 0.3,
});

const lorenz2 = new LorenzVisualizer({
  rungeKuttaParams: {
    f: lorenz,
    x0: new Float32Array([1.1, 2, 1]),
    t0: 0,
    dt: 0.01,
    eps: 1e-6,
  },
  color: 0x00ff00,
  count: 1024,
  radius: 0.3,
});

lorenz1.addTo(scene);
lorenz2.addTo(scene);

function animate() {
  setTimeout(() => {
    requestAnimationFrame(animate);
  }, 50);
  lorenz1.update();
  lorenz2.update();
  render();
}

animate();
