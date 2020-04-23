'use strict'

// Compatibility with Go libp2p MDNS

const EE = require('events')
const Responder = require('./responder')
const Querier = require('./querier')

class GoMulticastDNS extends EE {
  constructor ({ peerId, multiaddrs, queryPeriod, queryInterval }) {
    super()
    this._started = false
    this._peerId = peerId
    this._multiaddrs = multiaddrs
    this._queryPeriod = queryPeriod
    this._queryInterval = queryInterval
    this._onPeer = this._onPeer.bind(this)
  }

  async start () {
    if (this._started) {
      return
    }

    this._started = true
    this._responder = new Responder({
      peerId: this._peerId,
      multiaddrs: this._multiaddrs
    })
    this._querier = new Querier({
      peerId: this._peerId,
      queryInterval: this._queryInterval,
      queryPeriod: this._queryPeriod
    })

    this._querier.on('peer', this._onPeer)

    await Promise.all([
      this._responder.start(),
      this._querier.start()
    ])
  }

  _onPeer (peerData) {
    this.emit('peer', peerData)
  }

  stop () {
    if (!this._started) return

    const responder = this._responder
    const querier = this._querier

    this._started = false
    this._responder = null
    this._querier = null

    querier.removeListener('peer', this._onPeer)

    return Promise.all([
      responder.stop(),
      querier.stop()
    ])
  }
}

module.exports = GoMulticastDNS
