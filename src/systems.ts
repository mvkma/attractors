const rho = 28;
const sigma = 10;
const beta = 8 / 3;

export function lorenz(_t: number, x: Float32Array, xdot: Float32Array) {
  xdot[0] = sigma * (x[1] - x[0]);
  xdot[1] = x[0] * (rho - x[2]) - x[1];
  xdot[2] = x[0] * x[1] - beta * x[2];
}
