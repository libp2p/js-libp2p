'use strict'

const WS = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const WebSocketStar = require('libp2p-websocket-star')
const Bootstrap = require('libp2p-railing')
const SPDY = require('libp2p-spdy')
const MPLEX = require('libp2p-mplex')
const KadDHT = require('libp2p-kad-dht')
const SECIO = require('libp2p-secio')
const defaultsDeep = require('lodash.defaultsdeep')
const libp2p = require('../..')

function mapMuxers (list) {
  return list.map((pref) => {
    if (typeof pref !== 'string') { return pref }
    switch (pref.trim().toLowerCase()) {
      case 'spdy': return SPDY
      case 'mplex': return MPLEX
      default:
        throw new Error(pref + ' muxer not available')
    }
  })
}

function getMuxers (options) {
  if (options) {
    return mapMuxers(options)
  } else {
    return [MPLEX, SPDY]
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
          wsStar
        ],
        streamMuxer: getMuxers(_options.muxer),
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          // NOTE: defaultsDeep clones these references making the listeners be
          // attached to a clone and not the original. See the below how
          // to attach instances.
          // wrtcStar.discovery,
          // wsStar.discovery,
          Bootstrap
        ],
        peerRouting: [],
        contentRouting: [],
        dht: KadDHT
      },
      config: {
        peerDiscovery: {
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
        EXPERIMENTAL: {
          dht: false,
          pubsub: false
        }
      }
    }

    defaultsDeep(_options, defaults)

    // NOTE: defaultsDeep clones instances and screws things up
    _options.modules.transport.push(new WS()) // Test with transport instance
    _options.modules.peerDiscovery.push(wrtcStar.discovery)
    _options.modules.peerDiscovery.push(wsStar.discovery)

    super(_options)
  }
}

module.exports = Node
