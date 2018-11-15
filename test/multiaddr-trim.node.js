/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const series = require('async/series')

const createNode = require('./utils/create-node')

describe('multiaddr trim', () => {
  it('non used multiaddrs get trimmed', (done) => {
    let node

    series([
      (cb) => createNode([
        '/ip4/0.0.0.0/tcp/999/wss/p2p-webrtc-direct',
        '/ip4/127.0.0.1/tcp/55555/ws',
        '/ip4/0.0.0.0/tcp/0/'
      ], (err, _node) => {
        expect(err).to.not.exist()
        node = _node
        const multiaddrs = node.peerInfo.multiaddrs.toArray()
        expect(multiaddrs).to.have.length(3)
        cb()
      }),
      (cb) => node.start(cb)
    ], (err) => {
      expect(err).to.not.exist()

      const multiaddrs = node.peerInfo.multiaddrs.toArray()
      expect(multiaddrs.length).to.be.at.least(2)
      // ensure the p2p-webrtc-direct address has been trimmed
      multiaddrs.forEach((addr) => {
        expect(() => addr.decapsulate('/ip4/0.0.0.0/tcp/999/wss/p2p-webrtc-direct')).to.throw()
      })

      node.stop(done)
    })
  })
})
