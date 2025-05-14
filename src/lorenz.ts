import * as THREE from 'three';
import { RungeKuttaIntegrator, RungeKuttaParams } from "./integration";

export interface LorenzVisualizerParams {
  rungeKuttaParams: RungeKuttaParams,
  radius: number;
  color: THREE.ColorRepresentation;
  count: number;
}

export class LorenzVisualizer extends THREE.InstancedMesh {
  private n = 0;

  private readonly integrator;
  private readonly dummy;
  
  constructor(params: LorenzVisualizerParams) {
    const geometry = new THREE.SphereGeometry(params.radius);
    const material = new THREE.MeshPhongMaterial({
      color: params.color,
      emissive: params.color,
      emissiveIntensity: 0.3,
    });

    super(geometry, material, params.count);

    this.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();

    this.integrator = new RungeKuttaIntegrator(params.rungeKuttaParams);
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
