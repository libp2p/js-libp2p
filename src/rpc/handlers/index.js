'use strict'

const T = require('../../message').TYPES

/**
 *
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const handlers = {
    [T.GET_VALUE]: require('./get-value')(dht),
    [T.PUT_VALUE]: require('./put-value')(dht),
    [T.FIND_NODE]: require('./find-node')(dht),
    [T.ADD_PROVIDER]: require('./add-provider')(dht),
    [T.GET_PROVIDERS]: require('./get-providers')(dht),
    [T.PING]: require('./ping')(dht)
  }

  /**
   * Get the message handler matching the passed in type.
   *
   * @param {number} type
   */
  function getMessageHandler (type) {
    // @ts-ignore ts does not aknowledge number as an index type
    return handlers[type]
  }

  return getMessageHandler
}
