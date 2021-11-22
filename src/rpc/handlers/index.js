'use strict'

const { Message } = require('../../message')
const { AddProviderHandler } = require('./add-provider')
const { FindNodeHandler } = require('./find-node')
const { GetProvidersHandler } = require('./get-providers')
const { GetValueHandler } = require('./get-value')
const { PingHandler } = require('./ping')
const { PutValueHandler } = require('./put-value')

/**
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 */

/**
 * @param {object} params
 * @param {import('peer-id')} params.peerId
 * @param {import('../../providers').Providers} params.providers
 * @param {import('../../types').PeerStore} params.peerStore
 * @param {import('../../types').Addressable} params.addressable
 * @param {import('../../peer-routing').PeerRouting} params.peerRouting
 * @param {import('interface-datastore').Datastore} params.records
 * @param {import('libp2p-interfaces/src/types').DhtValidators} params.validators
 * @param {boolean} [params.lan]
 */
module.exports = ({ peerId, providers, peerStore, addressable, peerRouting, records, validators, lan }) => {
  /** @type {Record<number, DHTMessageHandler>} */
  const handlers = {
    [Message.TYPES.GET_VALUE]: new GetValueHandler({ peerId, peerStore, peerRouting, records }),
    [Message.TYPES.PUT_VALUE]: new PutValueHandler({ validators, records }),
    [Message.TYPES.FIND_NODE]: new FindNodeHandler({ peerId, addressable, peerRouting, lan }),
    [Message.TYPES.ADD_PROVIDER]: new AddProviderHandler({ peerId, providers, peerStore }),
    [Message.TYPES.GET_PROVIDERS]: new GetProvidersHandler({ peerId, peerRouting, providers, peerStore, addressable, lan }),
    [Message.TYPES.PING]: new PingHandler()
  }

  /**
   * Get the message handler matching the passed in type.
   *
   * @param {number} type
   */
  function getMessageHandler (type) {
    return handlers[type]
  }

  return getMessageHandler
}
