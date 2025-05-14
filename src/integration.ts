import type { OdeFunction } from "./systems";

export interface RungeKuttaParams {
  f: OdeFunction;
  x0: Float32Array;
  t0: number;
  dt: number;
  eps: number;
}

export class RungeKuttaIntegrator {
  private t: number;
  private h: number;

  private readonly dims: number;
  private readonly eps: number;
  private readonly f: OdeFunction;
  private readonly x: Float32Array;
  private readonly xdot: Float32Array;
  private readonly tmp: Float32Array;
  private readonly err: Float32Array;
  private readonly ks: Float32Array[];
  private readonly nstages: number;

  static tab = {
    A: new Float32Array([0, 1 / 4, 3 / 8, 12 / 13, 1, 1 / 2]),
    B: new Float32Array([
      0, 0, 0, 0, 0,
      1 / 4, 0, 0, 0, 0,
      3 / 32, 9 / 32, 0, 0, 0,
      1932 / 2197, -7200 / 2197, 7296 / 2197, 0, 0,
      439 / 216, -8, 3680 / 513, -845 / 4104, 0,
      -8 / 27, 2, -3544 / 2565, 1859 / 4104, -11 / 40
    ]),
    CH: new Float32Array([16 / 135, 0, 6656 / 12825, 28561 / 56430, -9 / 50, 2 / 55]),
    CT: new Float32Array([-1 / 360, 0, 128 / 4275, 2197 / 75240, -1 / 50, -2 / 55]),
  };

  constructor(params: RungeKuttaParams) {
    this.t = params.t0;
    this.f = params.f;
    this.h = params.dt;
    this.x = params.x0.slice()
    this.eps = params.eps;
    this.nstages = 6;

    this.dims = this.x.length;
    this.xdot = new Float32Array(this.dims);
    this.f(this.t, this.x, this.xdot);

    this.ks = [];
    for (let i = 0; i < this.nstages; i++) {
      this.ks.push(new Float32Array(this.dims));
    }

    this.tmp = new Float32Array(this.dims);
    this.err = new Float32Array(this.dims);
  }

  next(): { t: number; x: Float32Array } {
    for (let k = 0; k < this.nstages; k++) {
      this.tmp.set(this.x);
      for (let l = 0; l < k; l++) {
        for (let i = 0; i < this.dims; i++) {
          this.tmp[i] += this.h * RungeKuttaIntegrator.tab.B[k * 5 + l] * this.ks[l][i];
        }
      }
      this.f(this.t + this.h * RungeKuttaIntegrator.tab.A[k], this.tmp, this.ks[k]);
    }

    this.err.fill(0);
    this.tmp.set(this.x);
    for (let k = 0; k < this.nstages; k++) {
      for (let i = 0; i < this.dims; i++) {
        this.tmp[i] += this.h * RungeKuttaIntegrator.tab.CH[k] * this.ks[k][i];
        this.err[i] += this.h * RungeKuttaIntegrator.tab.CT[k] * this.ks[k][i];
      }
    }

    const te = Math.sqrt(this.err.reduce((mag, v) => mag + v * v, 0))
    const hn = Math.pow(this.eps / te, 0.2) * this.h * 0.9;

    if (te > this.eps) {
      this.h = hn;
      return this.next();
    }

    this.t += this.h;
    this.h = hn;
    this.x.set(this.tmp);

    return this.state();
  }

  state() {
    return {
      t: this.t,
      x: this.x,
    };
  }
}

