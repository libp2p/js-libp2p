/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const createNode = require('./utils/node').createNode

describe('multiaddr trim', () => {
  let node

  after((done) => {
    if (node) {
      node.stop(done)
    } else {
      done()
    }
  })

  it('can create a test node with an irrelevant multiaddr', (done) => {
    createNode(
      [
        '/ip4/0.0.0.0/tcp/0/wss/p2p-webrtc-direct',
        '/ip4/0.0.0.0/tcp/0'
      ],
      (err, _node) => {
        expect(err).to.not.exist()
        node = _node
        expect(node.peerInfo.multiaddrs.toArray()).to.have.length(2)
        done()
      })
  })

  it('starts node', (done) => {
    node.start(done)
  })

  it('irrelevant multiaddr got trimmed', (done) => {
    expect(node.peerInfo.multiaddrs.toArray()).to.have.length(1)
    expect(node.peerInfo.multiaddrs.toArray()[0].toString()).to.match(/^\/ip4\/0\.0\.0\.0\/tcp\/0\/ipfs\/\w+/)
    done()
  })
})
