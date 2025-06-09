import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { systems } from './systems';
import { PointCloud } from './visualizers';
import colormaps from './colormaps';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'stats-gl';
import { buildComputeShader, buildOdeFragmentShader, ComputeShaderUpdateOptions } from './compute-shader';

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
    reset: () => computeShaderUpdateOptions.reset = true,
    showArrows: true,
};

const computeShaderUpdateOptions: ComputeShaderUpdateOptions = {
    fragmentShader: undefined,
    reset: false,
    uniforms: {}
}

const computeShader = buildComputeShader({
    width: 256,
    height: 256,
    renderer: renderer,
    fragmentShader: buildOdeFragmentShader(systems["lorenz"]())
})

computeShader.next()

let colormap = colormaps.get(parameters.colormap)!;

function init(system: keyof typeof systems) {
    const odeSystem = systems[system]()

    computeShaderUpdateOptions["fragmentShader"] = buildOdeFragmentShader(odeSystem)

    const systemParams = odeSystem.getParameters() as { [k: string]: number }

    const updateParams = () => {
        odeSystem.setParameters(systemParams)

        for (const [k, v] of Object.entries(odeSystem.getParameters())) {
            computeShaderUpdateOptions.uniforms[k] = { value: v }
        }
    }

    // remove old controllers
    while (controllers.length > 0) {
        controllers.pop().destroy();
    }

    for (const [k, v] of Object.entries(systemParams)) {
        computeShaderUpdateOptions.uniforms[k] = { value: v }
        const controller = gui.add(systemParams, k).onChange(updateParams);
        controllers.push(controller);
    }
}

gui.add(parameters, "system", Object.keys(systems)).onChange((system) => {
    init(system as keyof typeof systems);
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
    computeShaderUpdateOptions.uniforms["iterations"] = { value: iterations }
})

gui.add(parameters, "reset")

gui.add(parameters, "showArrows").onChange((showArrows) => {
    arrows.forEach((arrow) => arrow.visible = showArrows)
    if (paused) {
        render()
    }
})

init(parameters.system as keyof typeof systems);

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

    const activeTexture = computeShader.next(computeShaderUpdateOptions)
    computeShaderUpdateOptions.reset = false
    computeShaderUpdateOptions.fragmentShader = undefined
    pointCloud.setUniform('positions', activeTexture.value)

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
