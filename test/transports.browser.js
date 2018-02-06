/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const WebSockets = require('libp2p-websockets')

const tryEcho = require('./utils').tryEcho
const Switch = require('../src')

describe('Transports', () => {
  describe('WebSockets', () => {
    let sw
    let peer

    before((done) => {
      const b58IdSrc = 'QmYzgdesgjdvD3okTPGZT9NPmh1BuH5FfTVNKjsvaAprhb'
      // use a pre generated Id to save time
      const idSrc = PeerId.createFromB58String(b58IdSrc)
      const peerSrc = new PeerInfo(idSrc)
      sw = new Switch(peerSrc, new PeerBook())

      PeerInfo.create((err, p) => {
        expect(err).to.not.exist()
        peer = p
        done()
      })
    })

    it('.transport.add', (done) => {
      sw.transport.add('ws', new WebSockets(), () => {
        expect(Object.keys(sw.transports).length).to.equal(1)
        done()
      })
    })

    it('.transport.dial', (done) => {
      peer.multiaddrs.clear()
      peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9100/ws')

      const conn = sw.transport.dial('ws', peer, (err, conn) => {
        expect(err).to.not.exist()
      })

      tryEcho(conn, done)
    })
  })
})
