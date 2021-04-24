if (module.hot) {
  module.hot.accept();
}

/**
 * for main overview:
 * https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.321.499&rep=rep1&type=pdf
 *
 * for parameter values and initialization:
 * https://medium.com/swlh/create-your-own-lattice-boltzmann-simulation-with-python-8759e8b53b1c
 *
 * */

const dt = 0.5;
var updated = true;

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

let f_in = new Float64Array(n_x * n_y * n_i).fill(0);
let f_out = new Float64Array(n_x * n_y * n_i).fill(0);

window.f_in = f_in;
window.f_out = f_out;

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

const F = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// const xyi = (x, y, i) => i * n_x * n_y + y * n_x + x;
const xyi = (x, y, i) => i + n_x * n_i * y + n_i * x;

// function init_f() {
//   for (let i = 0; i < n_i; i++) {
//     // for (let i of [0, 1, 2]) {
//     for (let y = Math.round(n_y * 0.25); y < Math.round(n_y * 0.5); y++) {
//       for (let x = Math.round(n_x * 0.2); x < Math.round(n_x * 0.7); x++) {
//         // console.log(xyi(x, y, i));
//         f_out[xyi(x, y, i)] = 0.01;
//         f_in[xyi(x, y, i)] = 0.01;
//       }
//     }
//   }
// }

// flow to the right with some perturbations
function init_flow_right() {
  console.log("flow");
  f_out = f_out.map(() => 1 + 0.01 * (Math.random() - 0.5));
  console.log(f_out);
  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      // i=1 is to the right
      f_out[xyi(x, y, 1)] +=
        2 * (1 + 0.2 * Math.cos(((2 * Math.PI * x) / n_x) * 4));
    }
  }

  for (let y = 0; y < n_y; y++) {
    for (let x = 0; x < n_x; x++) {
      let rho_xy = 0;
      for (let i = 0; i < n_i; i++) {
        rho_xy += f_out[xyi(x, y, i)];
      }
      for (let i = 0; i < n_i; i++) {
        f_out[xyi(x, y, i)] *= rho0 / rho_xy;
      }
    }
  }
  // set f_in to match f_out initially
  f_out.forEach((v, j) => (f_in[j] = v));
}

// function streaming() {
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
//           f_in[xyi(x, y, iOpposite)] = f_out[xyi(x, y, i)];
//         } else {
//           // simple case
//           f_in[xyi(x + e[0], y + e[1], i)] = f_out[xyi(x, y, i)];
//         }
//       }
//     }
//   }
// }

function wrap_index(a, n_a) {
  return a < 0 ? n_a - 1 : a >= n_a ? 0 : a;
}

function streaming_wrap() {
  // streaming not needed for i==0
  for (let i = 1; i < n_i; i++) {
    const e = basis[i];
    const iOpposite = basisOpposite[i];
    for (let y = 0; y < n_y; y++) {
      for (let x = 0; x < n_x; x++) {
        const j = xyi(wrap_index(x + e[0], n_x), wrap_index(y + e[1], n_y), i);
        f_in[j] = f_out[xyi(x, y, i)];
      }
    }
  }
}

function moments(x, y): [number, vect] {
  let v_x = 0;
  let v_y = 0;
  let rho = 0;
  for (let i = 0; i < n_i; i++) {
    const f_i = f_in[xyi(x, y, i)];
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
        const fIn_i = f_in[xyi(x, y, i)];
        const eDotV = dot(e, v);
        const f_eq =
          weights[i] * rho * (1 + 3 * eDotV + 4.5 * eDotV ** 2 - 1.5 * vDotV);
        // f_out[xyi(x, y, i)] = fIn_i - (fIn_i - f_eq) / tau + F[i];
        f_out[xyi(x, y, i)] = fIn_i - (fIn_i - f_eq) / tau;
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
      if (isNaN(rho) || isNaN(v[0]) || isNaN(v[1])) {
        // console.log(x, y);
        imageData.data[image_xyc(x, y, 0)] = Math.round(255);
        imageData.data[image_xyc(x, y, 1)] = Math.round(0);
        imageData.data[image_xyc(x, y, 2)] = Math.round(0);
        imageData.data[image_xyc(x, y, 3)] = Math.round(255);
      } else if (rho < 0) {
        // console.log(x, y);
        imageData.data[image_xyc(x, y, 0)] = Math.round(0);
        imageData.data[image_xyc(x, y, 1)] = Math.round(255);
        imageData.data[image_xyc(x, y, 2)] = Math.round(0);
        imageData.data[image_xyc(x, y, 3)] = Math.round(255);
      } else {
        // assume rho in [0,50], and rescale
        imageData.data[image_xyc(x, y, 3)] = Math.round((rho / 50) * 255);
      }

      // draw cylinder
      if ((x - n_x / 4) ** 2 + (y - n_y / 2) ** 2 < (n_y / 4) ** 2) {
        imageData.data[image_xyc(x, y, 0)] = Math.round(255);
        imageData.data[image_xyc(x, y, 1)] = Math.round(255);
        imageData.data[image_xyc(x, y, 2)] = Math.round(255);
        imageData.data[image_xyc(x, y, 3)] = Math.round(255);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  print_diagnostics();
}

function print_diagnostics() {
  const sum = f_in.reduce((a, b) => a + b, 0);
  mass_div.innerHTML = `<pre>
t: ${t}
sum: ${sum}
max: ${Math.max(...f_in)}
min: ${Math.min(...f_in)}
mean: ${sum / (n_i * n_x * n_y)}
  </pre>`;
}

let t = 0;
export function frame() {
  console.log(f_in);
  console.log(f_out);
  console.log(imageData);
  step();
  draw();
  if (t < 0) {
    requestAnimationFrame(frame);
    console.log(t);
  }
  t++;
}

// init_f();
init_flow_right();

let button_next;
let mass_div;
setTimeout(() => {
  button_next = document.getElementById("button_next");
  button_next.onclick = frame;
  mass_div = document.getElementById("mass");
}, 100);
setTimeout(frame, 150);
// const button_restart = document.getElementById("button_restart");
// button_restart.onclick = init_f;
