import { peerIdFromBytes } from '@libp2p/peer-id'
import { Multiaddr } from '@multiformats/multiaddr'
import { Libp2pRecord } from '@libp2p/record'
import Proto from './dht.js'
import type { PeerData } from '@libp2p/interfaces/peer-data'

export const MESSAGE_TYPE = Proto.Message.MessageType
export const CONNECTION_TYPE = Proto.Message.ConnectionType
export const MESSAGE_TYPE_LOOKUP = Object.keys(MESSAGE_TYPE)

type ConnectionType = 0|1|2|3|4

interface PBPeer {
  id: Uint8Array
  addrs: Uint8Array[]
  connection: ConnectionType
}

/**
 * Represents a single DHT control message.
 */
export class Message {
  public type: Proto.Message.MessageType
  public key: Uint8Array
  private clusterLevelRaw: number
  public closerPeers: PeerData[]
  public providerPeers: PeerData[]
  public record?: Libp2pRecord

  constructor (type: Proto.Message.MessageType, key: Uint8Array, level: number) {
    if (!(key instanceof Uint8Array)) {
      throw new Error('Key must be a Uint8Array')
    }

    this.type = type
    this.key = key
    this.clusterLevelRaw = level
    this.closerPeers = []
    this.providerPeers = []
    this.record = undefined
  }

  /**
   * @type {number}
   */
  get clusterLevel () {
    const level = this.clusterLevelRaw - 1
    if (level < 0) {
      return 0
    }

    return level
  }

  set clusterLevel (level) {
    this.clusterLevelRaw = level
  }

  /**
   * Encode into protobuf
   */
  serialize () {
    return Proto.Message.encode({
      key: this.key,
      type: this.type,
      clusterLevelRaw: this.clusterLevelRaw,
      closerPeers: this.closerPeers.map(toPbPeer),
      providerPeers: this.providerPeers.map(toPbPeer),
      record: this.record == null ? undefined : this.record.serialize()
    }).finish()
  }

  /**
   * Decode from protobuf
   */
  static deserialize (raw: Uint8Array) {
    const dec = Proto.Message.decode(raw)

    const msg = new Message(dec.type ?? 0, dec.key ?? Uint8Array.from([]), dec.clusterLevelRaw ?? 0)
    msg.closerPeers = dec.closerPeers.map(fromPbPeer)
    msg.providerPeers = dec.providerPeers.map(fromPbPeer)

    if (dec.record?.length != null) {
      msg.record = Libp2pRecord.deserialize(dec.record)
    }

    return msg
  }
}

function toPbPeer (peer: PeerData) {
  const output: PBPeer = {
    id: peer.id.toBytes(),
    addrs: (peer.multiaddrs ?? []).map((m) => m.bytes),
    connection: CONNECTION_TYPE.CONNECTED
  }

  return output
}

function fromPbPeer (peer: Proto.Message.IPeer) {
  if (peer.id == null) {
    throw new Error('Invalid peer in message')
  }

  return {
    id: peerIdFromBytes(peer.id),
    multiaddrs: (peer.addrs ?? []).map((a) => new Multiaddr(a)),
    protocols: []
  }
}
