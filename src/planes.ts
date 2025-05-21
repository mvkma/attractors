import * as THREE from 'three';

export interface PlanesOptions {
  width?: number;
  height?: number;
  color?: THREE.ColorRepresentation;
}

export class Planes extends THREE.Group {
  constructor(options: PlanesOptions) {
    super();

    const geometry = new THREE.PlaneGeometry(
      options.height ?? 1,
      options.width ?? 1,
    );

    const meshMaterial = new THREE.MeshPhongMaterial({
      color: options.color ?? 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.5,
    });

    const xyMesh = new THREE.Mesh(geometry, meshMaterial);
    const yzMesh = new THREE.Mesh(geometry, meshMaterial);
    const zxMesh = new THREE.Mesh(geometry, meshMaterial);

    yzMesh.rotateY(Math.PI / 2);
    zxMesh.rotateX(Math.PI / 2);

    const xyGrid = new THREE.LineLoop(geometry, lineMaterial);
    const yzGrid = new THREE.LineLoop(geometry, lineMaterial);
    const zxGrid = new THREE.LineLoop(geometry, lineMaterial);

    yzGrid.rotateY(Math.PI / 2);
    zxGrid.rotateX(Math.PI / 2);

    this.add(xyGrid, yzGrid, zxGrid);
    this.add(xyMesh, yzMesh, zxMesh);
  }
}
