if (module.hot) {
  module.hot.accept();
}

import Delaunator from "delaunator";

const dt = 0.5;
const f_mod = 0.0002;

const particleRad = 2;

var minX = 0;
var maxX = 200;
var minY = 0;
var maxY = 150;
var dataPadding = 10;

var rangeX = maxX - minX - 2 * dataPadding;
var rangeY = maxY - minY - 2 * dataPadding;

var padding = 5;
var w = 1024;
var h = ((w - 2 * padding) * (maxY - minY)) / (maxX - minX) + 2 * padding;
var ratio = (w - 2 * padding) / Math.max(maxX - minX, maxY - minY);

const N = 50;

var points = new Float64Array(N * 2).fill(0).map(
  (x, i) =>
    i % 2 === 0
      ? (Math.random() * rangeX) / 2 + rangeX / 2 + dataPadding //x
      : Math.random() * rangeY + dataPadding //y
);

var vel = new Float64Array(N * 2).fill(0).map(() => Math.random() * 2 - 1);

console.time("delaunay");
var delaunay = new Delaunator(points);
console.timeEnd("delaunay");

var canvas = <HTMLCanvasElement>document.getElementById("canvas");
var ctx = canvas.getContext("2d");

canvas.style.width = w + "px";
canvas.style.height = h + "px";

canvas.width = w;
canvas.height = h;

if (window.devicePixelRatio >= 2) {
  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.scale(2, 2);
}

ctx.lineJoin = "round";
ctx.lineCap = "round";

var updated = true;

// canvas.onmousemove = function (e) {
//   if (e.buttons === 1) {
//     points.push([
//       (e.layerX - padding) / ratio + minX,
//       (e.layerY - padding) / ratio + minY,
//     ]);
//     console.time("delaunay");
//     delaunay = new Delaunator(points);
//     console.timeEnd("delaunay");
//     updated = true;
//   }
// };

// canvas.onmouseup = function (e) {
//   points.push([
//     (e.layerX - padding) / ratio + minX,
//     (e.layerY - padding) / ratio + minY,
//   ]);
//   console.time("delaunay");
//   delaunay = new Delaunator(points);
//   console.timeEnd("delaunay");
//   updated = true;
// };

function getX(i) {
  return padding + ratio * (points[2 * i] - minX);
}
function getY(i) {
  return padding + ratio * (points[2 * i + 1] - minX);
}

function edgesOfTriangle(t) {
  return [3 * t, 3 * t + 1, 3 * t + 2];
}
function triangleOfEdge(e) {
  return Math.floor(e / 3);
}

function nextHalfedge(e) {
  return e % 3 === 2 ? e - 2 : e + 1;
}

function prevHalfedge(e) {
  return e % 3 === 0 ? e + 2 : e - 1;
}

//   function forEachTriangleEdge(points, delaunay, callback) {
//     for (let e = 0; e < delaunay.triangles.length; e++) {
//       if (e > delaunay.halfedges[e]) {
//         const p = points[delaunay.triangles[e]];
//         const q = points[delaunay.triangles[nextHalfedge(e)]];
//         callback(e, p, q);
//       }
//     }
//   }

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function forceForEachTriangleEdge() {
  for (let e = 0; e < delaunay.triangles.length; e++) {
    if (e > delaunay.halfedges[e]) {
      const i = delaunay.triangles[e];
      const j = delaunay.triangles[nextHalfedge(e)];
      const x_i = points[2 * i];
      const y_i = points[2 * i + 1];

      const x_j = points[2 * j];
      const y_j = points[2 * j + 1];
      const normalizedForce = f_mod / Math.hypot(x_i - x_j, y_i - y_j) ** 3;

      const xAcc = normalizedForce * (x_i - x_j);
      const yAcc = normalizedForce * (y_i - y_j);

      acc[2 * i] += xAcc;
      acc[2 * i + 1] += yAcc;

      acc[2 * j] += -xAcc;
      acc[2 * j + 1] += -yAcc;
    }
  }
}

function dot(a1, a2, b1, b2) {
  return a1 * b1 + a2 * b2;
}

function collisions() {
  for (let e = 0; e < delaunay.triangles.length; e++) {
    if (e > delaunay.halfedges[e]) {
      const i = delaunay.triangles[e];
      const j = delaunay.triangles[nextHalfedge(e)];
      const x_i = points[2 * i];
      const y_i = points[2 * i + 1];

      const x_j = points[2 * j];
      const y_j = points[2 * j + 1];

      const vx_i = vel[2 * i];
      const vy_i = vel[2 * i + 1];

      const vx_j = vel[2 * j];
      const vy_j = vel[2 * j + 1];
      const d = Math.hypot(x_i - x_j, y_i - y_j);
      if (d < 2 * particleRad) {
        const vDeltaMagnitude =
          -dot(vx_i - vx_j, vy_i - vy_j, x_i - x_j, y_i - y_j) / (d * d);
        vel[2 * i] += vDeltaMagnitude * (x_i - x_j);
        vel[2 * i + 1] += vDeltaMagnitude * (y_i - y_j);

        vel[2 * j] += -vDeltaMagnitude * (x_i - x_j);
        vel[2 * j + 1] += -vDeltaMagnitude * (y_i - y_j);
      }
    }
  }
}

var acc;
let t = 0;
const expansionSteps = 50;
function step() {
  acc = points.map((coord, i) => {
    if (i % 2 === 0) {
      // x-coord
      //   X
      return 0;
    } else {
      // y-coord
      // gravity is positive because pixel coords are inverted
      const gravity = 0.1;
      return t < expansionSteps ? 0 : gravity;
      // return 0;
    }
  });

  if (t < expansionSteps) {
    forceForEachTriangleEdge();
  } else {
    forceForEachTriangleEdge();
    collisions();
  }
  vel = vel.map((v, i) => {
    let vNew = v + acc[i] * dt;
    // perfectly elastic collisions with walls
    if (i % 2 === 0) {
      // x-coord

      if (points[i] < minX || points[i] > maxX) {
        vNew = -vNew;
      }
    } else {
      // y-coord
      if (points[i] < minY || points[i] > maxY) {
        vNew = -vNew;
      }
    }
    return vNew * 0.99;
  });

  points = points.map((x, i) => x + vel[i] * dt);
  delaunay.coords = points;
  delaunay.update();
  updated = true;
  t++;
}

function frame() {
  requestAnimationFrame(frame);
  step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();
  // step();

  draw();
}
frame();

function draw() {
  if (!updated) return;
  updated = false;
  ctx.clearRect(0, 0, w, h);
  var triangles = delaunay.triangles;
  ctx.beginPath();
  for (var i = 0; i < triangles.length; i += 3) {
    var p0 = triangles[i];
    var p1 = triangles[i + 1];
    var p2 = triangles[i + 2];
    ctx.moveTo(getX(p0), getY(p0));
    ctx.lineTo(getX(p1), getY(p1));
    ctx.lineTo(getX(p2), getY(p2));
    ctx.closePath();
  }
  ctx.strokeStyle = "rgba(0,200,0,1)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // ctx.fillStyle = 'rgba(255,255,0,0.1)';
  // ctx.fill();

  ctx.beginPath();
  for (const i of delaunay.hull) {
    ctx.lineTo(getX(i), getY(i));
  }
  ctx.closePath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "red";
  ctx.stroke();

  ctx.fillStyle = "black";
  ctx.beginPath();
  for (var i = 0; i < points.length; i++) {
    // ctx.rect(getX(i) - 1.5, getY(i) - 1.5, 3, 3);
    ctx.moveTo(getX(i), getY(i));

    ctx.arc(getX(i), getY(i), particleRad * ratio, 0, 2 * Math.PI);
    // ctx.stroke();
  }
  ctx.stroke();
  // ctx.fill();
}
