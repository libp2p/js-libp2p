'use strict'

const gulp = require('gulp')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')

const Swarm = require('./src')
const spdy = require('libp2p-spdy')
const multiaddr = require('multiaddr')
const fs = require('fs')
const path = require('path')

const sigServer = require('libp2p-webrtc-star/src/signalling-server')

let swarmA
let swarmB
let sigS

gulp.task('test:browser:before', (done) => {
  function createListenerA (cb) {
    const id = PeerId.createFromJSON(
        JSON.parse(
          fs.readFileSync(
            path.join(__dirname, './test/test-data/id-1.json'))))

    const peerA = new PeerInfo(id)
    const maA = multiaddr('/ip4/127.0.0.1/tcp/9100/ws')

    peerA.multiaddr.add(maA)
    swarmA = new Swarm(peerA)
    swarmA.transport.add('ws', new WebSockets())
    swarmA.transport.listen('ws', {}, echo, cb)
  }

  function createListenerB (cb) {
    const id = PeerId.createFromJSON(
        JSON.parse(
          fs.readFileSync(
            path.join(__dirname, './test/test-data/id-2.json'))))

    const peerB = new PeerInfo(id)
    const maB = multiaddr('/ip4/127.0.0.1/tcp/9200/ws')

    peerB.multiaddr.add(maB)
    swarmB = new Swarm(peerB)

    swarmB.transport.add('ws', new WebSockets())
    swarmB.connection.addStreamMuxer(spdy)
    swarmB.connection.reuse()
    swarmB.listen(cb)
    swarmB.handle('/echo/1.0.0', echo)
  }

  let count = 0
  const ready = () => ++count === 3 ? done() : null

  createListenerA(ready)
  createListenerB(ready)
  sigS = sigServer.start(15555, ready)

  function echo (conn) {
    pull(conn, conn)
  }
})

gulp.task('test:browser:after', (done) => {
  let count = 0
  const ready = () => ++count === 3 ? done() : null

  swarmA.transport.close('ws', ready)
  swarmB.close(ready)
  sigS.stop(ready)
})

require('aegir/gulp')(gulp)
