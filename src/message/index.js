'use strict'

const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const protons = require('protons')
const { Record } = require('libp2p-record')
const { Buffer } = require('buffer')
const pbm = protons(require('./dht.proto'))

const MESSAGE_TYPE = pbm.Message.MessageType
const CONNECTION_TYPE = pbm.Message.ConnectionType

/**
 * Represents a single DHT control message.
 */
class Message {
  /**
   * @param {MessageType} type
   * @param {Buffer} key
   * @param {number} level
   */
  constructor (type, key, level) {
    if (key && !Buffer.isBuffer(key)) {
      throw new Error('Key must be a buffer')
    }

    this.type = type
    this.key = key
    this._clusterLevelRaw = level
    this.closerPeers = []
    this.providerPeers = []
    this.record = null
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
   * @returns {Buffer}
   */
  serialize () {
    const obj = {
      key: this.key,
      type: this.type,
      clusterLevelRaw: this._clusterLevelRaw,
      closerPeers: this.closerPeers.map(toPbPeer),
      providerPeers: this.providerPeers.map(toPbPeer)
    }

    if (this.record) {
      if (Buffer.isBuffer(this.record)) {
        obj.record = this.record
      } else {
        obj.record = this.record.serialize()
      }
    }

    return pbm.Message.encode(obj)
  }

  /**
   * Decode from protobuf
   *
   * @param {Buffer} raw
   * @returns {Message}
   */
  static deserialize (raw) {
    const dec = pbm.Message.decode(raw)

    const msg = new Message(dec.type, dec.key, dec.clusterLevelRaw)

    msg.closerPeers = dec.closerPeers.map(fromPbPeer)
    msg.providerPeers = dec.providerPeers.map(fromPbPeer)
    if (dec.record) {
      msg.record = Record.deserialize(dec.record)
    }

    return msg
  }
}

Message.TYPES = MESSAGE_TYPE
Message.CONNECTION_TYPES = CONNECTION_TYPE

function toPbPeer (peer) {
  return {
    id: peer.id.id,
    addrs: (peer.multiaddrs || []).map((m) => m.buffer),
    connection: CONNECTION_TYPE.CONNECTED
  }
}

function fromPbPeer (peer) {
  return {
    id: new PeerId(peer.id),
    multiaddrs: peer.addrs.map((a) => multiaddr(a))
  }
}

module.exports = Message
