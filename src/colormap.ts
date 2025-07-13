
import * as THREE from 'three';

export interface ColorMapOptions {
  colors: THREE.ColorRepresentation[];
  repeat?: boolean;
  mirror?: boolean;
}

export class ColorMap {
  readonly colors: THREE.Color[];
  readonly count: number;

  repeat: boolean;
  mirror: boolean;

  constructor(options: ColorMapOptions) {
    this.colors = options.colors.map((c) => new THREE.Color(c));
    this.count = this.colors.length;
    this.repeat = options.repeat ?? false;
    this.mirror = options.mirror ?? false;
  }

  sample(n: number) {
    let ix = Math.floor(n * this.count);

    if (this.repeat) {
      ix = ix % this.count;
    } else if (this.mirror) {
      ix = ix % (2 * this.count);
      ix = ix < this.count ? ix : 2 * this.count - ix - 1;
    } else {
      ix = Math.min(Math.max(0, ix), this.count);
    }

    return this.colors[ix];
  }

  toUint8Array(resolution?: number) {
    const count = resolution || this.colors.length
    const data = new Uint8Array(4 * count)

    for (let i = 0; i < count; i++) {
      const color = this.sample(i / count)
      data[4 * i + 0] = color.r * 255
      data[4 * i + 1] = color.g * 255
      data[4 * i + 2] = color.b * 255
      data[4 * i + 3] = 255
    }

    return data
  }
}
