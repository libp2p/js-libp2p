import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidPublicKeyError, NotFoundError } from '@libp2p/interface'
import { peerIdFromPublicKey, peerIdFromMultihash } from '@libp2p/peer-id'
import { Libp2pRecord } from '@libp2p/record'
import * as Digest from 'multiformats/hashes/digest'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { QueryError, InvalidRecordError } from '../errors.js'
import { MessageType } from '../message/dht.js'
import { PeerDistanceList } from '../peer-distance-list.js'
import {
  queryErrorEvent,
  finalPeerEvent,
  valueEvent
} from '../query/events.js'
import { verifyRecord } from '../record/validators.js'
import { convertBuffer, convertPeerId, keyForPublicKey } from '../utils.js'
import type { DHTRecord, FinalPeerEvent, QueryEvent, Validators } from '../index.js'
import type { Message } from '../message/dht.js'
import type { Network } from '../network.js'
import type { QueryManager, QueryOptions } from '../query/manager.js'
import type { QueryFunc } from '../query/types.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { ComponentLogger, Logger, Metrics, PeerId, PeerInfo, PeerStore, RoutingOptions } from '@libp2p/interface'

export interface PeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
  metrics?: Metrics
}

export interface PeerRoutingInit {
  routingTable: RoutingTable
  network: Network
  validators: Validators
  queryManager: QueryManager
  logPrefix: string
}

export class PeerRouting {
  private readonly log: Logger
  private readonly routingTable: RoutingTable
  private readonly network: Network
  private readonly validators: Validators
  private readonly queryManager: QueryManager
  private readonly peerStore: PeerStore
  private readonly peerId: PeerId

  constructor (components: PeerRoutingComponents, init: PeerRoutingInit) {
    this.routingTable = init.routingTable
    this.network = init.network
    this.validators = init.validators
    this.queryManager = init.queryManager
    this.peerStore = components.peerStore
    this.peerId = components.peerId
    this.log = components.logger.forComponent(`${init.logPrefix}:peer-routing`)

    this.findPeer = components.metrics?.traceFunction('libp2p.kadDHT.findPeer', this.findPeer.bind(this), {
      optionsIndex: 1
    }) ?? this.findPeer
    this.getClosestPeers = components.metrics?.traceFunction('libp2p.kadDHT.getClosestPeers', this.getClosestPeers.bind(this), {
      optionsIndex: 1
    }) ?? this.getClosestPeers
  }

  /**
   * Look if we are connected to a peer with the given id.
   * Returns its id and addresses, if found, otherwise `undefined`.
   */
  async findPeerLocal (peer: PeerId): Promise<PeerInfo | undefined> {
    let peerData
    const p = await this.routingTable.find(peer)

    if (p != null) {
      this.log('findPeerLocal found %p in routing table', peer)

      try {
        peerData = await this.peerStore.get(p)
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }

    if (peerData == null) {
      try {
        peerData = await this.peerStore.get(peer)
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }

    if (peerData != null) {
      this.log('findPeerLocal found %p in peer store', peer)

      return {
        id: peerData.id,
        multiaddrs: peerData.addresses.map((address) => address.multiaddr)
      }
    }

    return undefined
  }

  /**
   * Get a value via rpc call for the given parameters
   */
  async * _getValueSingle (peer: PeerId, key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    const msg: Partial<Message> = {
      type: MessageType.GET_VALUE,
      key
    }

    yield * this.network.sendRequest(peer, msg, options)
  }

  /**
   * Get the public key directly from a node
   */
  async * getPublicKeyFromNode (peer: PeerId, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    const pkKey = keyForPublicKey(peer)

    for await (const event of this._getValueSingle(peer, pkKey, options)) {
      yield event

      if (event.name === 'PEER_RESPONSE' && event.record != null) {
        const publicKey = publicKeyFromProtobuf(event.record.value)
        const recPeer = peerIdFromPublicKey(publicKey)

        // compare hashes of the pub key
        if (!recPeer.equals(peer)) {
          throw new InvalidPublicKeyError('public key does not match id')
        }

        if (recPeer.publicKey == null) {
          throw new InvalidPublicKeyError('public key missing')
        }

        yield valueEvent({
          from: peer,
          value: event.record.value
        }, options)
      }
    }

    throw new QueryError(`Node not responding with its public key: ${peer.toString()}`)
  }

  /**
   * Search for a peer with the given ID
   */
  async * findPeer (id: PeerId, options: RoutingOptions = {}): AsyncGenerator<FinalPeerEvent | QueryEvent> {
    this.log('findPeer %p', id)

    if (options.useCache !== false) {
      // Try to find locally
      const pi = await this.findPeerLocal(id)

      // already got it
      if (pi != null) {
        this.log('found local')
        yield finalPeerEvent({
          from: this.peerId,
          peer: pi
        }, options)
        return
      }
    }

    let foundPeer = false

    if (options.useNetwork !== false) {
      const self = this // eslint-disable-line @typescript-eslint/no-this-alias

      const findPeerQuery: QueryFunc = async function * ({ peer, signal }) {
        const request: Partial<Message> = {
          type: MessageType.FIND_NODE,
          key: id.toMultihash().bytes
        }

        for await (const event of self.network.sendRequest(peer, request, {
          ...options,
          signal
        })) {
          yield event

          if (event.name === 'PEER_RESPONSE') {
            const match = event.closer.find((p) => p.id.equals(id))

            // found the peer
            if (match != null) {
              yield finalPeerEvent({ from: event.from, peer: match }, options)
            }
          }
        }
      }

      for await (const event of this.queryManager.run(id.toMultihash().bytes, findPeerQuery, options)) {
        if (event.name === 'FINAL_PEER') {
          foundPeer = true
        }

        yield event
      }
    }

    if (!foundPeer) {
      yield queryErrorEvent({ from: this.peerId, error: new NotFoundError('Not found') }, options)
    }
  }

  /**
   * Kademlia 'FIND_NODE' operation on a key, which could be the bytes from
   * a multihash or a peer ID
   */
  async * getClosestPeers (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    this.log('getClosestPeers to %b', key)
    const kadId = await convertBuffer(key)
    const tablePeers = this.routingTable.closestPeers(kadId)
    const self = this // eslint-disable-line @typescript-eslint/no-this-alias

    const peers = new PeerDistanceList(kadId, this.routingTable.kBucketSize)
    await Promise.all(tablePeers.map(async peer => { await peers.add({ id: peer, multiaddrs: [] }) }))

    const getCloserPeersQuery: QueryFunc = async function * ({ peer, signal }) {
      self.log('closerPeersSingle %s from %p', uint8ArrayToString(key, 'base32'), peer)
      const request: Partial<Message> = {
        type: MessageType.FIND_NODE,
        key
      }

      yield * self.network.sendRequest(peer, request, {
        ...options,
        signal
      })
    }

    for await (const event of this.queryManager.run(key, getCloserPeersQuery, options)) {
      if (event.name === 'PEER_RESPONSE') {
        await Promise.all(event.closer.map(async peerData => {
          await peers.add(peerData)
        }))
      }

      yield event
    }

    this.log('found %d peers close to %b', peers.length, key)

    for (const peer of peers.peers) {
      yield finalPeerEvent({
        from: this.peerId,
        peer
      }, options)
    }
  }

  /**
   * Query a particular peer for the value for the given key.
   * It will either return the value or a list of closer peers.
   *
   * Note: The peerStore is updated with new addresses found for the given peer.
   */
  async * getValueOrPeers (peer: PeerId, key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    for await (const event of this._getValueSingle(peer, key, options)) {
      if (event.name === 'PEER_RESPONSE') {
        if (event.record != null) {
          // We have a record
          try {
            await this._verifyRecordOnline(event.record)
          } catch (err: any) {
            const errMsg = 'invalid record received, discarded'
            this.log(errMsg)

            yield queryErrorEvent({ from: event.from, error: new QueryError(errMsg) }, options)
            continue
          }
        }
      }

      yield event
    }
  }

  /**
   * Verify a record, fetching missing public keys from the network.
   * Throws an error if the record is invalid.
   */
  async _verifyRecordOnline (record: DHTRecord): Promise<void> {
    if (record.timeReceived == null) {
      throw new InvalidRecordError('invalid record received')
    }

    await verifyRecord(this.validators, new Libp2pRecord(record.key, record.value, record.timeReceived))
  }

  /**
   * Get the nearest peers to the given query, but if closer than self
   */
  async getCloserPeersOffline (key: Uint8Array, closerThan: PeerId): Promise<PeerInfo[]> {
    const output: PeerInfo[] = []

    // try getting the peer directly
    try {
      const multihash = Digest.decode(key)
      const targetPeerId = peerIdFromMultihash(multihash)

      const peer = await this.peerStore.get(targetPeerId)

      output.push({
        id: peer.id,
        multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
      })
    } catch {}

    const keyKadId = await convertBuffer(key)
    const ids = this.routingTable.closestPeers(keyKadId)
    const closerThanKadId = await convertPeerId(closerThan)
    const requesterXor = uint8ArrayXor(closerThanKadId, keyKadId)

    for (const peerId of ids) {
      const peerKadId = await convertPeerId(peerId)
      const peerXor = uint8ArrayXor(peerKadId, keyKadId)

      // only include if peer is closer than requester
      if (uint8ArrayXorCompare(peerXor, requesterXor) !== -1) {
        continue
      }

      try {
        const peer = await this.peerStore.get(peerId)

        output.push({
          id: peerId,
          multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
        })
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }

    if (output.length > 0) {
      this.log('getCloserPeersOffline found %d peer(s) closer to %b than %p', output.length, key, closerThan)
    } else {
      this.log('getCloserPeersOffline could not find peer closer to %b than %p with %d peers in the routing table', key, closerThan, this.routingTable.size)
    }

    return output
  }
}
