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
