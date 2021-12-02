'use strict'

/**
 * This file uses aegir hooks to
 * set up a libp2p instance for browser nodes to relay through
 * before tests start
 */
const path = require('path')

const Libp2p = require('libp2p')
const PeerId = require('peer-id')

const WS = require('libp2p-websockets')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')

const RelayPeer = require('./test/fixtures/relay')

let libp2p

const before = async () => {
  // Use the last peer
  const peerId = await PeerId.createFromJSON(RelayPeer)

  libp2p = new Libp2p({
    addresses: {
      listen: [RelayPeer.multiaddr]
    },
    peerId,
    modules: {
      transport: [WS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE]
    },
    config: {
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: false
        }
      },
      pubsub: {
        enabled: false
      }
    }
  })

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
    bundlesizeMax: '143KB',
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
