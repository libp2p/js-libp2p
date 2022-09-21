import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Libp2pRecord } from '@libp2p/record'
import { Message as PBMessage } from './dht.js'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Uint8ArrayList } from 'uint8arraylist'

export const MESSAGE_TYPE = PBMessage.MessageType
export const CONNECTION_TYPE = PBMessage.ConnectionType
export const MESSAGE_TYPE_LOOKUP = Object.keys(MESSAGE_TYPE)

interface PBPeer {
  id: Uint8Array
  addrs: Uint8Array[]
  connection: PBMessage.ConnectionType
}

/**
 * Represents a single DHT control message.
 */
export class Message {
  public type: PBMessage.MessageType
  public key: Uint8Array
  private clusterLevelRaw: number
  public closerPeers: PeerInfo[]
  public providerPeers: PeerInfo[]
  public record?: Libp2pRecord

  constructor (type: PBMessage.MessageType, key: Uint8Array, level: number) {
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
    return PBMessage.encode({
      key: this.key,
      type: this.type,
      clusterLevelRaw: this.clusterLevelRaw,
      closerPeers: this.closerPeers.map(toPbPeer),
      providerPeers: this.providerPeers.map(toPbPeer),
      record: this.record == null ? undefined : this.record.serialize().subarray()
    })
  }

  /**
   * Decode from protobuf
   */
  static deserialize (raw: Uint8ArrayList | Uint8Array) {
    const dec = PBMessage.decode(raw)

    const msg = new Message(dec.type ?? PBMessage.MessageType.PUT_VALUE, dec.key ?? Uint8Array.from([]), dec.clusterLevelRaw ?? 0)
    msg.closerPeers = dec.closerPeers.map(fromPbPeer)
    msg.providerPeers = dec.providerPeers.map(fromPbPeer)

    if (dec.record?.length != null) {
      msg.record = Libp2pRecord.deserialize(dec.record)
    }

    return msg
  }
}

function toPbPeer (peer: PeerInfo) {
  const output: PBPeer = {
    id: peer.id.toBytes(),
    addrs: (peer.multiaddrs ?? []).map((m) => m.bytes),
    connection: CONNECTION_TYPE.CONNECTED
  }

  return output
}

function fromPbPeer (peer: PBMessage.Peer) {
  if (peer.id == null) {
    throw new Error('Invalid peer in message')
  }

  return {
    id: peerIdFromBytes(peer.id),
    multiaddrs: (peer.addrs ?? []).map((a) => multiaddr(a)),
    protocols: []
  }
}
