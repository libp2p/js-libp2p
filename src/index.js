'use strict'

const { KadDHT } = require('./kad-dht')
const { DualKadDHT } = require('./dual-kad-dht')

/**
 * @typedef {import('./types').DHT} DHT
 * @typedef {import('./kad-dht').KadDHTOps} KadDHTOps
 * @typedef {import('./types').QueryEvent} QueryEvent
 * @typedef {import('./types').SendingQueryEvent} SendingQueryEvent
 * @typedef {import('./types').PeerResponseEvent} PeerResponseEvent
 * @typedef {import('./types').FinalPeerEvent} FinalPeerEvent
 * @typedef {import('./types').QueryErrorEvent} QueryErrorEvent
 * @typedef {import('./types').ProviderEvent} ProviderEvent
 * @typedef {import('./types').ValueEvent} ValueEvent
 * @typedef {import('./types').AddingPeerEvent} AddingPeerEvent
 * @typedef {import('./types').DialingPeerEvent} DialingPeerEvent
 */

module.exports = {
  /**
   * @param {KadDHTOps} opts
   * @returns {DHT}
   */
  create: (opts) => {
    return new DualKadDHT(
      new KadDHT({
        ...opts,
        protocol: '/ipfs/kad/1.0.0',
        lan: false
      }),
      new KadDHT({
        ...opts,
        protocol: '/ipfs/lan/kad/1.0.0',
        clientMode: false,
        lan: true
      }),
      opts.libp2p
    )
  }
}
