import './style.css'

import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { systems } from './systems';
import { ColorMode, PointCloud } from './visualizers';
import Stats from 'stats-gl';
import { buildComputeShader, buildOdeFragmentShader, ComputeShaderUpdateOptions } from './compute-shader';
import { HasEval, mods } from './modulations'
import { buildModParam, newEditor, type Node } from './editor';

const width = 800;
const height = 600;

const scene = new THREE.Scene();
const aspect = width / height;
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

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

const statusElement = document.querySelector('#status')! as HTMLElement

const m = mods({ t: 0, dt: 0.05 })

interface HasEvalParams { [k: string]: HasEval }

interface ColorParams {
    mode?: keyof typeof ColorMode
    map?: string
    scale?: HasEval
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type ViewParams = Overwrite<HasEvalParams, { color?: ColorParams }>

interface UpdateOptions {
    fragmentShader?: string
    reset?: boolean
    modelParams: { [k: string]: HasEval }
    viewParams: ViewParams
}

const updateOptions: UpdateOptions = {
    fragmentShader: undefined,
    reset: false,
    modelParams: {},
    viewParams: {},
}

const computeShader = buildComputeShader({
    width: 256,
    height: 256,
    renderer: renderer,
    fragmentShader: buildOdeFragmentShader(systems["lorenz"]())
})

computeShader.next()

function updateUniforms(text: string) {
    const json = JSON.parse(text) as { [k: string]: Node }

    for (const [key, node] of Object.entries(json)) {
        updateOptions.modelParams[key] = buildModParam(m, node)
    }
}

const modelParamsEditor = newEditor(document.querySelector("#modelParamEditor")!, updateUniforms, 'modelParams', statusElement)

function updateViewParams(text: string) {
    const json = JSON.parse(text) as { [k in keyof ViewParams]: any }

    updateOptions.viewParams = {}
    for (const [key, node] of Object.entries(json)) {
        if (key === 'color') {
            continue
        }
        updateOptions.viewParams[key] = buildModParam(m, node as Node)
    }

    if ('color' in json) {
        updateOptions.viewParams.color = {}

        if ('scale' in json.color) {
            json.color.scale = buildModParam(m, json.color.scale as Node)
        }

        updateOptions.viewParams.color = json.color as ColorParams
    }
}

const viewParamsEditor = newEditor(document.querySelector("#viewParamEditor")!, updateViewParams, 'viewParams', statusElement)

viewParamsEditor.setParams({ iterations: 10 })
updateViewParams(viewParamsEditor.getParams())

function init(system: keyof typeof systems) {
    const odeSystem = systems[system]()

    updateOptions["fragmentShader"] = buildOdeFragmentShader(odeSystem)

    const systemParams = odeSystem.getParameters() as { [k: string]: number }
    modelParamsEditor.setParams(systemParams)
    updateUniforms(modelParamsEditor.getParams())
}

init('lorenz');

const pointCloud = new PointCloud({
    height: 256,
    width: 256,
})

scene.add(pointCloud)

const computeShaderUpdateOptions: ComputeShaderUpdateOptions = {
    uniforms: {}
}

function render() {
    renderer.render(scene, camera)

    stats.update()
}

controls.addEventListener("change", render);


function animate() {
    m.tick()

    if (updateOptions.reset) {
        m.setTime(0)
    }

    computeShaderUpdateOptions.reset = updateOptions.reset
    computeShaderUpdateOptions.fragmentShader = updateOptions.fragmentShader

    for (const [k, func] of Object.entries(updateOptions.modelParams)) {
        computeShaderUpdateOptions.uniforms[k] = { value: func.eval() }
    }

    const iterations = updateOptions.viewParams['iterations'] ?? 1
    computeShaderUpdateOptions.uniforms['iterations'] = { value: iterations.eval() }

    const activeTexture = computeShader.next(computeShaderUpdateOptions)
    updateOptions.reset = false
    updateOptions.fragmentShader = undefined

    pointCloud.setUniform('positions', activeTexture.value)
    pointCloud.setUniform('pointSize', updateOptions.viewParams['pointSize']?.eval() || 1.0)

    if (updateOptions.viewParams['color']) {
        const colorParams = updateOptions.viewParams['color']
        if (colorParams.map) {
            pointCloud.setColorMap(colorParams.map)
        }

        if (colorParams.mode) {
            pointCloud.setColorMode(colorParams.mode)
        }

        pointCloud.setUniform('colorScale', colorParams.scale?.eval() || 1.0)
    }

    pointCloud.scale.x = updateOptions.viewParams['scaleX']?.eval() || 1.0
    pointCloud.scale.y = updateOptions.viewParams['scaleY']?.eval() || 1.0
    pointCloud.scale.z = updateOptions.viewParams['scaleZ']?.eval() || 1.0

    const RAD_PER_DEG = Math.PI / 180.0

    pointCloud.rotation.x = updateOptions.viewParams['rotationX']?.eval() * RAD_PER_DEG || 0.0
    pointCloud.rotation.y = updateOptions.viewParams['rotationY']?.eval() * RAD_PER_DEG || 0.0
    pointCloud.rotation.z = updateOptions.viewParams['rotationZ']?.eval() * RAD_PER_DEG || 0.0

    render();

    if (!paused) {
        requestAnimationFrame(animate);
    }
}

let paused = true;

const pausedButton: HTMLButtonElement = document.querySelector('#button-paused')!

function togglePaused() {
    paused = !paused
    pausedButton.textContent = paused ? 'start' : 'stop'

    if (!paused) {
        animate()
    }
}

pausedButton.addEventListener('click', () => togglePaused())

function toggleArrows(showArrows: boolean) {
    arrows.forEach((arrow) => arrow.visible = showArrows)
    if (paused) {
        render()
    }
}

const fullscreenIcon: HTMLElement = document.querySelector('#fullscreen-icon')!

document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    } else {
        camera.aspect = 800 / 600
        camera.updateProjectionMatrix()
        renderer.setSize(800, 600)
    }
});

fullscreenIcon.addEventListener('click', () => {
    renderer.domElement.requestFullscreen()
})

const arrowCheckbox: HTMLInputElement = document.querySelector('#arrow-checkbox')!
arrowCheckbox.addEventListener('input', () => toggleArrows(arrowCheckbox.checked))

document.querySelector('#button-reset')?.addEventListener('click', (event) => {
    updateOptions.reset = true
    event.preventDefault()
})

const systemSelect: HTMLInputElement = document.querySelector('#system-select')!
systemSelect.addEventListener('input', () => init(systemSelect.value as keyof typeof systems))

function getState() {
    const modelParams = JSON.parse(modelParamsEditor.getParams())
    const viewParams = JSON.parse(viewParamsEditor.getParams())
    const system = systemSelect.value
    const showArrows = arrowCheckbox.checked
    const cameraPosition = camera.position
    const cameraZoom = camera.zoom
    const controlTarget = controls.target

    return {
        modelParams: modelParams,
        viewParams: viewParams,
        system: system,
        showArrows: showArrows,
        cameraPosition: cameraPosition,
        cameraZoom: cameraZoom,
        controlTarget: controlTarget,
    }
}

function loadState(state: { [k: string]: any }) {
    systemSelect.value = state['system']
    init(state['system'] as keyof typeof systems)

    arrowCheckbox.checked = state['showArrows']
    toggleArrows(arrowCheckbox.checked)

    modelParamsEditor.setParams(state['modelParams'])
    viewParamsEditor.setParams(state['viewParams'])

    updateUniforms(modelParamsEditor.getParams())
    updateViewParams(viewParamsEditor.getParams())

    const position = state['cameraPosition']
    const zoom = state['cameraZoom']
    const target = state['controlTarget']

    camera.position.set(position['x'], position['y'], position['z'])
    camera.zoom = zoom
    controls.target.set(target['x'], target['y'], target['z'])
    controls.update()
}

function loadStateFromHash(hash: string) {
    if (hash.length === 0) {
        return
    }

    let state = undefined
    try {
        state = JSON.parse(atob(hash))
    } catch (err) {
        return
    }

    console.log('Loading state from hash.')
    loadState(state)
}

document.querySelector('#button-link')?.addEventListener('click', (event) => {
    const state = getState()
    const encoded = btoa(JSON.stringify(state))
    window.location.hash = encoded
    event.preventDefault()
})

window.addEventListener('hashchange', (event) => {
    const url = new URL(event.newURL)
    loadStateFromHash(url.hash.slice(1))
    event.preventDefault()
})

loadStateFromHash(window.location.hash.slice(1))

controls.update()
