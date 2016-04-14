/* eslint-env mocha */
'use strict'

const fs = require('fs')

describe('libp2p-swarm', () => {
  fs.readdirSync(__dirname)
    .filter((file) => file.match(/\.node\.js$/))
    .forEach((file) => {
      require(`./${file}`)
    })
})
