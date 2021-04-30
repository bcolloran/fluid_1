/*
 * [1] "Smoothed Particle HydrodynamicsTechniques for the Physics Based Simulation of Fluids and Solids"
 */

// const posToInd = (x: number, gridWidth: number): number =>
// Math.round(x / gridWidth);

// export class SpatialHashGridNaive {
//   private prime1: number = 73856093;
//   private prime2: number = 19349663;
//   public pointLists: Map<number, number[]>;
//   constructor(public gridWidth: number, public tableSize: number) {
//     // this.prime1 = 73856093;
//     // this.prime2 = 19349663;
//     this.pointLists = new Map();
//   }

//   xToI(x: number) {
//     // get index from position
//     return (x / this.gridWidth) | 0;
//     // return Math.floor(x / this.gridWidth);
//   }

//   xyToHashKey(x: number, y: number): number {
//     return this.cellIndsToHashKey(this.xToI(x), this.xToI(y));
//   }

//   cellIndsToHashKey(i: number, j: number): number {
//     // see [1], eq 34, p 10
//     // note that in js XOR automatically takes the floor of floats
//     // return i * this.prime1 + j * this.prime2;
//     return Math.abs((i * this.prime1) ^ (j * this.prime2)) % this.tableSize;
//     return i * j;
//   }

//   getPointsInCell(i, j) {
//     return this.pointLists.get(this.cellIndsToHashKey(i, j));
//   }

//   getNearPoints(x: number, y: number): number[] {
//     const cell_i = this.xToI(x);
//     const cell_j = this.xToI(y);
//     let points = [];

//     for (let i_step of [-1, 0, 1]) {
//       for (let j_step of [-1, 0, 1]) {
//         Array.prototype.push.apply(
//           points,
//           this.getPointsInCell(cell_i + i_step, cell_j + j_step)
//         );
//       }
//     }
//     return points;
//   }

//   getNearPointsInNonLeftCells(x: number, y: number): number[] {
//     const cell_i = this.xToI(x);
//     const cell_j = this.xToI(y);
//     let points = [];

//     for (let i_step of [0, 1]) {
//       for (let j_step of [-1, 0, 1]) {
//         Array.prototype.push.apply(
//           points,
//           this.getPointsInCell(cell_i + i_step, cell_j + j_step)
//         );
//       }
//     }
//     return points;
//   }

//   addPoint(pointIndex: number, x: number, y: number): void {
//     const key = this.xyToHashKey(x, y);
//     if (this.pointLists.has(key)) {
//       const pointList = this.pointLists.get(key);
//       pointList.push(pointIndex);
//     } else {
//       this.pointLists.set(key, [pointIndex]);
//     }
//   }

//   removePoint(pointIndex: number, x: number, y: number): void {
//     const key = this.xyToHashKey(x, y);
//     const pointList = this.pointLists.get(key);
//     // fast unordered array delete:
//     // replace the item we want to drop with the last item in the list, and simultaneously pop that last item
//     pointList[pointList.indexOf(pointIndex)] = pointList.pop();
//   }

//   movePoint(
//     pointIndex: number,
//     x: number,
//     y: number,
//     x_last: number,
//     y_last: number
//   ) {
//     this.removePoint(pointIndex, x_last, y_last);
//     this.addPoint(pointIndex, x, y);
//   }
// }
var setDiffCollisions = (a1, a2) => {
  const s = new Set(a2.map((c) => c.join("_")));
  return a1.map((c) => c.join("_")).filter((x) => !s.has(x));
};

export class SpatialHashGridNaive {
  private prime1: number = 73856093;
  private prime2: number = 19349663;
  public pointLists = {};
  constructor(public gridWidth: number, public tableSize: number) {
    // this.prime1 = 73856093;
    // this.prime2 = 19349663;
    // this.pointLists = new Map();
  }

  xToI(x: number) {
    // get index from position
    return (x / this.gridWidth) | 0;
    // return Math.floor(x / this.gridWidth);
  }

  xyToHashKey(x: number, y: number): string {
    return this.cellIndsToHashKey(this.xToI(x), this.xToI(y));
  }

  cellIndsToHashKey(i: number, j: number): string {
    // see [1], eq 34, p 10
    // note that in js XOR automatically takes the floor of floats
    // return i * this.prime1 + j * this.prime2;
    // return Math.abs((i * this.prime1) ^ (j * this.prime2));
    // % this.tableSize;
    return `cell_${i}_${j}`;
  }

  getPointsInCell(i, j) {
    return this.pointLists[this.cellIndsToHashKey(i, j)];
  }

  getNearPoints(x: number, y: number): number[] {
    const cell_i = this.xToI(x);
    const cell_j = this.xToI(y);
    let points = [];

    for (let i_step of [-1, 0, 1]) {
      for (let j_step of [-1, 0, 1]) {
        Array.prototype.push.apply(
          points,
          this.getPointsInCell(cell_i + i_step, cell_j + j_step)
        );
      }
    }
    return points;
  }

  getNearPointsInNonLeftCells(x: number, y: number): number[] {
    const cell_i = this.xToI(x);
    const cell_j = this.xToI(y);
    let points = [];

    for (let i_step of [0, 1]) {
      for (let j_step of [-1, 0, 1]) {
        Array.prototype.push.apply(
          points,
          this.getPointsInCell(cell_i + i_step, cell_j + j_step)
        );
      }
    }
    return points;
  }

  addPoint(pointIndex: number, x: number, y: number): void {
    const key = this.xyToHashKey(x, y);

    if (this.pointLists[key]) {
      const pointList = this.pointLists[key];
      // if (pointList.indexOf(pointIndex)!==-1){}
      pointList.push(pointIndex);
    } else {
      this.pointLists[key] = [pointIndex];
    }
    if (this.pointLists[key].length !== new Set(this.pointLists[key]).size) {
      throw new Error("index added to pointlist twice");
    }
  }

  removePoint(pointIndex: number, x: number, y: number): void {
    const key = this.xyToHashKey(x, y);
    const pointList = this.pointLists[key];
    // fast unordered array delete:
    const i = pointList.indexOf(pointIndex);
    if (i === pointList.length - 1) {
      pointList.pop();
    } else {
      // replace the item we want to drop with the last item in the list, and simultaneously pop that last item
      pointList[i] = pointList.pop();
    }
    // if (pointList.length === 0) {
    //   delete this.pointLists[key];
    // }
  }

  movePoint(
    pointIndex: number,
    x: number,
    y: number,
    x_last: number,
    y_last: number
  ) {
    this.removePoint(pointIndex, x_last, y_last);
    this.addPoint(pointIndex, x, y);
  }
}

export function allPoints(hashGrid: SpatialHashGridNaive): number[] {
  let points = [];
  const lists = Object.values(hashGrid.pointLists);
  // const foo3 = [...hashGrid.pointLists.values()];

  for (const list of lists) {
    points = points.concat(list);
  }
  // throw new Error("allpo");

  return points;
}

export function pointsEqual(p1, p2) {
  p1.forEach((el, i) => {
    if (el != p2[i]) return false;
  });
  return true;
}

export function findDupes(hashGrid: SpatialHashGridNaive) {
  let duplicates = [];
  // const allPoints = allPoints();
  const tempArray = [...allPoints(hashGrid)].sort();

  for (let i = 0; i < tempArray.length; i++) {
    // if (this.pointsEqual(tempArray[i + 1], tempArray[i])) {
    if (tempArray[i + 1] === tempArray[i]) {
      duplicates.push(tempArray[i]);
    }
  }
  return duplicates;
}