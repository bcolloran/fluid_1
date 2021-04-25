export class Tensor3 {
  arr: Float64Array;
  shape: number[];

  constructor(shape: number[]) {
    this.shape = shape;
    this.arr = new Float64Array(shape[0] * shape[1] * shape[2]);
  }

  xyz = (x, y, z): number => {
    return z + this.shape[0] * this.shape[2] * y + this.shape[2] * x;
  };

  wrap_index(a: number, n_a: number): number {
    return a < 0 ? n_a - 1 : a >= n_a ? 0 : a;
  }

  set(x: number, y: number, z: number, val: number): void {
    this.arr[this.xyz(x, y, z)] = val;
  }

  get(x: number, y: number, z: number): number {
    return this.arr[this.xyz(x, y, z)];
  }

  getWrap(x: number, y: number, z: number): number {
    return this.arr[
      this.xyz(
        this.wrap_index(x, this.shape[0]),
        this.wrap_index(y, this.shape[1]),
        this.wrap_index(z, this.shape[2])
      )
    ];
  }

  min(): number {
    let m = Infinity;
    for (let i = 0; i < this.arr.length; i++) {
      if (this.arr[i] < m) {
        m = this.arr[i];
      }
    }
    return m;
  }

  max(): number {
    let m = -Infinity;
    for (let i = 0; i < this.arr.length; i++) {
      if (this.arr[i] > m) {
        m = this.arr[i];
      }
    }
    return m;
  }
}
