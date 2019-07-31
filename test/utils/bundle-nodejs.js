'use strict'

const TCP = require('libp2p-tcp')
const MulticastDNS = require('libp2p-mdns')
const WS = require('libp2p-websockets')
const Bootstrap = require('libp2p-bootstrap')
const SPDY = require('libp2p-spdy')
const KadDHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const MPLEX = require('libp2p-mplex')
const PULLMPLEX = require('pull-mplex')
const SECIO = require('libp2p-secio')
const defaultsDeep = require('@nodeutils/defaults-deep')
const libp2p = require('../..')

function mapMuxers (list) {
  return list.map((pref) => {
    if (typeof pref !== 'string') { return pref }
    switch (pref.trim().toLowerCase()) {
      case 'spdy': return SPDY
      case 'mplex': return MPLEX
      case 'pullmplex': return PULLMPLEX
      default:
        throw new Error(pref + ' muxer not available')
    }
  })
}

function getMuxers (muxers) {
  const muxerPrefs = process.env.LIBP2P_MUXER
  if (muxerPrefs && !muxers) {
    return mapMuxers(muxerPrefs.split(','))
  } else if (muxers) {
    return mapMuxers(muxers)
  } else {
    return [PULLMPLEX, MPLEX, SPDY]
  }
}

class Node extends libp2p {
  constructor (_options) {
    const defaults = {
      modules: {
        transport: [
          TCP,
          WS
        ],
        streamMuxer: getMuxers(_options.muxer),
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          MulticastDNS,
          Bootstrap
        ],
        dht: KadDHT,
        pubsub: GossipSub
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          mdns: {
            interval: 10000,
            enabled: false
          },
          bootstrap: {
            interval: 10000,
            enabled: false,
            list: _options.bootstrapList
          }
        },
        relay: {
          enabled: false,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          kBucketSize: 20,
          randomWalk: {
            enabled: true
          },
          enabled: true
        },
        pubsub: {
          enabled: false
        }
      }
    }

    super(defaultsDeep(_options, defaults))
  }
}

module.exports = Node
