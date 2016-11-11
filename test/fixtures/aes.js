'use strict'

const fixes16 = [
  require('./fix1.json'),
  require('./fix2.json'),
  require('./fix3.json'),
  require('./fix4.json'),
  require('./fix5.json')
]
const fixes32 = [
  require('./fix6.json'),
  require('./fix7.json'),
  require('./fix8.json'),
  require('./fix9.json'),
  require('./fix10.json')
]

module.exports = {
  16: {
    inputs: fixes16.map((f) => f.input),
    outputs: fixes16.map((f) => f.output)
  },
  32: {
    inputs: fixes32.map((f) => f.input),
    outputs: fixes32.map((f) => f.output)
  }
}
