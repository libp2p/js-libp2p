/* eslint-env mocha */
'use strict'

const tests = require('libp2p-interfaces/src/pubsub/tests')

const Floodsub = require('../src')
const { createPeers } = require('./utils/create-peer')

describe('interface compliance', () => {
  let peers
  let pubsubNodes = []

  tests({
    async setup (number = 1, options = {}) {
      peers = await createPeers({ number })

      peers.forEach((peer) => {
        const floodsub = new Floodsub(peer, {
          emitSelf: true,
          ...options
        })

        pubsubNodes.push(floodsub)
      })

      return pubsubNodes
    },
    async teardown () {
      await Promise.all(pubsubNodes.map(ps => ps.stop()))
      peers.length && await Promise.all(peers.map(peer => peer.stop()))

      peers = undefined
      pubsubNodes = []
    }
  })
})
