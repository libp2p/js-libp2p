/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const Id = require('peer-id')
const Peer = require('peer-info')
const WebSockets = require('libp2p-websockets')
// const spdy = require('libp2p-spdy')

const Swarm = require('../src')

describe('high level API (swarm with spdy + websockets)', function () {
  this.timeout(10000)

  var swarm
  var peerDst

  before(() => {
    const b58IdSrc = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
    // use a pre generated Id to save time
    const idSrc = Id.createFromB58String(b58IdSrc)
    const peerSrc = new Peer(idSrc)
    swarm = new Swarm(peerSrc)
  })

  it('add spdy', () => {
    // swarm.connection.addStreamMuxer(spdy)
    // swarm.connection.reuse()
  })

  it('add ws', () => {
    swarm.transport.add('ws', new WebSockets())
    expect(Object.keys(swarm.transports).length).to.equal(1)
  })

  it('create Dst peer info', () => {
    const b58IdDst = 'QmRy1iU6BHmG5Hd8rnPhPL98cy1W1przUSTAMcGDq9yAAV'
    // use a pre generated Id to save time
    const idDst = Id.createFromB58String(b58IdDst)
    peerDst = new Peer(idDst)

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
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
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
