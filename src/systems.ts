export type OdeFunction = (_t: number, x: Float32Array, xdot: Float32Array) => void;

export interface OdeSystem {
  parameters: any;
  shaderChunk: () => string;
  func: OdeFunction;
}

export class LorenzSystem implements OdeSystem {
  private rho: number = 28;
  private sigma: number = 10;
  private beta: number = 8 / 3;

  constructor() {}

  set parameters(params: any) {
    this.sigma = params["sigma"] || this.sigma;
    this.rho = params["rho"] || this.rho;
    this.beta = params["beta"] || this.beta;
  }

  get parameters() {
    return {
      "sigma": this.sigma,
      "rho": this.rho,
      "beta": this.beta,
    };
  }

  shaderChunk() {
    return `
    uniform float sigma;
    uniform float rho;
    uniform float beta;

    vec3 xdot(vec3 x) {
      return vec3(sigma * (x[1] - x[0]), x[0] * (rho - x[2]) - x[1], x[0] * x[1] - beta * x[2]);
    }
    `;
  }

  func(_t: number, x: Float32Array, xdot: Float32Array) {
    xdot[0] = this.sigma * (x[1] - x[0]);
    xdot[1] = x[0] * (this.rho - x[2]) - x[1];
    xdot[2] = x[0] * x[1] - this.beta * x[2];
  }
}

export class RoesslerSystem implements OdeSystem {
  private a: number = 0.1;
  private b: number = 0.1;
  private c: number = 14;

  constructor() {}

  set parameters(params: any) {
    this.a = params["a"] || this.a;
    this.b = params["b"] || this.b;
    this.c = params["c"] || this.c;
  }

  get parameters() {
    return {
      "a": this.a,
      "b": this.b,
      "c": this.c,
    };
  }

  shaderChunk() {
    return `
    uniform float a;
    uniform float b;
    uniform float c;

    vec3 xdot(vec3 x) {
      return vec3(-x[1] - x[2], x[0] + a * x[1], b + x[2] * (x[0] - c));
    }
    `;
  }

  func(_t: number, x: Float32Array, xdot: Float32Array) {
    xdot[0] = -x[1] - x[2];
    xdot[1] = x[0] + this.a * x[1];
    xdot[2] = this.b + x[2] * (x[0] - this.c);
  }
}

export class ThomasSystem implements OdeSystem {
  private b: number = 0.2

  constructor() {}

  set parameters(params: any) {
    this.b = params["b"]
  }

  get parameters() {
    return {
      "b": this.b
    }
  }

  shaderChunk() {
    return `
    uniform float b;

    vec3 xdot(vec3 x) {
      return vec3(sin(x[1]) - b * x[0], sin(x[2]) - b * x[1], sin(x[0]) - b * x[2]);
    }
    `
  }

  func(_t: number, x: Float32Array, xdot: Float32Array) {
    xdot[0] = Math.sin(x[1]) - this.b * x[0]
    xdot[1] = Math.sin(x[2]) - this.b * x[1]
    xdot[2] = Math.sin(x[0]) - this.b * x[2]
  }
}
