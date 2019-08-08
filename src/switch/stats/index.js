'use strict'

const EventEmitter = require('events')

const Stat = require('./stat')
const OldPeers = require('./old-peers')

const defaultOptions = {
  computeThrottleMaxQueueSize: 1000,
  computeThrottleTimeout: 2000,
  movingAverageIntervals: [
    60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000 // 15 minutes
  ],
  maxOldPeersRetention: 50
}

const initialCounters = [
  'dataReceived',
  'dataSent'
]

const directionToEvent = {
  in: 'dataReceived',
  out: 'dataSent'
}

/**
 * Binds to message events on the given `observer` to generate stats
 * based on the Peer, Protocol and Transport used for the message. Stat
 * events will be emitted via the `update` event.
 *
 * @param {Observer} observer
 * @param {any} _options
 * @returns {Stats}
 */
module.exports = (observer, _options) => {
  const options = Object.assign({}, defaultOptions, _options)
  const globalStats = new Stat(initialCounters, options)

  const stats = Object.assign(new EventEmitter(), {
    start: start,
    stop: stop,
    global: globalStats,
    peers: () => Array.from(peerStats.keys()),
    forPeer: (peerId) => {
      return peerStats.get(peerId) || oldPeers.get(peerId)
    },
    transports: () => Array.from(transportStats.keys()),
    forTransport: (transport) => transportStats.get(transport),
    protocols: () => Array.from(protocolStats.keys()),
    forProtocol: (protocol) => protocolStats.get(protocol)
  })

  globalStats.on('update', propagateChange)

  const oldPeers = OldPeers(options.maxOldPeersRetention)
  const peerStats = new Map()
  const transportStats = new Map()
  const protocolStats = new Map()

  observer.on('peer:closed', (peerId) => {
    const peer = peerStats.get(peerId)
    if (peer) {
      peer.removeListener('update', propagateChange)
      peer.stop()
      peerStats.delete(peerId)
      oldPeers.set(peerId, peer)
    }
  })

  return stats

  function onMessage (peerId, transportTag, protocolTag, direction, bufferLength) {
    const event = directionToEvent[direction]

    if (transportTag) {
      // because it has a transport tag, this message is at the global level, so we account this
      // traffic as global.
      globalStats.push(event, bufferLength)

      // peer stats
      let peer = peerStats.get(peerId)
      if (!peer) {
        peer = oldPeers.get(peerId)
        if (peer) {
          oldPeers.delete(peerId)
        } else {
          peer = new Stat(initialCounters, options)
        }
        peer.on('update', propagateChange)
        peer.start()
        peerStats.set(peerId, peer)
      }
      peer.push(event, bufferLength)
    }

    // transport stats
    if (transportTag) {
      let transport = transportStats.get(transportTag)
      if (!transport) {
        transport = new Stat(initialCounters, options)
        transport.on('update', propagateChange)
        transportStats.set(transportTag, transport)
      }
      transport.push(event, bufferLength)
    }

    // protocol stats
    if (protocolTag) {
      let protocol = protocolStats.get(protocolTag)
      if (!protocol) {
        protocol = new Stat(initialCounters, options)
        protocol.on('update', propagateChange)
        protocolStats.set(protocolTag, protocol)
      }
      protocol.push(event, bufferLength)
    }
  }

  function start () {
    observer.on('message', onMessage)

    globalStats.start()

    for (const peerStat of peerStats.values()) {
      peerStat.start()
    }
    for (const transportStat of transportStats.values()) {
      transportStat.start()
    }
  }

  function stop () {
    observer.removeListener('message', onMessage)
    globalStats.stop()

    for (const peerStat of peerStats.values()) {
      peerStat.stop()
    }
    for (const transportStat of transportStats.values()) {
      transportStat.stop()
    }
  }

  function propagateChange () {
    stats.emit('update')
  }
}
