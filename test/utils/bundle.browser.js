'use strict'

const WS = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const WebSocketStar = require('libp2p-websocket-star')
const spdy = require('libp2p-spdy')
const mplex = require('libp2p-mplex')
const secio = require('libp2p-secio')
const Railing = require('libp2p-railing')
const libp2p = require('../..')

function mapMuxers (list) {
  return list.map((pref) => {
    if (typeof pref !== 'string') {
      return pref
    }
    switch (pref.trim().toLowerCase()) {
      case 'spdy':
        return spdy
      case 'mplex':
        return mplex
      default:
        throw new Error(pref + ' muxer not available')
    }
  })
}

function getMuxers (options) {
  if (options) {
    return mapMuxers(options)
  } else {
    return [mplex, spdy]
  }
}

class Node extends libp2p {
  constructor (peerInfo, peerBook, options) {
    options = options || {}
    const wrtcStar = new WebRTCStar({ id: peerInfo.id })
    const wsStar = new WebSocketStar({ id: peerInfo.id })

    const modules = {
      transport: [
        new WS(),
        wrtcStar,
        wsStar
      ],
      connection: {
        muxer: getMuxers(options.muxer),
        crypto: [
          secio
        ]
      },
      discovery: []
    }

    if (options.webRTCStar) {
      modules.discovery.push(wrtcStar.discovery)
    }

    if (options.wsStar) {
      modules.discovery.push(wsStar.discovery)
    }

    if (options.bootstrap) {
      const r = new Railing(options.bootstrap)
      modules.discovery.push(r)
    }

    super(modules, peerInfo, peerBook, options)
  }
}

module.exports = Node
