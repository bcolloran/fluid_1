import {
  doUpdates as runNaive,
  draw as drawNaive,
} from "./sph-khan-academy-naive";
import {
  doUpdates as runHasherSlow,
  draw,
} from "./sph-khan-academy-hasher-slow";

// for (let i of [1, 2, 3]) {
//   for (let [name, runner] of [
//     ["naive", runNaive],
//     ["hasherSlow", runHasherSlow],
//   ]) {
//     console.log(name, i);
//     runner(100);
//   }
// }

draw();
// drawNaive();
