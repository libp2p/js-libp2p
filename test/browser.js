/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const w = require('webrtcsupport')

const Swarm = require('../src')

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(/You must provide a `peerInfo`/)
    done()
  })
})

require('./browser-transport-websockets.js')
require('./browser-swarm-with-muxing-plus-websockets.js')

if (w.support) {
  require('./browser-transport-webrtc-star.js')
  require('./browser-swarm-with-muxing-plus-webrtc-star.js')
}
