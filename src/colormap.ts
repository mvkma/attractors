
import * as THREE from 'three';

export interface ColorMapOptions {
  colors: THREE.ColorRepresentation[];
  repeat?: boolean;
}

export class ColorMap {
  readonly colors: THREE.Color[];
  readonly count: number;

  repeat: boolean;
  
  constructor(options: ColorMapOptions) {
    this.colors = options.colors.map((c) => new THREE.Color(c));
    this.count = this.colors.length;
    this.repeat = options.repeat ?? false;
  }

  sample(n: number) {
    let ix = Math.floor(n * this.count);

    if (this.repeat) {
      ix = ix % this.count;
    } else {
      ix = Math.min(Math.max(0, ix), this.count);
    }

    return this.colors[ix];
  }
}
