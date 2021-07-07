'use strict'

const PeerId = require('peer-id')
const { Multiaddr } = require('multiaddr')
const { Record } = require('libp2p-record')
const Proto = require('./dht')

const MESSAGE_TYPE = Proto.Message.MessageType
const CONNECTION_TYPE = Proto.Message.ConnectionType

/**
 * @typedef {0|1|2|3|4} ConnectionType
 *
 * @typedef {object} PBPeer
 * @property {Uint8Array} id
 * @property {Uint8Array[]} addrs
 * @property {ConnectionType} connection
 *
 * @typedef {import('../index').PeerData} PeerData
 */

/**
 * Represents a single DHT control message.
 */
class Message {
  /**
   * @param {import('./dht').Message.MessageType} type
   * @param {Uint8Array} key
   * @param {number} level
   */
  constructor (type, key, level) {
    if (key && !(key instanceof Uint8Array)) {
      throw new Error('Key must be a Uint8Array')
    }

    this.type = type
    this.key = key
    this._clusterLevelRaw = level

    /** @type {PeerData[]} */
    this.closerPeers = []
    /** @type {PeerData[]} */
    this.providerPeers = []
    /** @type {import('libp2p-record').Record | undefined} */
    this.record = undefined
  }

  /**
   * @type {number}
   */
  get clusterLevel () {
    const level = this._clusterLevelRaw - 1
    if (level < 0) {
      return 0
    }

    return level
  }

  set clusterLevel (level) {
    this._clusterLevelRaw = level
  }

  /**
   * Encode into protobuf
   */
  serialize () {
    const obj = {
      key: this.key,
      type: this.type,
      clusterLevelRaw: this._clusterLevelRaw,
      closerPeers: this.closerPeers.map(toPbPeer),
      providerPeers: this.providerPeers.map(toPbPeer),

      /** @type {Uint8Array | undefined} */
      record: undefined
    }

    if (this.record) {
      if (this.record instanceof Uint8Array) {
        obj.record = this.record
      } else {
        obj.record = this.record.serialize()
      }
    }

    return Proto.Message.encode(obj).finish()
  }

  /**
   * Decode from protobuf
   *
   * @param {Uint8Array} raw
   */
  static deserialize (raw) {
    const dec = Proto.Message.decode(raw)

    const msg = new Message(dec.type || 0, dec.key || Uint8Array.from([]), dec.clusterLevelRaw || 0)

    msg.closerPeers = dec.closerPeers.map(fromPbPeer)
    msg.providerPeers = dec.providerPeers.map(fromPbPeer)

    if (dec.record && dec.record.length) {
      msg.record = Record.deserialize(dec.record)
    }

    return msg
  }
}

Message.TYPES = MESSAGE_TYPE
Message.CONNECTION_TYPES = CONNECTION_TYPE

/**
 * @param {PeerData} peer
 */
function toPbPeer (peer) {
  /** @type {PBPeer} */
  const output = {
    id: peer.id.id,
    addrs: (peer.multiaddrs || []).map((m) => m.bytes),
    connection: CONNECTION_TYPE.CONNECTED
  }

  return output
}

/**
 * @param {import('./dht').Message.IPeer} peer
 */
function fromPbPeer (peer) {
  return {
    // @ts-ignore id is optional on protobuf, but it will exist?
    id: new PeerId(peer.id),
    multiaddrs: (peer.addrs || []).map((a) => new Multiaddr(a))
  }
}

module.exports = Message
