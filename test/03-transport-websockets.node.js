/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const parallel = require('run-parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Swarm = require('../src')
const WebSockets = require('libp2p-websockets')
const bl = require('bl')

describe('transport - websockets', function () {
  this.timeout(10000)

  var swarmA
  var swarmB
  var peerA = new Peer()
  var peerB = new Peer()

  before(() => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999/websockets/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC'))
    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
  })

  it('add', (done) => {
    swarmA.transport.add('ws', new WebSockets())
    expect(Object.keys(swarmA.transports).length).to.equal(1)
    swarmB.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('listen', (done) => {
    parallel([
      (cb) => swarmA.transport.listen('ws', {}, (conn) => {
        conn.pipe(conn)
      }, cb),
      (cb) => swarmB.transport.listen('ws', {}, (conn) => {
        conn.pipe(conn)
      }, cb)
    ], () => {
      expect(peerA.multiaddrs.length).to.equal(1)
      expect(
        peerA.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'))
      ).to.be.equal(
        true
      )
      expect(peerB.multiaddrs.length).to.equal(1)
      expect(
        peerB.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9999/websockets/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC'))
      ).to.equal(
        true
      )
      done()
    })
  })

  it('dial', (done) => {
    const conn = swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('dial (conn from callback)', (done) => {
    swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'), (err, conn) => {
      expect(err).to.not.exist

      conn.pipe(bl((err, data) => {
        expect(err).to.not.exist
        done()
      }))
      conn.write('hey')
      conn.end()
    })
  })

  it('close', (done) => {
    parallel([
      (cb) => swarmA.transport.close('ws', cb),
      (cb) => swarmB.transport.close('ws', cb)
    ], done)
  })
})
