import * as THREE from 'three';
import { RungeKuttaIntegrator } from '../../../code/attractors/src/integration';

export interface SphereParams {
  integrator: RungeKuttaIntegrator,
  radius: number;
  color: THREE.ColorRepresentation;
  count: number;
}

const IDENTITY = new THREE.Matrix4();

export class Spheres extends THREE.InstancedMesh {
  private n = 0;

  private readonly integrator;
  private readonly maxCount;
  private readonly dummy;
  
  constructor(params: SphereParams) {
    const geometry = new THREE.SphereGeometry(params.radius);
    const material = new THREE.MeshPhongMaterial({
      color: params.color,
      emissive: params.color,
      emissiveIntensity: 0.3,
    });

    super(geometry, material, params.count);
    this.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();
    this.integrator = params.integrator;
    this.maxCount = params.count;
  }

  setCount(count: number) {
    for (let i = this.count; i < count; i++) {
      this.setMatrixAt(i, IDENTITY);
    }
    this.count = THREE.MathUtils.clamp(count, 0, this.maxCount);
    this.instanceMatrix.needsUpdate = true;
  }

  setColor(color: THREE.ColorRepresentation) {
    this.material.color = color;
    this.material.emissive = color;
  }

  update() {
    const { x } = this.integrator.next();

    this.dummy.position.set(x[0], x[1], x[2]);
    this.dummy.updateMatrix();
    this.setMatrixAt(this.n % this.count, this.dummy.matrix);
    this.instanceMatrix.needsUpdate = true;
    this.n += 1;
  }
}
