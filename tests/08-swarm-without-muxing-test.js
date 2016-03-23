/* eslint-env mocha */

const expect = require('chai').expect

const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')

describe('high level API - 1st without stream multiplexing (on TCP)', function () {
  this.timeout(20000)

  var swarmA
  var peerA
  var swarmB
  var peerB

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()

    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)

    swarmA.transport.add('tcp', new TCP())
    swarmA.transport.listen('tcp', {}, null, ready)

    swarmB.transport.add('tcp', new TCP())
    swarmB.transport.listen('tcp', {}, null, ready)

    var counter = 0

    function ready () {
      if (++counter === 2) {
        done()
      }
    }
  })

  after((done) => {
    var counter = 0

    swarmA.close(closed)
    swarmB.close(closed)

    function closed () {
      if (++counter === 2) {
        done()
      }
    }
  })

  it('handle a protocol', (done) => {
    swarmB.handle('/bananas/1.0.0', (conn) => {
      conn.pipe(conn)
    })
    expect(Object.keys(swarmB.protocols).length).to.equal(1)
    done()
  })

  it('dial on protocol', (done) => {
    swarmB.handle('/pineapple/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('dial on protocol (returned conn)', (done) => {
    swarmB.handle('/apples/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    const conn = swarmA.dial(peerB, '/apples/1.0.0', (err) => {
      expect(err).to.not.exist
    })
    conn.end()
    conn.on('data', () => {}) // let it flow.. let it flooooow
    conn.on('end', done)
  })

  it('dial to warm a conn', (done) => {
    swarmA.dial(peerB, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarmA.dial(peerB, '/bananas/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })
})
