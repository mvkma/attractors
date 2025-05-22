import * as THREE from 'three';
import { RungeKuttaIntegrator } from '../../../code/attractors/src/integration';
import { ColorMap } from './colormap';

interface ColorOptionsConstant {
  type: "constant";
  color: THREE.ColorRepresentation;
}

interface ColorOptionsColormap {
  type: "colormap";
  colormap: ColorMap;
}

type ColorOptions = ColorOptionsConstant | ColorOptionsColormap;

export interface SphereParams {
  integrator: RungeKuttaIntegrator,
  radius: number;
  count: number;
  colorOptions: ColorOptions;
}

const IDENTITY = new THREE.Matrix4();

export class Spheres extends THREE.InstancedMesh {
  private n = 0;

  private colorOpts: ColorOptions;

  private readonly integrator;
  private readonly maxCount;
  private readonly dummy;
  
  constructor(params: SphereParams) {
    const geometry = new THREE.SphereGeometry(params.radius);

    const colorOpts = params.colorOptions;
    const materialOptions: THREE.MeshPhongMaterialParameters = {
    };

    switch (colorOpts.type) {
      case "constant":
        materialOptions.color = colorOpts.color;
        materialOptions.emissive = colorOpts.color;
        materialOptions.emissiveIntensity = 0.3;
        break;
    }

    const material = new THREE.MeshPhongMaterial(materialOptions);

    super(geometry, material, params.count);
    this.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();
    this.integrator = params.integrator;
    this.maxCount = params.count;
    this.colorOpts = params.colorOptions;
    this.castShadow = true;
  }

  setCount(count: number) {
    for (let i = this.count; i < count; i++) {
      this.setMatrixAt(i, IDENTITY);
    }
    this.count = THREE.MathUtils.clamp(count, 0, this.maxCount);
    this.instanceMatrix.needsUpdate = true;
  }

  get colorOptions() {
    return this.colorOpts;
  }

  set colorOptions(colorOptions: ColorOptions) {
    this.colorOpts = colorOptions;

    if (this.colorOpts.type === "constant") {
      this.material.color = this.colorOpts.color;
      this.material.emissive = this.colorOpts.color;
    }
  }

  update() {
    const { x } = this.integrator.next();

    const n = this.n % this.count;

    this.dummy.position.set(x[0], x[1], x[2]);
    this.dummy.updateMatrix();

    this.setMatrixAt(n, this.dummy.matrix);
    this.instanceMatrix.needsUpdate = true;

    if (this.colorOptions.type === "colormap") {
      this.setColorAt(n, this.colorOptions.colormap.sample(n / this.count * 2));
      if (this.instanceColor) {
        this.instanceColor.needsUpdate = true;
      }
    }

    this.n += 1;
  }
}

export interface TracesParams {
  integrator: RungeKuttaIntegrator;
  count: number;
  colorOptions: ColorOptions;
}

export class Traces extends THREE.Line {
  private n = 0;

  private colorOpts: ColorOptions;

  private points: Float32Array;
  private positions: THREE.BufferAttribute;
  private readonly integrator;

  constructor(params: TracesParams) {
    const geometry = new THREE.BufferGeometry()

    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 5,
    });

    super(geometry, material);

    this.integrator = params.integrator;
    this.colorOpts = params.colorOptions;
    this.points = new Float32Array(params.count * 3);
    this.positions = new THREE.BufferAttribute(this.points, 3);

    this.geometry.setAttribute("position", this.positions);
  }

  setCount(count: number) {
    const points = new Float32Array(count * 3);
    points.set(this.points.slice(0, count * 3))
    this.points = points;
    this.positions = new THREE.BufferAttribute(this.points, 3);
    this.geometry.setAttribute("position", this.positions);
  }

  get colorOptions() {
    return this.colorOpts;
  }

  set colorOptions(colorOptions: ColorOptions) {
    this.colorOpts = colorOptions;
  }

  update() {
    const { x } = this.integrator.next()

    const stride = (3 * this.n);

    if (stride > this.points.length) {
      this.points.set(this.points.slice(3));
      this.points[this.points.length - 3] = x[0];
      this.points[this.points.length - 2] = x[1];
      this.points[this.points.length - 1] = x[2];
    } else {
      this.points[stride + 0] = x[0];
      this.points[stride + 1] = x[1];
      this.points[stride + 2] = x[2];
    }

    this.positions.needsUpdate = true;

    this.n += 1
  }
}
