export type OdeFunction = (_t: number, x: Float32Array, xdot: Float32Array) => void;

export interface OdeSystem {
    getParameters: () => { [k: string]: number }
    setParameters: (params: { [k: string]: number }) => void
    shaderChunk: () => string;
    func: OdeFunction;
}

type LorenzSystemParams = typeof LorenzSystem.defaults

export class LorenzSystem implements OdeSystem {
    static defaults = {
        rho: 28,
        sigma: 10,
        beta: 8 / 3,
    }

    private rho: number = LorenzSystem.defaults.rho
    private sigma: number = LorenzSystem.defaults.sigma
    private beta: number = LorenzSystem.defaults.beta

    constructor() {}

    setParameters(params: Partial<LorenzSystemParams>) {
        Object.assign(this, params)
    }

    getParameters(): LorenzSystemParams {
        return {
            rho: this.rho,
            sigma: this.sigma,
            beta: this.beta,
        }
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

type RoesslerSystemParams = typeof RoesslerSystem.defaults

export class RoesslerSystem implements OdeSystem {
    static defaults = {
        a: 0.1,
        b: 0.1,
        c: 14,
    }

    private a: number = RoesslerSystem.defaults.a
    private b: number = RoesslerSystem.defaults.b
    private c: number = RoesslerSystem.defaults.c

    constructor() {}

    setParameters(params: Partial<RoesslerSystemParams>) {
        Object.assign(this, params)
    }

    getParameters(): RoesslerSystemParams {
        return {
            a: this.a,
            b: this.b,
            c: this.c,
        }
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

type ThomasSystemParams = typeof ThomasSystem.defaults

export class ThomasSystem implements OdeSystem {
    static defaults = {
        b: 0.2,
    }

    private b: number = ThomasSystem.defaults.b

    constructor() {}

    setParameters(params: Partial<ThomasSystemParams>) {
        Object.assign(this, params)
    }

    getParameters(): ThomasSystemParams {
        return {
            b: this.b,
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
