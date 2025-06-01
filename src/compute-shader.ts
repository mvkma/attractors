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

export class ComputeShader {
  private readonly renderTargets: THREE.WebGLRenderTarget[]
  private readonly renderer: THREE.WebGLRenderer
  private readonly material: THREE.ShaderMaterial
  private readonly scene: THREE.Scene
  private readonly camera: THREE.Camera

  private activeTarget: number
  private activeInput: number

  constructor(options: ComputeShaderOptions) {
    const quadMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: options.vertexShader || vertexShaderQuad,
      fragmentShader: options.initializationShader || fragmentShaderRandom,
      uniforms: {
        [U_INPUT_TEXTURE]: { value: null },
        iterations: { value: 1 },
        stepSize: { value: 0.001 },
      }
    })

    const quadGeometry = this.buildQuadGeometry()
    const quadMesh = new THREE.Mesh(quadGeometry, quadMaterial)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1,-1, 0, 1);
    this.material = quadMaterial
    this.renderer = options.renderer
    this.activeTarget = 0
    this.activeInput = 1
    this.renderTargets = []
    for (let i =0; i < 2; i++) {
      const target = this.buildRenderTarget(options.width, options.height)
      this.renderTargets.push(target)
    }

    this.scene.add(quadMesh)

    // render with initialization shader
    this.update()

    // set fragment shader and recompile
    this.setFragmentShader(options.fragmentShader)
  }

  private buildRenderTarget(width: number, height: number) {
    const renderTarget = new THREE.WebGLRenderTarget(width, height)

    renderTarget.texture.format = THREE.RGBAFormat
    renderTarget.texture.minFilter = THREE.NearestFilter
    renderTarget.texture.magFilter = THREE.NearestFilter
    renderTarget.texture.type = THREE.FloatType

    return renderTarget
  }

  private buildQuadGeometry() {
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

  setFragmentShader(shader: string) {
    this.material.fragmentShader = shader
    this.material.needsUpdate = true
  }

  update() {
    const oldTarget = this.renderer.getRenderTarget()
    const target = this.renderTargets[this.activeTarget]
    const input = this.renderTargets[this.activeInput]

    this.material.uniforms[U_INPUT_TEXTURE].value = input.texture

    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(oldTarget)

    this.activeTarget = 1 - this.activeTarget
    this.activeInput = 1 - this.activeInput

    return target.texture
  }

  setUniform<TValue = any>(key: string, value: TValue) {
    this.material.uniforms[key] = { value: value }
  }
}
