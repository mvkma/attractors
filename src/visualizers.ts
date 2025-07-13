import * as THREE from 'three';
import { ColorMap } from './colormap';
import colormaps from './colormaps';

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
uniform sampler2D colormaps;
uniform float pointSize;
uniform float colorIndex;
uniform float colorMode;
uniform float colorScale;

out vec3 color;

void main() {
  vec4 pos = texture(positions, position.xy).xyzw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.xyz, 1.0);
  gl_PointSize = pointSize;

  if (colorMode == 0.0) {
    color = abs(normalize(pos.xyz));
  } else {
    float alpha = pos.w * colorScale;
    color = texture(colormaps, vec2(alpha, colorIndex)).rgb;
  }
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

function createColorTexture() {
    const resolution = 256;
    const data = new Uint8Array(4 * resolution * colormaps.size)

    let i = 0;
    for (const k of colormaps.keys()) {
        const colorData = colormaps.get(k)!.toUint8Array(resolution)
        data.set(colorData, i * colorData.length)
        i++;
    }

    const texture = new THREE.DataTexture(data, resolution, colormaps.size)
    texture.format = THREE.RGBAFormat
    texture.type = THREE.UnsignedByteType
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    texture.needsUpdate = true

    return texture
}

export class PointCloud extends THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  constructor(options: PointCloudOptions) {
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vertexShaderPointCloud,
      fragmentShader: fragmentShaderPointCloud,
      uniforms: {
          positions: { value: null },
          pointSize: { value: 1.0 },
          colormaps: { value: createColorTexture() },
          colorIndex: { value: 0.0 },
          colorMode: { value: 0.0 },
          colorScale: { value: 1.0 },
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
