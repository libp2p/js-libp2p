/* eslint-env mocha */
'use strict'

const Railing = require('../src')
const peerList = require('./default-peers')

describe('without verify on', () => {
  it('find the other peer', function (done) {
    this.timeout(20 * 1000)
    const r = new Railing(peerList)
    r.once('peer', (peer) => done())
    r.start(() => {})
  })
})
