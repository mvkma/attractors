import * as THREE from 'three'
import { OdeSystem } from './systems'

const U_INPUT_TEXTURE = 'uInputTexture'

const vertexShaderQuad = `
precision highp float;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShaderRandom = `
precision highp float;

in vec2 vUv;

out vec4 fragColor;

float random(vec2 v) {
  return fract(sin(dot(v.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec3 pos = vec3(random(vUv + 5.0), random(vUv - 5.0), random(vUv)) * 100.0 - 50.0;
  // vec3 pos = vec3(vUv, random(vUv)) * 100.0 - 50.0;
  fragColor = vec4(pos, 1.0);
}
`

const fragmentShaderQuad = `
precision highp sampler2D;
precision highp float;

in vec2 vUv;

uniform sampler2D ${U_INPUT_TEXTURE};
uniform float iterations;
uniform float stepSize;

out vec4 fragColor;

<ODE_SYSTEM>

vec3 midPoint(vec3 pos, float h) {
  vec3 posDot = xdot(pos + h / 2.0 * xdot(pos));
  return pos + h * posDot;
}

void main() {
  vec3 pos = texture(${U_INPUT_TEXTURE}, vUv).xyz;

  float i = 0.0;
  while ((i < iterations) && (i < 100.0)) {
    pos = midPoint(pos, stepSize);
    i++;
  }

  fragColor = vec4(pos, length(pos));
}
`

export function buildOdeFragmentShader(system: OdeSystem) {
  const chunk = system.shaderChunk()

  return fragmentShaderQuad.replace('<ODE_SYSTEM>', chunk);
}

export interface ComputeShaderOptions {
  renderer: THREE.WebGLRenderer
  width: number
  height: number
  vertexShader?: string
  fragmentShader: string
  initializationShader?: string
}

export interface ComputeShaderUpdateOptions {
    uniforms: { [k: string]: THREE.IUniform }
    reset?: boolean
    fragmentShader?: string
}

function buildQuadGeometry() {
    const quadVertices = new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0
    ])
    const quadUvs = new Float32Array([
        0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0
    ])

    const quadGeometry = new THREE.BufferGeometry()
    quadGeometry.setAttribute('position', new THREE.BufferAttribute(quadVertices, 3))
    quadGeometry.setAttribute('uv', new THREE.BufferAttribute(quadUvs, 2))

    return quadGeometry
}

function buildRenderTarget(width: number, height: number) {
    const renderTarget = new THREE.WebGLRenderTarget(width, height)

    renderTarget.texture.format = THREE.RGBAFormat
    renderTarget.texture.minFilter = THREE.NearestFilter
    renderTarget.texture.magFilter = THREE.NearestFilter
    renderTarget.texture.type = THREE.FloatType

    return renderTarget
}


export function* buildComputeShader(options: ComputeShaderOptions): Generator<THREE.Texture, void, ComputeShaderUpdateOptions> {
    const initializationShader = options.initializationShader || fragmentShaderRandom

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = options.renderer

    const quadMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: options.vertexShader || vertexShaderQuad,
        fragmentShader: initializationShader,
        uniforms: {
            [U_INPUT_TEXTURE]: { value: null },
            iterations: { value: 1 },
            stepSize: { value: 0.001 },
        }
    })

    const quadGeometry = buildQuadGeometry()
    const quadMesh = new THREE.Mesh(quadGeometry, quadMaterial)

    scene.add(quadMesh)

    const renderTargets: THREE.WebGLRenderTarget[] = []
    for (let i =0; i < 2; i++) {
      const target = buildRenderTarget(options.width, options.height)
      renderTargets.push(target)
    }

    let activeTarget = 0
    let activeInput = 1

    const render = () => {
        const oldTarget = renderer.getRenderTarget()
        const target = renderTargets[activeTarget]
        const input = renderTargets[activeInput]

        quadMaterial.uniforms[U_INPUT_TEXTURE].value = input.texture

        renderer.setRenderTarget(target)
        renderer.render(scene, camera)
        renderer.setRenderTarget(oldTarget)

        activeTarget = 1 - activeTarget
        activeInput = 1 - activeInput

        return target.texture
    }

    const setFragmentShader = (shader: string) => {
        quadMaterial.fragmentShader = shader
        quadMaterial.needsUpdate = true
    }

    const restart = () => {
        const currentShader = quadMaterial.fragmentShader
        setFragmentShader(initializationShader)
        render()
        setFragmentShader(currentShader)
    }

    while (true) {
        const { uniforms, reset, fragmentShader } = yield render()

        if (reset) {
            restart()
            continue
        }

        if (fragmentShader) {
            setFragmentShader(fragmentShader)
        }

        Object.assign(quadMaterial.uniforms, uniforms)
    }
}

