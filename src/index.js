'use strict'

const { KadDHT } = require('./kad-dht')
const { DualKadDHT } = require('./dual-kad-dht')

/**
 * @typedef {import('./types').DHT} DHT
 * @typedef {import('./kad-dht').KadDHTOps} KadDHTOps
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
