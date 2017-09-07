'use strict'

const assert = require('assert')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const protons = require('protons')
const Record = require('libp2p-record').Record

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
    if (key) {
      assert(Buffer.isBuffer(key))
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
  const res = {
    id: peer.id.id,
    addrs: peer.multiaddrs.toArray().map((m) => m.buffer)
  }

  if (peer.isConnected()) {
    res.connection = CONNECTION_TYPE.CONNECTED
  } else {
    res.connection = CONNECTION_TYPE.NOT_CONNECTED
  }

  return res
}

function fromPbPeer (peer) {
  const info = new PeerInfo(new PeerId(peer.id))
  peer.addrs.forEach((a) => info.multiaddrs.add(a))

  // TODO: upgrade protobuf to send the address connected on
  if (peer.connection === CONNECTION_TYPE.CONNECTED) {
    info.connect(peer.addrs[0])
  }

  return info
}

module.exports = Message
