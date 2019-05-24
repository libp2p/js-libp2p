'use strict'

const WS = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const WebSocketStar = require('libp2p-websocket-star')
const Bootstrap = require('libp2p-bootstrap')
const SPDY = require('libp2p-spdy')
const MPLEX = require('libp2p-mplex')
const PULLMPLEX = require('pull-mplex')
const KadDHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
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

function getMuxers (options) {
  if (options) {
    return mapMuxers(options)
  } else {
    return [PULLMPLEX, MPLEX, SPDY]
  }
}

class Node extends libp2p {
  constructor (_options) {
    _options = _options || {}

    const starOpts = { id: _options.peerInfo.id }
    const wrtcStar = new WebRTCStar(starOpts)
    const wsStar = new WebSocketStar(starOpts)

    const defaults = {
      modules: {
        transport: [
          wrtcStar,
          wsStar,
          new WS()
        ],
        streamMuxer: getMuxers(_options.muxer),
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          wrtcStar.discovery,
          wsStar.discovery,
          Bootstrap
        ],
        dht: KadDHT,
        pubsub: GossipSub
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          webRTCStar: {
            enabled: true
          },
          websocketStar: {
            enabled: true
          },
          bootstrap: {
            interval: 10000,
            enabled: false,
            list: _options.boostrapList
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
          enabled: false
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
