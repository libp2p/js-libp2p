/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebSockets = require('libp2p-websockets')
const spdy = require('libp2p-spdy')
const fs = require('fs')
const path = require('path')
const pull = require('pull-stream')

const Swarm = require('../src')

describe('high level API (swarm with spdy + websockets)', function () {
  this.timeout(60 * 1000)

  var swarm
  var peerDst

  before(() => {
    const peerSrc = new PeerInfo()
    swarm = new Swarm(peerSrc)
  })

  it('add spdy', () => {
    swarm.connection.addStreamMuxer(spdy)
    swarm.connection.reuse()
  })

  it('add ws', () => {
    swarm.transport.add('ws', new WebSockets())
    expect(Object.keys(swarm.transports).length).to.equal(1)
  })

  it('create Dst peer info', () => {
    const id = PeerId.createFromJSON(
        JSON.parse(
          fs.readFileSync(
            path.join(__dirname, './test-data/id-2.json'))))

    peerDst = new PeerInfo(id)

    const ma = multiaddr('/ip4/127.0.0.1/tcp/9200/ws')
    peerDst.multiaddr.add(ma)
  })

  it('dial to warm a conn', (done) => {
    swarm.dial(peerDst, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, use warmed conn', (done) => {
    swarm.dial(peerDst, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      pull(
        pull.values([Buffer('hello')]),
        conn,
        pull.onEnd(done)
      )
    })
  })

  it('close', (done) => {
    // cause CI is slow
    setTimeout(() => {
      swarm.close(done)
    }, 1000)
  })

  // TODO - test that the listener (node.js peer) can dial back
  // do that by dialing on a protocol to activate that behaviour
  // like libp2p-spdy tests
})
