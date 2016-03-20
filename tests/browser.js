/* eslint-env mocha */

const expect = require('chai').expect
// const async = require('async')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const Peer = require('peer-info')
const Swarm = require('../src')
const WebSockets = require('libp2p-websockets')
const bl = require('bl')

const PEER_ID_SERVER_A = 'QmWg2L4Fucx1x4KXJTfKHGixBJvveubzcd7DdhB2Mqwfh1'
const PEER_ID_SERVER_B = 'QmRy1iU6BHmG5Hd8rnPhPL98cy1W1przUSTAMcGDq9yAAV'
const MULTIADDR_SERVER_A = '/ip4/127.0.0.1/tcp/9888/websockets'
const MULTIADDR_SERVER_B = '/ip4/127.0.0.1/tcp/9999/websockets'

// random id to be used on the tests
const PEER_ID_A = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(Error)
    done()
  })
})

describe('transport - websockets', function () {
  this.timeout(10000)

  var swarm
  var peerId = PeerId.createFromB58String(PEER_ID_A)
  var peer = new Peer(peerId)

  before((done) => {
    swarm = new Swarm(peer)
    done()
  })

  it('add', (done) => {
    swarm.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarm.transports).length).to.equal(1)
      done()
    })
  })

  it('dial', (done) => {
    const conn = swarm.transport.dial('ws', multiaddr(MULTIADDR_SERVER_A), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      expect(data.toString()).to.equal('hey')
      done()
    }))
    conn.write('hey')
    conn.end()
  })
})

describe('high level API - 1st without stream multiplexing (on websockets)', function () {
  this.timeout(10000)

  var swarm
  var peerSelf
  var peerServerA
  var peerServerB

  before((done) => {
    const peerServerAId = PeerId.createFromB58String(PEER_ID_SERVER_A)
    peerServerA = new Peer(peerServerAId)
    const peerServerBId = PeerId.createFromB58String(PEER_ID_SERVER_B)
    peerServerB = new Peer(peerServerBId)
    const peerSelfId = PeerId.createFromB58String(PEER_ID_A)
    peerSelf = new Peer(peerSelfId)

    peerServerA.multiaddr.add(multiaddr(MULTIADDR_SERVER_A))
    peerServerB.multiaddr.add(multiaddr(MULTIADDR_SERVER_B))

    swarm = new Swarm(peerSelf)

    swarm.transport.add('ws', new WebSockets())
    expect(Object.keys(swarm.transports).length).to.equal(1)
    done()
  })

  // after((done) => {
  //   swarm.close(done)
  // })

  it('dial using transport interface', (done) => {
    const conn = swarm.transport.dial('ws', peerServerA.multiaddrs, (err, conn) => {
      expect(err).to.not.exist
    })

    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      expect(data.toString()).to.equal('hey')
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('dial on protocol', (done) => {
    swarm.dial(peerServerB, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.pipe(bl((err, data) => {
        expect(err).to.not.exist
        expect(data.toString()).to.equal('yo')
        done()
      }))
      conn.write('yo')
      conn.end()
    })
  })

  it('dial to warm a conn', (done) => {
    swarm.dial(peerServerB, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarm.dial(peerServerB, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })
})
