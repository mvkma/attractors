import * as THREE from 'three'

export interface LorenzPointsParams {
  renderer: THREE.WebGLRenderer
  width: number
  height: number
}

const vsQuad = `
precision highp sampler2D;
precision highp float;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fsRandom = `
precision highp sampler2D;
precision highp float;

in vec2 vUv;

uniform sampler2D positions;

out vec4 fragColor;

float random(vec2 v) {
  return fract(sin(dot(v.xy, vec2(12.9898,78.233))) * 43758.5453123) * 0.5 + 0.5;
}

void main() {
  vec3 pos = vec3(vUv, random(vUv)) * 100.0 - 50.0;
  fragColor = vec4(pos, 1.0);
}
`

const fsQuad = `
precision highp sampler2D;
precision highp float;

in vec2 vUv;

uniform sampler2D positions;

out vec4 fragColor;

vec3 lorenz(vec3 xyz) {
  float sigma = 10.0;
  float rho = 28.0;
  float beta = 8.0 / 3.0;
  return vec3(sigma * (xyz.y - xyz.x), xyz.x * (rho - xyz.z) - xyz.y, xyz.x * xyz.y - beta * xyz.z);
}

vec3 roessler(vec3 xyz) {
  float a = 0.2;
  float b = 0.2;
  float c = 14.0;
  return vec3(-xyz.y - xyz.z, xyz.x + a * xyz.y, b + xyz.z * (xyz.x - c));
}

void main() {
  vec3 pos = texture(positions, vUv).xyz;
  vec3 xyzDot = lorenz(pos);
  // vec3 xyzDot = roessler(pos);
  fragColor = vec4(pos + 0.001 * xyzDot, 1.0);
}
`

const vsRender = `
precision highp sampler2D;
precision highp float;

uniform sampler2D positions;

void main() {
  vec3 pos = texture(positions, position.xy).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 1.0;
}
`

const fsRender = `
precision highp sampler2D;
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 0.2, 1.0, 0.15);
}
`

export class LorenzPoints extends THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  private readonly renderer: THREE.WebGLRenderer
  private readonly quadScene: THREE.Scene
  private readonly quadCamera: THREE.Camera

  private readonly quadGeometry: THREE.BufferGeometry
  private readonly quadMaterial: THREE.ShaderMaterial
  private readonly quadMesh: THREE.Mesh

  private readonly renderTargets: THREE.WebGLRenderTarget[]

  private readonly width: number
  private readonly height: number

  private activeTarget: number

  constructor(options: LorenzPointsParams) {
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vsRender,
      fragmentShader: fsRender,
      uniforms: {
        positions: { value: null },
      }
    })
    super(new THREE.BufferGeometry(), material)

    this.width = options.width
    this.height = options.height
    this.renderer = options.renderer

    const vertices = new Float32Array(this.width * this.height * 3)
    for (let i = 0; i < this.width * this.height; i++) {
      vertices[3 * i + 0] = (i % this.width) / this.width
      vertices[3 * i + 1] = (i / this.width) / this.height
      vertices[3 * i + 2] = 0
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

    // compute setup
    this.quadScene = new THREE.Scene()
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1,-1, 0, 1);

    this.renderTargets = []
    for (let i = 0; i < 2; i++) {
      const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
      renderTarget.texture.format = THREE.RGBAFormat
      renderTarget.texture.minFilter = THREE.NearestFilter
      renderTarget.texture.magFilter = THREE.NearestFilter
      renderTarget.texture.type = THREE.FloatType
      this.renderTargets.push(renderTarget)
    }

    this.activeTarget = 0

    const quadVertices = new Float32Array([
      -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0
    ])
    const quadUvs = new Float32Array([
      0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0
    ])

    this.quadGeometry = new THREE.BufferGeometry()
    this.quadGeometry.setAttribute('position', new THREE.BufferAttribute(quadVertices, 3))
    this.quadGeometry.setAttribute('uv', new THREE.BufferAttribute(quadUvs, 2))

    this.quadMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vsQuad,
      fragmentShader: fsQuad,
      uniforms: {
        positions: { value: null },
      }
    })

    this.quadMesh = new THREE.Mesh(this.quadGeometry, this.quadMaterial)
    this.quadScene.add(this.quadMesh)

    this.quadMaterial.fragmentShader = fsRandom
    this.quadMaterial.needsUpdate = true
    this.update()
    this.quadMaterial.fragmentShader = fsQuad
    this.quadMaterial.needsUpdate = true
  }

  update() {
    this.renderer.setRenderTarget(this.renderTargets[this.activeTarget])

    this.quadMaterial.uniforms.positions.value = this.renderTargets[1 - this.activeTarget].texture
    this.quadMaterial.uniformsNeedUpdate = true

    this.material.uniforms.positions.value = this.renderTargets[this.activeTarget].texture
    this.material.uniformsNeedUpdate = true

    this.activeTarget = 1 - this.activeTarget

    this.renderer.render(this.quadScene, this.quadCamera)

    this.renderer.setRenderTarget(null)
  }
}
