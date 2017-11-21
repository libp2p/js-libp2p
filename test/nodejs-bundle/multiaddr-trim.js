/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const createNode = require('./utils').createNode

describe('multiaddr trim', () => {
  let node
  it('can create a test node with an irrelevant multiaddr', (done) => {
    createNode(
      [
        '/ip4/0.0.0.0/tcp/0/p2p-webrtc-direct'
      ],
      (err, _node) => {
        expect(err).to.not.exist()
        node = _node
        expect(node.peerInfo.multiaddrs.toArray()).to.have.length(1)
        done()
      })
  })

  it('starts node', (done) => {
    node.start(done)
  })

  it('irrelevant multiaddr got trimmed', (done) => {
    expect(node.peerInfo.multiaddrs.toArray()).to.have.length(0)
    done()
  })
})
