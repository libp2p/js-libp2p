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
    expect(Swarm).to.throw(Error)
    done()
  })
})

require('./browser-00-transport-websockets.js')

if (w.support) {
  require('./browser-01-transport-webrtc-star.js')
}

require('./browser-02-swarm-with-muxing-plus-websockets.js')

if (w.support) {
  require('./browser-03-swarm-with-muxing-plus-webrtc-star.js')
  require('./browser-04-swarm-with-muxing-plus-websockets-and-webrtc-star.js')
}
