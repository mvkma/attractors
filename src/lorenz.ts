import * as THREE from 'three';
import { RungeKuttaIntegrator, RungeKuttaParams } from "./integration";

export interface LorenzVisualizerParams {
  rungeKuttaParams: RungeKuttaParams,
  radius: number;
  color: THREE.ColorRepresentation;
  count: number;
}

export class LorenzVisualizer {
  private n = 0;

  private readonly integrator;
  private readonly geometry;
  private readonly material;
  private readonly mesh;
  private readonly dummy;
  
  constructor(params: LorenzVisualizerParams) {
    this.geometry = new THREE.SphereGeometry(params.radius);
    this.material = new THREE.MeshPhongMaterial({
      color: params.color,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, params.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();

    this.integrator = new RungeKuttaIntegrator(params.rungeKuttaParams);
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.mesh);
  }

  update() {
    const { x } = this.integrator.next();

    this.dummy.position.set(x[0], x[1], x[2]);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.n % this.mesh.count, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    // this.mesh.computeBoundingSphere();
    this.n += 1;
  }
}
