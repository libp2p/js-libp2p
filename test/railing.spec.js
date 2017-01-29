/* eslint-env mocha */
'use strict'

const Railing = require('../src')
const peerList = require('./default-peers')

describe('without verify on', () => {
  it('find the other peer', (done) => {
    const r = new Railing(peerList)

    r.start(() => {})

    r.once('peer', (peer) => done())
  })
})
