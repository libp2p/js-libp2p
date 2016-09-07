/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const parallel = require('run-parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')
const goodbye = require('pull-goodbye')

const Swarm = require('../src')

describe('transport - websockets', function () {
  var swarmA
  var swarmB
  var peerA = new Peer()
  var peerB = new Peer()

  before(() => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888/ws'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC'))
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
        pull(conn, conn)
      }, cb),
      (cb) => swarmB.transport.listen('ws', {}, (conn) => {
        pull(conn, conn)
      }, cb)
    ], () => {
      expect(peerA.multiaddrs.length).to.equal(1)
      expect(
        peerA.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9888/ws'))
      ).to.be.equal(
        true
      )
      expect(peerB.multiaddrs.length).to.equal(1)
      expect(
        peerB.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC'))
      ).to.equal(
        true
      )
      done()
    })
  })

  it('dial', (done) => {
    const conn = swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/ws'), (err, conn) => {
      expect(err).to.not.exist
    })

    const s = goodbye({
      source: pull.values([Buffer('hey')]),
      sink: pull.collect((err, data) => {
        expect(err).to.not.exist
        expect(data).to.be.eql([Buffer('hey')])
        done()
      })
    })
    pull(s, conn, s)
  })

  it('dial (conn from callback)', (done) => {
    swarmA.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9999/ws'), (err, conn) => {
      expect(err).to.not.exist

      const s = goodbye({
        source: pull.values([Buffer('hey')]),
        sink: pull.collect((err, data) => {
          expect(err).to.not.exist
          expect(data).to.be.eql([Buffer('hey')])
          done()
        })
      })
      pull(s, conn, s)
    })
  })

  it('close', (done) => {
    parallel([
      (cb) => swarmA.transport.close('ws', cb),
      (cb) => swarmB.transport.close('ws', cb)
    ], done)
  })
})
