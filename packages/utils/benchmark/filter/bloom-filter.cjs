/* eslint-disable no-console */
const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('bloom-filter')

const bits = [8, 64, 512, 4096, 32768, 262144, 2097152, 251658240]

bits.forEach((bit) => {
  suite.add(`Loop ${bit}bits`, () => {
    let pos = 0
    let shift = bit
    while (shift > 7) {
      pos++
      shift -= 8
    }
  })

  suite.add(`Math Ops ${bit}bits`, () => {
    _ = Math.floor(bit / 8)
    _ = bit % 8
  })
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({ async: true })
