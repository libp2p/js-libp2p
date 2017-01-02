'use strict'

const T = require('../../message').TYPES

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
   *
   * @returns {function(PeerInfo, Message, function(Error, Message))}
   *
   * @private
   */
  return function getMessageHandler (type) {
    return handlers[type]
  }
}
