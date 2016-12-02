/* eslint-env mocha */
'use strict'

const Bootstrap = require('../src')
const peerList = require('./default-peers')

describe('without verify on', () => {
  it('find the other peer', (done) => {
    const bA = new Bootstrap(peerList, { verify: false })

    bA.once('peer', (peer) => {
      done()
    })
  })
})
