/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const multiaddr = require('multiaddr')
const peerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebRTCStar = require('libp2p-webrtc-star')
const parallel = require('async/parallel')
const pull = require('pull-stream')

const Swarm = require('../src')

describe('transport - webrtc-star', () => {
  let swarm1
  let peer1

  let swarm2
  let peer2

  before(() => {
    const id1 = peerId.createFromB58String('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA')
    peer1 = new PeerInfo(id1)
    const mh1 = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA')
    peer1.multiaddr.add(mh1)

    const id2 = peerId.createFromB58String('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB')
    peer2 = new PeerInfo(id2)
    const mh2 = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB')
    peer2.multiaddr.add(mh2)

    swarm1 = new Swarm(peer1)
    swarm2 = new Swarm(peer2)
  })

  it('add WebRTCStar transport to swarm 1', (done) => {
    swarm1.transport.add('wstar', new WebRTCStar(), () => {
      expect(Object.keys(swarm1.transports).length).to.equal(1)
      done()
    })
  })

  it('add WebRTCStar transport to swarm 2', (done) => {
    swarm2.transport.add('wstar', new WebRTCStar(), () => {
      expect(Object.keys(swarm2.transports).length).to.equal(1)
      done()
    })
  })

  it('listen on swarm 1', (done) => {
    swarm1.transport.listen('wstar', {}, (conn) => {
      pull(conn, conn)
    }, done)
  })

  it('listen on swarm 2', (done) => {
    swarm2.transport.listen('wstar', {}, (conn) => {
      pull(conn, conn)
    }, done)
  })

  it('dial', (done) => {
    swarm1.transport.dial('wstar', peer2.multiaddrs[0], (err, conn) => {
      expect(err).to.not.exist()

      const text = 'Hello World'
      pull(
        pull.values([text]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist()
          expect(data.toString()).to.equal(text)
          done()
        })
      )
    })
  })
  it('dial offline / non-exist()ent node', (done) => {
    const mhOffline = multiaddr('/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/ABCD')
    swarm1.transport.dial('wstar', mhOffline, (err, conn) => {
      expect(err).to.exist()
      expect(conn).to.not.exist()
      done()
    })
  })

  it('close', (done) => {
    parallel([
      (cb) => swarm1.transport.close('wstar', cb),
      (cb) => swarm2.transport.close('wstar', cb)
    ], done)
  })
})
