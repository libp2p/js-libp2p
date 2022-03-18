'use strict'

const drain = require('it-drain')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 * @typedef {import('multiformats/cid').CID} CID
 */

/**
 * Wrapper class to convert events into returned values
 *
 * @implements {ContentRoutingModule}
 */
class DHTContentRouting {
  /**
   * @param {import('libp2p-kad-dht').DHT} dht
   */
  constructor (dht) {
    this._dht = dht
  }

  /**
   * @param {CID} cid
   */
  async provide (cid) {
    await drain(this._dht.provide(cid))
  }

  /**
   * @param {CID} cid
   * @param {*} options
   */
  async * findProviders (cid, options) {
    for await (const event of this._dht.findProviders(cid, options)) {
      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }
}

module.exports = { DHTContentRouting }
