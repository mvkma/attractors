import * as THREE from 'three';
import { ColorMap } from './colormap';

interface ColorOptionsConstant {
  type: "constant";
  color: THREE.ColorRepresentation;
}

interface ColorOptionsColormap {
  type: "colormap";
  colormap: ColorMap;
}

export type ColorOptions = ColorOptionsConstant | ColorOptionsColormap;

const vertexShaderPointCloud = `
precision highp sampler2D;
precision highp float;

uniform sampler2D positions;

out vec3 color;

void main() {
  vec4 pos = texture(positions, position.xy).xyzw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_PointSize = 1.0;

  float alpha = pos.w / 250.0;
  // color = vec3(alpha, 1.0 - alpha, 0.3);
  color = abs(normalize(pos.xyz));
}
`

const fragmentShaderPointCloud = `
precision highp sampler2D;
precision highp float;

in vec3 color;

out vec4 fragColor;

void main() {
  fragColor = vec4(color, 1.0);
}
`

export interface PointCloudOptions {
  width: number
  height: number
}

export class PointCloud extends THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  constructor(options: PointCloudOptions) {
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vertexShaderPointCloud,
      fragmentShader: fragmentShaderPointCloud,
      uniforms: {
        positions: { value: null }
      }
    })

    super(new THREE.BufferGeometry(), material)

    const vertices = new Float32Array(options.width * options.height * 3)
    for (let i = 0; i < options.width * options.height; i++) {
      vertices[3 * i + 0] = (i % options.width) / options.width
      vertices[3 * i + 1] = (i / options.width) / options.height
      vertices[3 * i + 2] = 0
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  }

  setUniform<TValue = any>(key: string, value: TValue) {
    this.material.uniforms[key] = { value: value }
  }
}
