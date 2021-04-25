if (module.hot) {
  module.hot.accept();
}

import { makePlot } from "./canvas";
import { Tensor3 } from "./tensor";

/**
 * for main overview:
 * https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.321.499&rep=rep1&type=pdf
 *
 * for parameter values and initialization:
 * https://medium.com/swlh/create-your-own-lattice-boltzmann-simulation-with-python-8759e8b53b1c
 *
 * */

const canvasWidth = 400;
const canvasHeight = 100;

// var canvas = <HTMLCanvasElement>document.getElementById("canvas");
// var ctx = canvas.getContext("2d");

// canvas.style.width = canvasWidth + "px";
// canvas.style.height = canvasHeight + "px";

// canvas.width = canvasWidth;
// canvas.height = canvasHeight;
// const imageData = ctx.createImageData(canvasWidth, canvasHeight);

type vect = Array<number>;

function dot(a: vect, b: vect): number {
  return a[0] * b[0] + a[1] * b[1];
}

const n_x = canvasWidth;
const n_y = canvasHeight;
const n_i = 9;

let F = new Float64Array(n_x * n_y * n_i).fill(0);
let F_tmp = new Float64Array(n_x * n_y * n_i).fill(0);

let rhoVxVy = new Tensor3([n_x, n_y, 3]);
let vorticity = new Tensor3([n_x, n_y, 1]);

// window.F = F;

const tau = 0.6;
const rho0 = 100;

/**
 * basis vectors
 */
const basis: Array<vect> = [
  [0, 0], // 0
  [1, 0], // 1
  [0, 1], // 2
  [-1, 0], // 3
  [0, -1], // 4
  [1, 1], // 5
  [-1, 1], // 6
  [-1, -1], // 7
  [1, -1], //8
];

const basisOpposite = [0, 3, 4, 1, 2, 7, 8, 5, 6];

const weights = [
  16 / 36,
  4 / 36,
  4 / 36,
  4 / 36,
  4 / 36,
  1 / 36,
  1 / 36,
  1 / 36,
  1 / 36,
];

// const force = [0, 0, 0, 0, 0, 0, 0, 0, 0];

const xyi = (x, y, i) => {
  // if (i > n_i) {
  //   throw new Error("invalid i");
  // }
  // if (x > n_x) {
  //   throw new Error("invalid x");
  // }
  // if (y > n_y) {
  //   throw new Error("invalid y");
  // }
  return i + n_x * n_i * y + n_i * x;
};

function randn_bm() {
  var u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// flow to the right with some perturbations
function init_flow_right() {
  F = F.map(() => 1 + 0.01 * randn_bm());
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      // i=1 is to the right
      F[xyi(x, y, 1)] +=
        2 * (1 + 0.2 * Math.cos(((2 * Math.PI * x) / n_x) * 4));
    }
  }

  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      let rho_xy = 0;
      for (let i = 0; i < n_i; i++) {
        rho_xy += F[xyi(x, y, i)];
      }
      // normalize density to rho0 everywhere
      for (let i = 0; i < n_i; i++) {
        F[xyi(x, y, i)] *= rho0 / rho_xy;
      }
    }
  }
}

function wrap_index(a, n_a) {
  return a < 0 ? n_a - 1 : a >= n_a ? 0 : a;
}

function streaming_wrap() {
  F_tmp = F.slice();
  // streaming not needed for i==0
  for (let i = 1; i < n_i; i++) {
    const e = basis[i];
    for (let y = 0; y < n_y; y++) {
      for (let x = 0; x < n_x; x++) {
        const x_next = x + e[0];
        const y_next = y + e[1];

        let xyi_tnext;
        if (
          (x_next - n_x / 4) ** 2 + (y_next - n_y / 2) ** 2 <
          (n_y / 4) ** 2
        ) {
          // reflect off of cylinder
          xyi_tnext = xyi(x, y, basisOpposite[i]);
        } else {
          xyi_tnext = xyi(
            wrap_index(x + e[0], n_x),
            wrap_index(y + e[1], n_y),
            i
          );
        }
        F[xyi_tnext] = F_tmp[xyi(x, y, i)];
      }
    }
  }
}

function moments(x, y): void {
  let v_x = 0;
  let v_y = 0;
  let rho = 0;
  for (let i = 0; i < n_i; i++) {
    const f_i = F[xyi(x, y, i)];
    rho += f_i;
    v_x += f_i * basis[i][0];
    v_y += f_i * basis[i][1];
  }
  rhoVxVy.set(x, y, 0, rho);
  rhoVxVy.set(x, y, 1, v_x / rho);
  rhoVxVy.set(x, y, 2, v_y / rho);
}

function collision() {
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      moments(x, y);
      const rho = rhoVxVy.get(x, y, 0);
      const v = [rhoVxVy.get(x, y, 1), rhoVxVy.get(x, y, 2)];

      const vDotV = dot(v, v);

      for (let i = 0; i < n_i; i++) {
        const e = basis[i];
        const fIn_i = F[xyi(x, y, i)];
        const eDotV = dot(e, v);
        const f_eq =
          weights[i] * rho * (1 + 3 * eDotV + 4.5 * eDotV ** 2 - 1.5 * vDotV);
        F[xyi(x, y, i)] = fIn_i - (fIn_i - f_eq) / tau;
      }
    }
  }
}

function step() {
  streaming_wrap();
  collision();
}

let vort_min_ever = Infinity;
let vort_max_ever = -Infinity;

function draw() {
  // const { vx_min, vx_max, vy_min, vy_max } = rho_diagnostics();
  vort_min_ever = Math.min(vorticity.min(), vort_min_ever);
  vort_max_ever = Math.max(vorticity.max(), vort_max_ever);

  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const rho = rhoVxVy.get(x, y, 0);
      // const v_x = rhoVxVy.get(x, y, 1);
      // const v_y = rhoVxVy.get(x, y, 2);

      // const vx_plt = (v_x - vx_min) / (vx_max - vx_min);

      // plt2.setR(x, y, 255);
      // plt2.setG(x, y, vx_plt * 255);
      // plt2.setB(x, y, vx_plt * 255);

      // const vy_plt = (v_y - vy_min) / (vy_max - vy_min);

      // plt3.setR(x, y, 255);
      // plt3.setG(x, y, vy_plt * 255);
      // plt3.setB(x, y, vy_plt * 255);

      const vort_plt = vorticity.get(x, y, 0);

      let vort_R = 0;
      let vort_G = 0;
      let vort_B = 0;
      if (vort_plt < 0) {
        vort_R = 255;
        vort_G = 255 * (1 - vort_plt / vort_min_ever);
        vort_B = 255 * (1 - vort_plt / vort_min_ever);
      } else {
        vort_R = 255 * (1 - vort_plt / vort_max_ever);
        vort_G = 255 * (1 - vort_plt / vort_max_ever);
        vort_B = 255;
      }
      plt4.setRGB(x, y, [vort_R, vort_G, vort_B]);

      if (isNaN(rho)) {
        plt1.setRGB(x, y, [0, 0, 255]);
      } else if (rho < 0) {
        plt1.setRGB(x, y, [255, 0, 255]);
      } else {
        plt1.setRGB(x, y, [
          (rho / 200) * 255,
          (rho / 200) * 255,
          (rho / 200) * 255,
        ]);
      }

      // draw cylinder
      if ((x - n_x / 4) ** 2 + (y - n_y / 2) ** 2 < (n_y / 4) ** 2) {
        plt1.setRGB(x, y, [100, 100, 100]);
      }
    }
  }
  // ctx.putImageData(imageData, 0, 0);
  plt1.update();
  // plt2.update();
  // plt3.update();
  plt4.update();
}

function updateVorticity() {
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const vort_xy =
        rhoVxVy.getWrap(x + 1, y, 2) +
        -rhoVxVy.getWrap(x - 1, y, 2) +
        rhoVxVy.getWrap(x, y - 1, 1) +
        -rhoVxVy.getWrap(x, y + 1, 1);
      vorticity.set(x, y, 0, vort_xy);
    }
  }
}

function rho_diagnostics() {
  let rho_sum = 0;
  let rho_max = -Infinity;
  let rho_min = Infinity;

  let vx_max = -Infinity;
  let vx_min = Infinity;

  let vy_max = -Infinity;
  let vy_min = Infinity;
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const rho = rhoVxVy.get(x, y, 0);
      const vx = rhoVxVy.get(x, y, 1);
      const vy = rhoVxVy.get(x, y, 2);
      rho_sum += rho;
      rho_max = Math.max(rho, rho_max);
      rho_min = Math.min(rho, rho_min);

      vx_max = Math.max(vx, vx_max);
      vx_min = Math.min(vx, vx_min);

      vy_max = Math.max(vy, vy_max);
      vy_min = Math.min(vy, vy_min);
    }
  }
  return {
    rho_mean: rho_sum / (n_y * n_x),
    rho_min,
    rho_max,
    vx_max,
    vx_min,
    vy_max,
    vy_min,
  };
}

function rho_diagnostic_str() {
  const { rho_mean, rho_min, rho_max } = rho_diagnostics();
  return `rho_mean: ${rho_mean}
rho_min: ${rho_min}
rho_max: ${rho_max}`;
}

function print_diagnostics() {
  const rho_str = rho_diagnostic_str();
  const sum = F.reduce((a, b) => a + b, 0);
  mass_div.innerHTML = `<pre>
t: ${t}
sum: ${sum}
max: ${Math.max(...F)}
min: ${Math.min(...F)}
mean: ${sum / (n_i * n_x * n_y)}
${rho_str}
  </pre>`;
}

let t = 0;
export function frame() {
  step();
  draw();
  updateVorticity();
  // print_diagnostics();
  // window.F = F;
  // window.rhoVxVy = rhoVxVy
  if (t < 300) {
    requestAnimationFrame(frame);
    console.log(t);
  }
  t++;
}

// init_f();
init_flow_right();

let button_next;
let mass_div;

document.getElementById("more_plots").innerHTML = "";
const plt1 = makePlot(canvasWidth, canvasHeight, "more_plots");
// const plt2 = makePlot(canvasWidth, canvasHeight, "more_plots");
// const plt3 = makePlot(canvasWidth, canvasHeight, "more_plots");
const plt4 = makePlot(canvasWidth, canvasHeight, "more_plots");

setTimeout(() => {
  button_next = document.getElementById("button_next");
  button_next.onclick = frame;
  mass_div = document.getElementById("mass");
}, 100);
setTimeout(frame, 150);
// const button_restart = document.getElementById("button_restart");
// button_restart.onclick = init_f;
