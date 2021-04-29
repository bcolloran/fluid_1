// from khan academy:
// https://www.khanacademy.org/computer-programming/smoothed-particle-hydrodynamics/5056836848

import { initCtx } from "./canvas";
import { SpatialHashGridNaive, findDupes } from "./spatial-hasher";

// Implementation of sph as described in
//    Muller, et al, Particle-based fluid simulation
// Adapted for 2D in
//    http://www.cs.cornell.edu/~bindel/class/cs5220-f11/code/sph.pdf

// Number of particles
let N = 1000;
// let x:Float64Array
// lety:Float64Array, vx:Float64Array, vy, vhx, vhy, ax, ay, rho;

let h = 0.016; // Particle radius
let h2 = h ** 2; // Radius squared
let h4 = h ** 4; // Radius to the 4
let h8 = h ** 8; // Radius to the 8

// Resistance to compression
// speed of sound = sqrt(k / rho0)
let k = 30; // Bulk modulus (1000)

const gravity = -9.8; // Gravity
const mu = 3; // Viscosity (0.1)
const rho0 = 1000; // Reference density
const rho02 = rho0 * 2;
// let dt = 18e-4; // Time step in seconds
let dt = 0.0018; // Time step in seconds
const dt2 = dt / 2; // Half time step in seconds
const restitution = 0.95; // Coefficient of restituion for boundary
const PI = Math.PI;

let Cp = 15 * k;
let Cv = -40 * mu;
let C0, C1, C2;

const height = 800;
const width = 800;

document.getElementById("more_plots").innerHTML = "";
const plt1 = initCtx(height, width, "more_plots");

const edge1 = h * 0.5;
const edge2 = 1 - edge1;
const edge3 = height / width - edge1;

let mass;
let _scale = width;
let diameter = h * _scale * 0.85;
let i, j;

// const initialiseArrays = function () {
let x = new Float64Array(N); // Positions
let y = new Float64Array(N);
let vx = new Float64Array(N); // Velocities
let vy = new Float64Array(N);
let vhx = new Float64Array(N); // Half step velocities
let vhy = new Float64Array(N);
let ax = new Float64Array(N); // Accelerations
let ay = new Float64Array(N);
let rho = new Float64Array(N); // Densities
// };

let hashGrid = new SpatialHashGridNaive(2 * h, 4 * N);

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const sfcRandom = sfc32(1, 2, 3, 44);
const random = (a, b) => sfcRandom() * (b - a) + a;

let randomInit = function () {
  for (i = N; i--; ) {
    // Initialize particle positions
    x[i] = random(h, 0.25);
    y[i] = random(0.5, 0.95);

    // Initialize particle velocities
    vx[i] = random(-0.02, 0.02);
    vy[i] = random(-0.02, 0.02);
  }
};

let particlesInMesh = function (y1, y2) {
  let xp = h * 0.5 + 0.01;
  let yp = y1;
  let r = h;

  for (i = 0; i < N; i++) {
    // Initialize particle positions
    x[i] = xp;
    y[i] = yp;
    hashGrid.addPoint(i, xp, yp);
    yp += r;

    if (yp > y2) {
      yp = y1;
      xp += r;
    }

    // Initialize particle velocities
    vx[i] = random(-0.02, 0.02);
    vy[i] = random(-0.02, 0.02);
  }
  let dupes = findDupes(hashGrid);
  if (dupes.length > 0) {
    throw new Error("dupes in hash grid - particlesInMesh");
  }
};

let computeDensities = function () {
  // Find new densities
  let dx, dy, r2, z, rho_ij;
  let C1 = (4 * mass) / (PI * h2);
  let C2 = (4 * mass) / (PI * h8);

  // Initialise densities
  rho.fill(C1);

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      dx = x[i] - x[j];
      dy = y[i] - y[j];
      r2 = dx * dx + dy * dy;
      z = h2 - r2;

      if (z > 0) {
        rho_ij = C2 * z * z * z;
        throwIfNan([rho_ij], "computeDensities");
        rho[i] += rho_ij;
        rho[j] += rho_ij;
      }
    }
  }
};

let computeAccelerations = function () {
  computeDensities();
  // Start with gravity and surface forces
  for (i = N; i--; ) {
    ax[i] = 0;
    ay[i] = -gravity;
  }

  // Find new densities
  let dx, dy, r2, rhoi, rhoj, q, u, w0, wp, wv, dvx, dvy;

  for (let i = N; i--; ) {
    rhoi = rho[i];
    const nearPoints = hashGrid.getNearPointsInNonLeftCells(x[i], y[i]);

    for (let j of nearPoints) {
      // to ensure we only handle a pair of particles once, require i<j
      if (i < j) {
        dx = x[i] - x[j];
        dy = y[i] - y[j];
        r2 = dx * dx + dy * dy;

        if (r2 < h2) {
          rhoj = rho[j];
          q = Math.sqrt(r2) / h;
          u = 1 - q;
          w0 = (C0 * u) / (rhoi * rhoj);
          wp = (w0 * Cp * (rhoi + rhoj - rho02) * u) / q;
          wv = w0 * Cv;

          dvx = vx[i] - vx[j];
          dvy = vy[i] - vy[j];

          ax[i] += wp * dx + wv * dvx;
          ay[i] += wp * dy + wv * dvy;
          ax[j] -= wp * dx + wv * dvx;
          ay[j] -= wp * dy + wv * dvy;
          throwIfNan([ax[i], ax[j], ay[i], ay[j]], "computeAccelerations");
        }
      }
    }
  }
};

let updateParticles = function () {
  let collisions = [];
  let dx, dy, r2;

  // Reset properties and find collisions
  for (let i = 0; i < N; i++) {
    // Reset density
    rho[i] = C1;

    // Reset acceleration
    ax[i] = 0;
    ay[i] = -gravity;

    // Calculate which particles overlap
    for (let j = i + 1; j < N; j++) {
      dx = x[i] - x[j];
      dy = y[i] - y[j];
      r2 = dx * dx + dy * dy;
      if (r2 < h2) {
        collisions.push([i, j, dx, dy, r2]);
      }
    }
  }

  let collisions2 = [];
  // Reset properties and find collisions
  for (let i = 0; i < N; i++) {
    // Reset density
    // rho[i] = C1;

    // Reset acceleration
    // ax[i] = 0;
    // ay[i] = -gravity;
    const nearPoints = hashGrid.getNearPointsInNonLeftCells(x[i], y[i]);
    for (let j of nearPoints) {
      if (j > i) {
        dx = x[i] - x[j];
        dy = y[i] - y[j];
        r2 = dx * dx + dy * dy;
        if (r2 < h2) {
          collisions2.push([i, j, dx, dy, r2]);
        }
      }
    }
  }
  if (collisions.length !== collisions2.length) {
    throw new Error("collision mismatch");
  }

  // Calculate densities
  let c, rho_ij, z;
  for (i = collisions.length; i--; ) {
    c = collisions[i];
    z = h2 - c[4];
    rho_ij = C2 * z * z * z;
    rho[c[0]] += rho_ij;
    rho[c[1]] += rho_ij;
  }

  // // TODO: Find max density

  // // Calculate accelerations

  // let pi, pj, q, u, w0, wp, wv, dvx, dvy;
  for (i = collisions.length; i--; ) {
    c = collisions[i];
    let pi = c[0];
    let pj = c[1];

    let q = Math.sqrt(c[4]) / h;
    let u = 1 - q;
    let w0 = (C0 * u) / (rho[pi] * rho[pj]);
    let wp = (w0 * Cp * (rho[pi] + rho[pj] - rho02) * u) / q;
    let wv = w0 * Cv;

    let dvx = vx[pi] - vx[pj];
    let dvy = vy[pi] - vy[pj];

    ax[pi] += wp * c[2] + wv * dvx;
    ay[pi] += wp * c[3] + wv * dvy;
    ax[pj] -= wp * c[2] + wv * dvx;
    ay[pj] -= wp * c[3] + wv * dvy;
    throwIfNan([ax[pi], ax[pj], ay[pi], ay[pj]], "updateParticles");
  }
};

let normalizeMassForInit = function () {
  mass = 1;
  computeDensities();

  let rho2s = 0;
  let rhos = 0;
  for (i = N; i--; ) {
    rho2s += rho[i] * rho[i];
    rhos += rho[i];
  }

  mass = (rho0 * rhos) / rho2s;
  // Constants for interaction term
  C0 = mass / (PI * h4);
  C1 = (4 * mass) / (PI * h2);
  C2 = (4 * mass) / (PI * h8);
};

let leapfrogInit = function () {
  for (i = N; i--; ) {
    // Update half step velocity
    vhx[i] = vx[i] + ax[i] * dt2;
    vhy[i] = vy[i] + ay[i] * dt2;

    // Update velocity
    vx[i] = ax[i] * dt2;
    vy[i] = ay[i] * dt2;

    // Update position
    const x_last = x[i];
    const y_last = y[i];
    x[i] = x_last + vhx[i] * dt;
    y[i] = y_last + vhy[i] * dt;
    hashGrid.movePoint(i, x[i], y[i], x_last, y_last);
  }
};

let leapfrogStep = function () {
  for (i = N; i--; ) {
    // Update half step velocity
    vhx[i] += ax[i] * dt;
    vhy[i] += ay[i] * dt;

    // Update velocity
    vx[i] = vhx[i] + ax[i] * dt2;
    vy[i] = vhy[i] + ay[i] * dt2;

    // Update position
    const x_last = x[i];
    const y_last = y[i];
    x[i] = x_last + vhx[i] * dt;
    y[i] = y_last + vhy[i] * dt;
    // Handle boundaries
    if (x[i] < edge1) {
      x[i] = edge1; // + random(0.0001, 0.0005);
      vx[i] *= -restitution;
      vhx[i] *= -restitution;
    } else if (x[i] > edge2) {
      x[i] = edge2; // - random(0.0001, 0.0005);
      vx[i] *= -restitution;
      vhx[i] *= -restitution;
    }

    if (y[i] > edge3) {
      y[i] = edge3 - random(0.0001, 0.0005);
      vy[i] *= -restitution;
      vhy[i] *= -restitution;
    }
    hashGrid.movePoint(i, x[i], y[i], x_last, y_last);
  }
};

let update = function () {
  computeAccelerations();
  let dupes = findDupes(hashGrid);
  if (dupes.length > 0) {
    throw new Error("dupes in hash grid - update - computeAccelerations ");
  }
  updateParticles();
  dupes = findDupes(hashGrid);
  if (dupes.length > 0) {
    throw new Error("dupes in hash grid - update - updateParticles");
  }
  leapfrogStep();
  dupes = findDupes(hashGrid);
  if (dupes.length > 0) {
    throw new Error("dupes in hash grid - update - leapfrogStep");
  }
};

let initialiseSystem = function () {
  // initialiseArrays();
  particlesInMesh(0.05, height / width - 0.01);
  normalizeMassForInit();
  computeAccelerations();
  leapfrogInit();
  let dupes = findDupes(hashGrid);
  if (dupes.length > 0) {
    throw new Error("dupes in hash grid - particlesInMesh");
  }
};

/**************************************
 *      Set-up system
 ***************************************/

initialiseSystem();
/**************************************
 *      Main loop
 ***************************************/

const millis = Date.now;

function updateCanvas() {
  let { ctx } = plt1;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.beginPath();
  for (var i = 0; i < x.length; i++) {
    ctx.moveTo(_scale * x[i], _scale * y[i]);
    ctx.arc(_scale * x[i], _scale * y[i], (_scale * h) / 2, 0, 2 * Math.PI);
  }
  ctx.stroke();
}

function throwIfNan(nums: number[], where: string | null = null) {
  for (let a of nums) {
    if (isNaN(a)) {
      throw new Error("nan detected" + (where ? ": " + where : ""));
    }
  }
}

global._TOTAL_DRAW_CYCLES = 0;
export function draw() {
  let m = millis();

  // Find maxRho
  let maxRho = rho.reduce((a, b) => Math.max(a, b), 0);

  // max.apply(null, rho);

  updateCanvas();

  let count = 0;
  let MAX_COUNT = 30;
  while (count < MAX_COUNT && millis() - m < 40) {
    update();
    count++;
  }
  requestAnimationFrame(draw);
  global._TOTAL_DRAW_CYCLES++;
}

// draw();

export function doUpdates(N) {
  const t0 = Date.now();
  let i = 0;
  while (i < N) {
    update();
    i++;
  }
  console.log("TOTAL TIME: ", Date.now() - t0);
}

updateCanvas();
