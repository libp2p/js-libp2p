/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebSockets = require('libp2p-websockets')
const mplex = require('pull-mplex')
const spdy = require('libp2p-spdy')
const PeerBook = require('peer-book')
const tryEcho = require('./utils').tryEcho

const Switch = require('../../src/switch')

describe('Switch (WebSockets)', () => {
  [
    mplex,
    spdy
  ].forEach((muxer) => {
    describe(muxer.multicodec, () => {
      let sw
      let peerDst

      before((done) => {
        PeerInfo.create((err, peerSrc) => {
          expect(err).to.not.exist()
          sw = new Switch(peerSrc, new PeerBook())
          done()
        })
      })

      after(done => {
        sw.stop(done)
      })

      it(`add muxer (${muxer.multicodec})`, () => {
        sw.connection.addStreamMuxer(muxer)
        sw.connection.reuse()
      })

      it('add ws', () => {
        sw.transport.add('ws', new WebSockets())
        expect(Object.keys(sw.transports).length).to.equal(1)
      })

      it('create Dst peer info', (done) => {
        PeerId.createFromJSON(require('./test-data/id-2.json'), (err, id) => {
          expect(err).to.not.exist()

          peerDst = new PeerInfo(id)
          const ma = '/ip4/127.0.0.1/tcp/15347/ws'
          peerDst.multiaddrs.add(ma)
          done()
        })
      })

      it('dial to warm a conn', (done) => {
        sw.dial(peerDst, done)
      })

      it('dial on protocol, use warmed conn', (done) => {
        sw.dial(peerDst, '/echo/1.0.0', (err, conn) => {
          expect(err).to.not.exist()
          tryEcho(conn, done)
        })
      })
    })
  })
})
