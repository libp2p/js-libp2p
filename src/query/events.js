'use strict'

const { MESSAGE_TYPE_LOOKUP } = require('../message')

/** @type {import('../types').MessageName[]} */
const MESSAGE_NAMES = [
  'PUT_VALUE',
  'GET_VALUE',
  'ADD_PROVIDER',
  'GET_PROVIDERS',
  'FIND_NODE',
  'PING'
]

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').QueryEvent} QueryEvent
 * @typedef {import('../types').PeerData} PeerData
 * @typedef {import('../message').Message} Message
 * @typedef {import('../message/dht').Message.MessageType} MessageType
 * @typedef {import('../types').DHTRecord} Record
 */

/**
 * @param {object} fields
 * @param {PeerId} fields.to
 * @param {number} fields.type
 * @returns {import('../types').SendingQueryEvent}
 */
function sendingQueryEvent (fields) {
  return {
    ...fields,
    name: 'SENDING_QUERY',
    type: 0,
    // @ts-expect-error MESSAGE_TYPE_LOOKUP is string[]
    messageName: MESSAGE_TYPE_LOOKUP[fields.type],
    messageType: fields.type
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.from
 * @param {MessageType} fields.messageType
 * @param {PeerData[]} [fields.closer]
 * @param {PeerData[]} [fields.providers]
 * @param {Record} [fields.record]
 * @returns {import('../types').PeerResponseEvent}
 */
function peerResponseEvent (fields) {
  return {
    ...fields,
    name: 'PEER_RESPONSE',
    type: 1,
    messageName: MESSAGE_NAMES[fields.messageType],
    closer: fields.closer ? fields.closer : [],
    providers: fields.providers ? fields.providers : []
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.from
 * @param {PeerData} fields.peer
 * @returns {import('../types').FinalPeerEvent}
 */
function finalPeerEvent (fields) {
  return {
    ...fields,
    name: 'FINAL_PEER',
    type: 2
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.from
 * @param {Error} fields.error
 * @returns {import('../types').QueryErrorEvent}
 */
function queryErrorEvent (fields) {
  return {
    ...fields,
    name: 'QUERY_ERROR',
    type: 3
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.from
 * @param {PeerData[]} fields.providers
 * @returns {import('../types').ProviderEvent}
 */
function providerEvent (fields) {
  return {
    ...fields,
    name: 'PROVIDER',
    type: 4
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.from
 * @param {Uint8Array} fields.value
 * @returns {import('../types').ValueEvent}
 */
function valueEvent (fields) {
  return {
    ...fields,
    name: 'VALUE',
    type: 5
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.peer
 * @returns {import('../types').AddingPeerEvent}
 */
function addingPeerEvent (fields) {
  return {
    ...fields,
    name: 'ADDING_PEER',
    type: 6
  }
}

/**
 * @param {object} fields
 * @param {PeerId} fields.peer
 * @returns {import('../types').DialingPeerEvent}
 */
function dialingPeerEvent (fields) {
  return {
    ...fields,
    name: 'DIALING_PEER',
    type: 7
  }
}

module.exports = {
  sendingQueryEvent,
  peerResponseEvent,
  finalPeerEvent,
  queryErrorEvent,
  providerEvent,
  valueEvent,
  addingPeerEvent,
  dialingPeerEvent
}
