type Plot = {
  canvas: HTMLCanvasElement;
  data: ImageData;
  ctx: CanvasRenderingContext2D;
};

type ColorNum = 0 | 1 | 2 | 3;

export function initCtx(w: number, h: number, containerId: string): Plot {
  // const w = w;
  // const h = h;
  // containerDiv.appendChild().
  const doc = <HTMLDocument>document;
  // doc.createElement("canvas")

  var canvas = doc.createElement("canvas");
  // <HTMLCanvasElement>document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  canvas.width = w;
  canvas.height = h;
  const imageData = ctx.createImageData(w, h);

  document.getElementById(containerId).appendChild(canvas);
  return { canvas, data: imageData, ctx };
}

const image_xyc = (x: number, y: number, c: ColorNum, canvasWidth: number) =>
  x * 4 + y * (canvasWidth * 4) + c;

function setPlotXYC(plt: Plot, x: number, y: number, c: ColorNum, val: number) {
  const { width, height } = plt.canvas;
  plt.data.data[image_xyc(x, y, c, width)] = val;
}

function updatePlot(plt: Plot) {
  plt.ctx.putImageData(plt.data, 0, 0);
}

export function makePlot(w: number, h: number, containerId: string) {
  const plt = initCtx(w, h, containerId);
  return {
    setR: (x, y, v) => setPlotXYC(plt, x, y, 0, v),
    setG: (x, y, v) => setPlotXYC(plt, x, y, 1, v),
    setB: (x, y, v) => setPlotXYC(plt, x, y, 2, v),
    setA: (x, y, v) => setPlotXYC(plt, x, y, 3, v),
    update: () => updatePlot(plt),
  };
}

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
