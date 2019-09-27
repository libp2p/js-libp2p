'use strict'

// Compatibility with Go libp2p MDNS

const EE = require('events')
const Responder = require('./responder')
const Querier = require('./querier')

class GoMulticastDNS extends EE {
  constructor (peerInfo) {
    super()
    this._started = false
    this._peerInfo = peerInfo
    this._onPeer = this._onPeer.bind(this)
  }

  async start () {
    if (this._started) {
      return
    }

    this._started = true
    this._responder = new Responder(this._peerInfo)
    this._querier = new Querier(this._peerInfo.id)

    this._querier.on('peer', this._onPeer)

    await Promise.all([
      this._responder.start(),
      this._querier.start()
    ])
  }

  _onPeer (peerInfo) {
    this.emit('peer', peerInfo)
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
