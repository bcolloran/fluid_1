if (module.hot) {
  module.hot.accept();
}

import { makePlot } from "./canvas";

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

var canvas = <HTMLCanvasElement>document.getElementById("canvas");
var ctx = canvas.getContext("2d");

canvas.style.width = canvasWidth + "px";
canvas.style.height = canvasHeight + "px";

canvas.width = canvasWidth;
canvas.height = canvasHeight;
const imageData = ctx.createImageData(canvasWidth, canvasHeight);

type vect = Array<number>;

function dot(a: vect, b: vect): number {
  return a[0] * b[0] + a[1] * b[1];
}

const n_x = canvasWidth;
const n_y = canvasHeight;
const n_i = 9;

let F = new Float64Array(n_x * n_y * n_i).fill(0);
let F_tmp = new Float64Array(n_x * n_y * n_i).fill(0);

let rhoVxVy = new Float64Array(n_x * n_y * 3).fill(0);

window.F = F;

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

// const xyi = (x, y, i) => i * n_x * n_y + y * n_x + x;
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

// window.xyi = xyi;

// function init_f() {
//   for (let i = 0; i < n_i; i++) {
//     // for (let i of [0, 1, 2]) {
//     for (let y = Math.round(n_y * 0.25); y < Math.round(n_y * 0.5); y++) {
//       for (let x = Math.round(n_x * 0.2); x < Math.round(n_x * 0.7); x++) {
//         // console.log(xyi(x, y, i));
//         F[xyi(x, y, i)] = 0.01;
//       }
//     }
//   }
// }

function randn_bm() {
  var u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// flow to the right with some perturbations
function init_flow_right() {
  console.log("flow");
  F = F.map(() => 1 + 0.01 *randn_bm();
  console.log(F);
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

  // // set flows in cylinder to NaN
  // for (let y = 0; y < n_y; y++) {
  //   for (let x = 0; x < n_x; x++) {
  //     for (let i = 0; i < n_i; i++) {
  //       if ((x - n_x / 4) ** 2 + (y - n_y / 2) ** 2 < (n_y / 4) ** 2) {
  //         F[xyi(x, y, i)] = NaN;
  //       }
  //     }
  //   }
  // }
}

// function streaming() {
//   F_tmp = F.slice();
//   // streaming not needed for i==0
//   for (let i = 1; i < n_i; i++) {
//     const e = basis[i];
//     const iOpposite = basisOpposite[i];
//     for (let y = 0; y < n_y; y++) {
//       for (let x = 0; x < n_x; x++) {
//         if (
//           x + e[0] >= n_x ||
//           x + e[0] < 0 ||
//           y + e[1] >= n_y ||
//           y + e[1] < 0
//         ) {
//           // in these cases, reflect
//           F[xyi(x, y, iOpposite)] = F_tmp[xyi(x, y, i)];
//         } else {
//           // simple case
//           F[xyi(x + e[0], y + e[1], i)] = F_tmp[xyi(x, y, i)];
//         }
//       }
//     }
//   }
// }

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
        if ((x_next - n_x / 4) ** 2 + (y_next - n_y / 2) ** 2 < (n_y / 4) ** 2) {
          // reflect off of cylinder
          const xyi_tnext = xyi(x, y, basisOpposite[i]);
        } else {
          const xyi_tnext = xyi(
            wrap_index(x + e[0], n_x),
            wrap_index(y + e[1], n_y),
            i
          );
          F[xyi_tnext] = F_tmp[xyi(x, y, i)];
        }
      }
    }
  }
}

function moments(x, y): [number, vect] {
  let v_x = 0;
  let v_y = 0;
  let rho = 0;
  for (let i = 0; i < n_i; i++) {
    const f_i = F[xyi(x, y, i)];
    rho += f_i;
    v_x += f_i * basis[i][0];
    v_y += f_i * basis[i][1];
  }
  return rho === 0 ? [0, [0, 0]] : [rho, [v_x / rho, v_y / rho]];
  
}

// function f_eq(rho,v,i){
//   const eDotV = dot(basis[i],v)
//   const vDotV = dot(v,v)
//   return weights[i]*rho *(1+3*eDotV +4.5*eDotV**2 - 1.5*vDotV)
// }

function collision() {
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const [rho, v] = moments(x, y);
      const vDotV = dot(v, v);

      for (let i = 0; i < n_i; i++) {
        const e = basis[i];
        const fIn_i = F[xyi(x, y, i)];
        const eDotV = dot(e, v);
        const f_eq =
          weights[i] * rho * (1 + 3 * eDotV + 4.5 * eDotV ** 2 - 1.5 * vDotV);
        // F[xyi(x, y, i)] = fIn_i - (fIn_i - f_eq) / tau + F[i];
        F[xyi(x, y, i)] = fIn_i - (fIn_i - f_eq) / tau;
      }
    }
  }
}

function step() {
  streaming_wrap();
  collision();
}

const image_xyc = (x, y, c) => x * 4 + y * (canvasWidth * 4) + c;

function draw() {
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const [rho, v] = moments(x, y);
      plt2.setA(x, y, 255);

      plt2.setR(x, y, F[xyi(x, y, 1)] * 10);
      plt2.setG(x, y, 0);
      plt2.setB(x, y, 0);
      // plt2.setR(x, y, (v[0] / 1) * 255);
      // plt2.setB(x, y, (v[1] / 1) * 255);

      if (isNaN(rho) || isNaN(v[0]) || isNaN(v[1])) {
        // console.log(x, y);
        imageData.data[image_xyc(x, y, 0)] = 255;
        imageData.data[image_xyc(x, y, 1)] = 0;
        imageData.data[image_xyc(x, y, 2)] = 0;
        imageData.data[image_xyc(x, y, 3)] = 255;
      } else if (rho < 0) {
        // console.log(x, y);
        imageData.data[image_xyc(x, y, 0)] = 0;
        imageData.data[image_xyc(x, y, 1)] = 255;
        imageData.data[image_xyc(x, y, 2)] = 0;
        imageData.data[image_xyc(x, y, 3)] = 255;
      } else {
        // assume rho in [0,200], and rescale
        imageData.data[image_xyc(x, y, 3)] = (rho / 200) * 255;
      }

      // draw cylinder
      if ((x - n_x / 4) ** 2 + (y - n_y / 2) ** 2 < (n_y / 4) ** 2) {
        imageData.data[image_xyc(x, y, 0)] = 255;
        imageData.data[image_xyc(x, y, 1)] = 255;
        imageData.data[image_xyc(x, y, 2)] = 255;
        imageData.data[image_xyc(x, y, 3)] = 255;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  plt2.update();
  print_diagnostics();
}

function rho_diagnostics() {
  let rho_sum = 0;
  let rho_max = -Infinity;
  let rho_min = Infinity;
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      const [rho, v] = moments(x, y);
      rho_sum += rho;
      rho_max = Math.max(rho, rho_max);
      rho_min = Math.min(rho, rho_min);
    }
  }
  return [rho_sum / (n_y * n_x), rho_min, rho_max];
}

function print_diagnostics() {
  const [rho_mean, rho_min, rho_max] = rho_diagnostics();
  const sum = F.reduce((a, b) => a + b, 0);
  mass_div.innerHTML = `<pre>
t: ${t}
sum: ${sum}
max: ${Math.max(...F)}
min: ${Math.min(...F)}
mean: ${sum / (n_i * n_x * n_y)}
rho_mean: ${rho_mean}
rho_min: ${rho_min}
rho_max: ${rho_max}
  </pre>`;
}

let t = 0;
export function frame() {
  // console.log(F);
  // console.log(imageData);
  step();
  draw();
  window.F = F;
  if (t < 1100) {
    requestAnimationFrame(frame);
    // console.log(t);
  }
  t++;
}

// init_f();
init_flow_right();

let button_next;
let mass_div;

document.getElementById("more_plots").innerHTML = "";
const plt2 = makePlot(canvasWidth, canvasHeight, "more_plots");

setTimeout(() => {
  button_next = document.getElementById("button_next");
  button_next.onclick = frame;
  mass_div = document.getElementById("mass");
}, 100);
setTimeout(frame, 150);
// const button_restart = document.getElementById("button_restart");
// button_restart.onclick = init_f;
