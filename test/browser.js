/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const Id = require('peer-id')
const Peer = require('peer-info')
const WebSockets = require('libp2p-websockets')
const bl = require('bl')

const Swarm = require('../src')

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(Error)
    done()
  })
})

describe('transport - websockets', function () {
  this.timeout(10000)

  var swarm

  before((done) => {
    const b58IdSrc = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
    // use a pre generated Id to save time
    const idSrc = Id.createFromB58String(b58IdSrc)
    const peerSrc = new Peer(idSrc)
    swarm = new Swarm(peerSrc)

    done()
  })

  it('add', (done) => {
    swarm.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarm.transports).length).to.equal(1)
      done()
    })
  })

  it('dial', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9100/websockets')

    const conn = swarm.transport.dial('ws', ma, (err, conn) => {
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
  var peerDst

  before((done) => {
    const b58IdSrc = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
    // use a pre generated Id to save time
    const idSrc = Id.createFromB58String(b58IdSrc)
    const peerSrc = new Peer(idSrc)
    swarm = new Swarm(peerSrc)

    done()
  })

  after((done) => {
    done()
    // swarm.close(done)
  })

  it('add ws', (done) => {
    swarm.transport.add('ws', new WebSockets())
    expect(Object.keys(swarm.transports).length).to.equal(1)
    done()
  })

  it('create Dst peer info', (done) => {
    const b58IdDst = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
    // use a pre generated Id to save time
    const idDst = Id.createFromB58String(b58IdDst)
    peerDst = new Peer(idDst)

    const ma = multiaddr('/ip4/127.0.0.1/tcp/9200/websockets')
    peerDst.multiaddr.add(ma)
    done()
  })

  it('dial on protocol', (done) => {
    swarm.dial(peerDst, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.pipe(bl((err, data) => {
        expect(err).to.not.exist
        expect(data.toString()).to.equal('hey')
        done()
      }))
      conn.write('hey')
      conn.end()
    })
  })

  it('dial to warm a conn', (done) => {
    swarm.dial(peerDst, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarm.dial(peerDst, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })
})
