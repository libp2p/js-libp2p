'use strict'

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const parallel = require('async/parallel')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const Switch = require('./src')
const spdy = require('libp2p-spdy')
const fs = require('fs')
const path = require('path')

const sigServer = require('libp2p-webrtc-star/src/sig-server')

let switchA
let switchB
let sigS

const sigOptions = { port: 15555, host: '127.0.0.1' }

function echo (protocol, conn) { pull(conn, conn) }

function idJSON (id) {
  const p = path.join(__dirname, `./test/test-data/id-${id}.json`)
  return JSON.parse(fs.readFileSync(p))
}

function pre (done) {
  function createA (cb) {
    PeerId.createFromJSON(idJSON(1), (err, id) => {
      if (err) { return cb(err) }

      const peerA = new PeerInfo(id)
      const maA = '/ip4/127.0.0.1/tcp/9100/ws'

      peerA.multiaddrs.add(maA)
      switchA = new Switch(peerA, new PeerBook())

      switchA.transport.add('ws', new WebSockets())
      switchA.transport.listen('ws', {}, echo, cb)
    })
  }

  function createB (cb) {
    PeerId.createFromJSON(idJSON(2), (err, id) => {
      if (err) { return cb(err) }

      const peerB = new PeerInfo(id)
      const maB = '/ip4/127.0.0.1/tcp/9200/ws'

      peerB.multiaddrs.add(maB)
      switchB = new Switch(peerB, new PeerBook())

      switchB.transport.add('ws', new WebSockets())
      switchB.connection.addStreamMuxer(spdy)
      switchB.connection.reuse()
      switchB.handle('/echo/1.0.0', echo)
      switchB.start(cb)
    })
  }

  parallel([
    (cb) => {
      sigS = sigServer.start(sigOptions, cb)
    },
    (cb) => createA(cb),
    (cb) => createB(cb)
  ], done)
}

function post (done) {
  parallel([
    (cb) => switchA.transport.close('ws', cb),
    (cb) => switchB.stop(cb),
    (cb) => sigS.stop(cb)
  ], done)
}

module.exports = {
  hooks: {
    browser: {
      pre: pre,
      post: post
    }
  }
}
