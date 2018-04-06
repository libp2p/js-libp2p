'use strict'

const EventEmitter = require('events')
const LatencyMonitor = require('latency-monitor').default
const debug = require('debug')('libp2p:connection-manager')

const defaultOptions = {
  maxPeers: Infinity,
  minPeers: 0,
  maxData: Infinity,
  maxSentData: Infinity,
  maxReceivedData: Infinity,
  maxEventLoopDelay: Infinity,
  pollInterval: 2000,
  movingAverageInterval: 60000
}

class ConnectionManager extends EventEmitter {
  constructor (libp2p, options) {
    super()
    this._libp2p = libp2p
    this._options = Object.assign({}, defaultOptions, options)
    this._options.maxPeersPerProtocol = fixMaxPeersPerProtocol(this._options.maxPeersPerProtocol)

    this._stats = libp2p.stats
    if (options && !this._stats) {
      throw new Error('No libp2p.stats')
    }

    this._peerValues = new Map()
    this._peers = new Map()
    this._peerProtocols = new Map()
    this._peerCountPerProtocol = new Map()
    this._onStatsUpdate = this._onStatsUpdate.bind(this)
    this._onPeerConnect = this._onPeerConnect.bind(this)
    this._onPeerDisconnect = this._onPeerDisconnect.bind(this)
  }

  start () {
    this._stats.on('update', this._onStatsUpdate)
    this._libp2p.on('peer:connect', this._onPeerConnect)
    this._libp2p.on('peer:disconnect', this._onPeerDisconnect)
    // latency monitor
    this._latencyMonitor = new LatencyMonitor({
      dataEmitIntervalMs: this._options.pollInterval
    })
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this._latencyMonitor.on('data', this._onLatencyMeasure)
  }

  stop () {
    this._stats.removeListener('update', this._onStatsUpdate)
    this._libp2p.removeListener('peer:connect', this._onPeerConnect)
    this._libp2p.removeListener('peer:disconnect', this._onPeerDisconnect)
    this._latencyMonitor.removeListener('data', this._onLatencyMeasure)
  }

  setPeerValue (peerId, value) {
    if (value < 0 || value > 1) {
      throw new Error('value should be a number between 0 and 1')
    }
    if (peerId.toB58String) {
      peerId = peerId.toB58String()
    }
    this._peerValues.set(peerId, value)
  }

  _onStatsUpdate () {
    const movingAvgs = this._stats.global.movingAverages
    const received = movingAvgs.dataReceived[this._options.movingAverageInterval].movingAverage()
    this._checkLimit('maxReceivedData', received)
    const sent = movingAvgs.dataSent[this._options.movingAverageInterval].movingAverage()
    this._checkLimit('maxSentData', sent)
    const total = received + sent
    this._checkLimit('maxData', total)
    debug('stats update', total)
  }

  _onPeerConnect (peerInfo) {
    const peerId = peerInfo.id.toB58String()
    debug('connected to %s', peerId)
    this._peerValues.set(peerId, 1)
    this._peers.set(peerId, peerInfo)
    this.emit('connected', peerId)
    this._checkLimit('maxPeers', this._peers.size)

    protocolsFromPeerInfo(peerInfo).forEach((protocolTag) => {
      const protocol = this._peerCountPerProtocol[protocolTag]
      if (!protocol) {
        this._peerCountPerProtocol[protocolTag] = 0
      }
      this._peerCountPerProtocol[protocolTag]++

      let peerProtocols = this._peerProtocols[peerId]
      if (!peerProtocols) {
        peerProtocols = this._peerProtocols[peerId] = new Set()
      }
      peerProtocols.add(protocolTag)
      this._checkProtocolMaxPeersLimit(protocolTag, this._peerCountPerProtocol[protocolTag])
    })
  }

  _onPeerDisconnect (peerInfo) {
    const peerId = peerInfo.id.toB58String()
    debug('disconnected from %s', peerId)
    this._peerValues.delete(peerId)
    this._peers.delete(peerId)

    const peerProtocols = this._peerProtocols[peerId]
    if (peerProtocols) {
      Array.from(peerProtocols).forEach((protocolTag) => {
        const peerCountForProtocol = this._peerCountPerProtocol[protocolTag]
        if (peerCountForProtocol) {
          this._peerCountPerProtocol[protocolTag]--
        }
      })
    }

    this.emit('disconnected', peerId)
  }

  _onLatencyMeasure (summary) {
    this._checkLimit('maxEventLoopDelay', summary.avgMs)
  }

  _checkLimit (name, value) {
    debug('checking limit. current value of %s is %d', name, value)
    const limit = this._options[name]
    if (value > limit) {
      debug('limit exceeded: %s, %d', name, value)
      this.emit('limit:exceeded', name, value)
      this._maybeDisconnectOne()
    }
  }

  _checkProtocolMaxPeersLimit (protocolTag, value) {
    debug('checking protocol limit. current value of %s is %d', protocolTag, value)
    const limit = this._options.maxPeersPerProtocol[protocolTag]
    if (value > limit) {
      debug('protocol max peers limit exceeded: %s, %d', protocolTag, value)
      this.emit('limit:exceeded', protocolTag, value)
      this._maybeDisconnectOne()
    }
  }

  _maybeDisconnectOne () {
    if (this._options.minPeers < this._peerValues.size) {
      const peerValues = Array.from(this._peerValues).sort(byPeerValue)
      const disconnectPeer = peerValues[0]
      if (disconnectPeer) {
        const peer = disconnectPeer[0]
        debug('forcing disconnection from %j', peer)
        this._disconnectPeer(peer)
      }
    }
  }

  _disconnectPeer (peerId) {
    debug('preemptively disconnecting peer', peerId)
    this.emit('disconnect:preemptive', peerId)
    const peer = this._peers.get(peerId)
    this._libp2p.hangUp(peer, (err) => {
      if (err) {
        this.emit('error', err)
      }
    })
  }
}

module.exports = ConnectionManager

function byPeerValue (peerValueEntryA, peerValueEntryB) {
  return peerValueEntryA[1] - peerValueEntryB[1]
}

function fixMaxPeersPerProtocol (maxPeersPerProtocol) {
  if (!maxPeersPerProtocol) {
    maxPeersPerProtocol = {}
  }

  Object.keys(maxPeersPerProtocol).forEach((transportTag) => {
    const max = maxPeersPerProtocol[transportTag]
    delete maxPeersPerProtocol[transportTag]
    maxPeersPerProtocol[transportTag.toLowerCase()] = max
  })

  return maxPeersPerProtocol
}

function protocolsFromPeerInfo (peerInfo) {
  const protocolTags = new Set()
  peerInfo.multiaddrs.forEach((multiaddr) => {
    multiaddr.protos().map(protocolToProtocolTag).forEach((protocolTag) => {
      protocolTags.add(protocolTag)
    })
  })

  return Array.from(protocolTags)
}

function protocolToProtocolTag (protocol) {
  return protocol.name.toLowerCase()
}
