'use strict'

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const Swarm = require('./src')
const spdy = require('libp2p-spdy')
const fs = require('fs')
const path = require('path')

const sigServer = require('libp2p-webrtc-star/src/sig-server')

let swarmA
let swarmB
let sigS

const options = {
  port: 15555,
  host: '127.0.0.1'
}

function before (done) {
  function createListenerA (cb) {
    PeerId.createFromJSON(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, './test/test-data/id-1.json'))
      ),
      (err, id) => {
        if (err) {
          return cb(err)
        }

        const peerA = new PeerInfo(id)
        const maA = '/ip4/127.0.0.1/tcp/9100/ws'

        peerA.multiaddrs.add(maA)
        swarmA = new Swarm(peerA, new PeerBook())

        swarmA.transport.add('ws', new WebSockets())
        swarmA.transport.listen('ws', {}, echo, cb)
      })
  }

  function createListenerB (cb) {
    PeerId.createFromJSON(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, './test/test-data/id-2.json'))
      ),
      (err, id) => {
        if (err) {
          return cb(err)
        }

        const peerB = new PeerInfo(id)
        const maB = '/ip4/127.0.0.1/tcp/9200/ws'

        peerB.multiaddrs.add(maB)
        swarmB = new Swarm(peerB, new PeerBook())

        swarmB.transport.add('ws', new WebSockets())
        swarmB.connection.addStreamMuxer(spdy)
        swarmB.connection.reuse()
        swarmB.listen(cb)
        swarmB.handle('/echo/1.0.0', echo)
      })
  }

  let count = 0
  const ready = () => ++count === 3 ? done() : null

  createListenerA(ready)
  createListenerB(ready)
  sigS = sigServer.start(options, ready)

  function echo (protocol, conn) {
    pull(conn, conn)
  }
}

function after (done) {
  let count = 0
  const ready = () => ++count === 3 ? done() : null

  swarmA.transport.close('ws', ready)
  swarmB.close(ready)
  sigS.stop(ready)
}

module.exports = {
  hooks: {
    browser: {
      pre: before,
      post: after
    }
  }
}
