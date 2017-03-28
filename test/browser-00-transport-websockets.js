/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')
const Id = require('peer-id')
const Peer = require('peer-info')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')

const Swarm = require('../src')

describe('transport - websockets', () => {
  let swarm
  let peer

  before((done) => {
    const b58IdSrc = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
    // use a pre generated Id to save time
    const idSrc = Id.createFromB58String(b58IdSrc)
    const peerSrc = Peer(idSrc)
    swarm = new Swarm(peerSrc)

    Peer.create((err, p) => {
      if (err) {
        return done(err)
      }
      peer = p
      done()
    })
  })

  it('add', (done) => {
    swarm.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarm.transports).length).to.equal(1)
      done()
    })
  })

  it('dial', (done) => {
    peer.multiaddrs = []
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9100/ws'))

    const conn = swarm.transport.dial('ws', peer, (err, conn) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values([Buffer('hey')]),
      conn,
      pull.collect((err, data) => {
        expect(err).to.not.exist()
        expect(data.toString()).to.equal('hey')
        done()
      })
    )
  })
})
