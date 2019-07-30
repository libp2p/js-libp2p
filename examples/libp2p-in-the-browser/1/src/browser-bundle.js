'use strict'

const WebRTCStar = require('libp2p-webrtc-star')
const WebSockets = require('libp2p-websockets')
const WebSocketStar = require('libp2p-websocket-star')
const Mplex = require('libp2p-mplex')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
const Bootstrap = require('libp2p-bootstrap')
const DHT = require('libp2p-kad-dht')
const libp2p = require('libp2p')

// Find this list at: https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-browser.json
const bootstrapList = [
  '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  '/dns4/sfo-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
  '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  '/dns4/sfo-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
  '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
  '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
]

class Node extends libp2p {
  constructor ({ peerInfo }) {
    const wrtcStar = new WebRTCStar({ id: peerInfo.id })
    const wsstar = new WebSocketStar({ id: peerInfo.id })

    const defaults = {
      modules: {
        transport: [
          wrtcStar,
          WebSockets,
          wsstar
        ],
        streamMuxer: [
          Mplex,
          SPDY
        ],
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          wrtcStar.discovery,
          wsstar.discovery,
          Bootstrap
        ],
        dht: DHT
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
            interval: 20e3,
            enabled: true,
            list: bootstrapList
          }
        },
        relay: {
          enabled: true,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          enabled: false
        },
        EXPERIMENTAL: {
          pubsub: false
        }
      },
      connectionManager: {
        minPeers: 10,
        maxPeers: 50
      }
    }

    super({ ...defaults, peerInfo })
  }
}

module.exports = Node
