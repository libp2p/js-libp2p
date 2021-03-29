'use strict'

const path = require('path')
const Libp2p = require('./src')
const { MULTIADDRS_WEBSOCKETS } = require('./test/fixtures/browser')
const Peers = require('./test/fixtures/peers')
const PeerId = require('peer-id')
const WebSockets = require('libp2p-websockets')
const Muxer = require('libp2p-mplex')
const { NOISE: Crypto } = require('libp2p-noise')
const pipe = require('it-pipe')
let libp2p

const before = async () => {
  // Use the last peer
  const peerId = await PeerId.createFromJSON(Peers[Peers.length - 1])

  libp2p = new Libp2p({
    addresses: {
      listen: [MULTIADDRS_WEBSOCKETS[0]]
    },
    peerId,
    modules: {
      transport: [WebSockets],
      streamMuxer: [Muxer],
      connEncryption: [Crypto]
    },
    config: {
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: false
        }
      },
      nat: {
        enabled: false
      }
    }
  })
  // Add the echo protocol
  libp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))

  await libp2p.start()
}

const after = async () => {
  await libp2p.stop()
}

/** @type {import('aegir').Options["build"]["config"]} */
const esbuild = {
  inject: [path.join(__dirname, './scripts/node-globals.js')]
}

/** @type {import('aegir').PartialOptions} */
module.exports = {
  build: {
    bundlesizeMax: '250kB'
  },
  test: {
    before,
    after,
    browser: {
      config: {
        buildConfig: esbuild
      }
    }
  }
}
