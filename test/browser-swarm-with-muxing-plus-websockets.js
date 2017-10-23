/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const WebSockets = require('libp2p-websockets')
const spdy = require('libp2p-spdy')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const Swarm = require('../src')

describe.skip('high level API (swarm with spdy + websockets)', () => {
  let swarm
  let peerDst

  before((done) => {
    PeerInfo.create((err, peerSrc) => {
      if (err) {
        return done(err)
      }
      swarm = new Swarm(peerSrc, new PeerBook())
      done()
    })
  })

  it('add spdy', () => {
    swarm.connection.addStreamMuxer(spdy)
    swarm.connection.reuse()
  })

  it('add ws', () => {
    swarm.transport.add('ws', new WebSockets())
    expect(Object.keys(swarm.transports).length).to.equal(1)
  })

  it('create Dst peer info', (done) => {
    PeerId.createFromJSON(require('./test-data/id-2.json'), (err, id) => {
      expect(err).to.not.exist()

      peerDst = new PeerInfo(id)
      const ma = '/ip4/127.0.0.1/tcp/9200/ws'
      peerDst.multiaddrs.add(ma)
      done()
    })
  })

  it('dial to warm a conn', (done) => {
    swarm.dial(peerDst, done)
  })

  it('dial on protocol, use warmed conn', (done) => {
    swarm.dial(peerDst, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      pull(
        pull.values([Buffer.from('hello')]),
        conn,
        pull.onEnd(done)
      )
    })
  })

  it('close', (done) => {
    // cause CI is slow
    setTimeout(() => swarm.close(done), 1000)
  })
})
