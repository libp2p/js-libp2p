/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const peerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebRTCStar = require('libp2p-webrtc-star')
const spdy = require('libp2p-spdy')
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')

const Swarm = require('../src')

describe('high level API (swarm with spdy + webrtc-star)', () => {
  let swarm1
  let peer1
  let wstar1

  let swarm2
  let peer2
  let wstar2

  before((done) => {
    series([
      (cb) => peerId.create((err, id1) => {
        if (err) {
          return cb(err)
        }
        peer1 = new PeerInfo(id1)
        const mh1 = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + id1.toB58String())
        peer1.multiaddr.add(mh1)
        cb()
      }),
      (cb) => peerId.create((err, id2) => {
        if (err) {
          return cb(err)
        }
        peer2 = new PeerInfo(id2)
        const mh2 = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + id2.toB58String())
        peer2.multiaddr.add(mh2)
        cb()
      })
    ], (err) => {
      if (err) {
        return done(err)
      }

      swarm1 = new Swarm(peer1)
      swarm2 = new Swarm(peer2)
      done()
    })
  })

  it('add WebRTCStar transport to swarm 1', () => {
    wstar1 = new WebRTCStar()
    swarm1.transport.add('wstar', wstar1)
    expect(Object.keys(swarm1.transports).length).to.equal(1)
  })

  it('add WebRTCStar transport to swarm 2', () => {
    wstar2 = new WebRTCStar()
    swarm2.transport.add('wstar', wstar2)
    expect(Object.keys(swarm2.transports).length).to.equal(1)
  })

  it('listen on swarm 1', (done) => {
    swarm1.listen(done)
  })

  it('listen on swarm 2', (done) => {
    swarm2.listen(done)
  })

  it('add spdy', () => {
    swarm1.connection.addStreamMuxer(spdy)
    swarm1.connection.reuse()
    swarm2.connection.addStreamMuxer(spdy)
    swarm2.connection.reuse()
  })

  it('handle proto', () => {
    swarm2.handle('/echo/1.0.0', (conn) => {
      pull(conn, conn)
    })
  })

  it('dial on proto', (done) => {
    swarm1.dial(peer2, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarm1.muxedConns).length).to.equal(1)

      const text = 'Hello World'
      pull(
        pull.values([text]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist
          expect(data.toString()).to.equal(text)
          expect(Object.keys(swarm2.muxedConns).length).to.equal(1)
          done()
        })
      )
    })
  })

  it('create a third node and check that discovery works', (done) => {
    wstar1.discovery.on('peer', (peerInfo) => {
      expect(Object.keys(swarm1.muxedConns).length).to.equal(1)
      swarm1.dial(peerInfo, () => {
        expect(Object.keys(swarm1.muxedConns).length).to.equal(2)
      })
    })
    wstar2.discovery.on('peer', (peerInfo) => {
      swarm2.dial(peerInfo)
    })

    peerId.create((err, id3) => {
      if (err) {
        return done(err)
      }
      const peer3 = new PeerInfo(id3)
      const mh3 = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + id3.toB58String())
      peer3.multiaddr.add(mh3)

      const swarm3 = new Swarm(peer3)
      const wstar3 = new WebRTCStar()
      swarm3.transport.add('wstar', wstar3)
      swarm3.connection.addStreamMuxer(spdy)
      swarm3.connection.reuse()
      swarm3.listen(() => {
        setTimeout(() => {
          expect(Object.keys(swarm1.muxedConns).length).to.equal(2)
          expect(Object.keys(swarm2.muxedConns).length).to.equal(2)
          expect(Object.keys(swarm3.muxedConns).length).to.equal(2)
          swarm3.close(done)
        }, 8000)
      })
    })
  })

  it('close', (done) => {
    parallel([
      swarm1.close,
      swarm2.close
    ], done)
  })
})
