import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidPublicKeyError, NotFoundError } from '@libp2p/interface'
import { peerIdFromPublicKey, peerIdFromMultihash } from '@libp2p/peer-id'
import { Libp2pRecord } from '@libp2p/record'
import * as Digest from 'multiformats/hashes/digest'
import { QueryError, InvalidRecordError } from '../errors.js'
import { MessageType } from '../message/dht.js'
import { PeerDistanceList } from '../peer-distance-list.js'
import {
  queryErrorEvent,
  finalPeerEvent,
  valueEvent
} from '../query/events.js'
import { verifyRecord } from '../record/validators.js'
import { convertBuffer, keyForPublicKey } from '../utils.js'
import type { DHTRecord, FinalPeerEvent, QueryEvent, Validators } from '../index.js'
import type { Message } from '../message/dht.js'
import type { Network, SendMessageOptions } from '../network.js'
import type { QueryManager, QueryOptions } from '../query/manager.js'
import type { QueryFunc } from '../query/types.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { GetClosestPeersOptions } from '../routing-table/k-bucket.ts'
import type { ComponentLogger, Logger, Metrics, PeerId, PeerInfo, PeerStore, RoutingOptions } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { AbortOptions } from 'it-pushable'

export interface PeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
  metrics?: Metrics
  connectionManager: ConnectionManager
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
  private readonly components: PeerRoutingComponents

  constructor (components: PeerRoutingComponents, init: PeerRoutingInit) {
    this.routingTable = init.routingTable
    this.network = init.network
    this.validators = init.validators
    this.queryManager = init.queryManager
    this.components = components
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
  async findPeerLocal (peer: PeerId, options?: AbortOptions): Promise<PeerInfo | undefined> {
    let peerData
    const p = await this.routingTable.find(peer, options)

    if (p != null) {
      this.log('findPeerLocal found %p in routing table', peer)

      try {
        peerData = await this.components.peerStore.get(p, options)
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }

    if (peerData == null) {
      try {
        peerData = await this.components.peerStore.get(peer, options)
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
  async * _getValueSingle (peer: PeerId, key: Uint8Array, options: SendMessageOptions): AsyncGenerator<QueryEvent> {
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
    const path = {
      index: -1,
      queued: 0,
      running: 0,
      total: 0
    }

    for await (const event of this._getValueSingle(peer, pkKey, {
      ...options,
      path
    })) {
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
          value: event.record.value,
          path
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
      const pi = await this.findPeerLocal(id, options)

      // already got it
      if (pi != null) {
        this.log('found local')
        yield finalPeerEvent({
          from: this.components.peerId,
          peer: pi,
          path: {
            index: -1,
            queued: 0,
            running: 0,
            total: 0
          }
        }, options)
        return
      }
    }

    let foundPeer = false

    if (options.useNetwork !== false) {
      const self = this

      const findPeerQuery: QueryFunc = async function * ({ peer, signal, path }) {
        const request: Partial<Message> = {
          type: MessageType.FIND_NODE,
          key: id.toMultihash().bytes
        }

        for await (const event of self.network.sendRequest(peer.id, request, {
          ...options,
          signal,
          path
        })) {
          yield event

          if (event.name === 'PEER_RESPONSE') {
            const match = event.closer.find((p) => p.id.equals(id))

            // found the peer
            if (match != null) {
              yield finalPeerEvent({
                from: event.from,
                peer: match,
                path: event.path
              }, options)
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
      throw new NotFoundError('Not found')
    }
  }

  /**
   * Kademlia 'FIND_NODE' operation on a key, which could be the bytes from a
   * multihash or a peer ID
   */
  async * getClosestPeers (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    this.log('getClosestPeers to %b', key)
    const kadId = await convertBuffer(key, options)
    const peers = new PeerDistanceList(kadId, this.routingTable.kBucketSize)
    const self = this

    const getCloserPeersQuery: QueryFunc = async function * ({ peer, path, peerKadId, signal }) {
      self.log('getClosestPeers asking %p', peer.id)
      const request: Partial<Message> = {
        type: MessageType.FIND_NODE,
        key
      }

      yield * self.network.sendRequest(peer.id, request, {
        ...options,
        signal,
        path
      })

      // add the peer to the list if we've managed to contact it successfully
      peers.addWithKadId(peer, peerKadId, path)
    }

    yield * this.queryManager.run(key, getCloserPeersQuery, options)

    this.log('found %d peers close to %b', peers.length, key)

    for (let { peer, path } of peers.peers) {
      try {
        if (peer.multiaddrs.length === 0) {
          peer = await self.components.peerStore.getInfo(peer.id, options)
        }

        if (peer.multiaddrs.length === 0) {
          continue
        }

        yield finalPeerEvent({
          from: this.components.peerId,
          peer: await self.components.peerStore.getInfo(peer.id, options),
          path: {
            index: path.index,
            queued: 0,
            running: 0,
            total: 0
          }
        }, options)
      } catch {
        continue
      }
    }
  }

  /**
   * Query a particular peer for the value for the given key.
   * It will either return the value or a list of closer peers.
   *
   * Note: The peerStore is updated with new addresses found for the given peer.
   */
  async * getValueOrPeers (peer: PeerId, key: Uint8Array, options: SendMessageOptions): AsyncGenerator<QueryEvent> {
    for await (const event of this._getValueSingle(peer, key, options)) {
      if (event.name === 'PEER_RESPONSE') {
        if (event.record != null) {
          // We have a record
          try {
            await this._verifyRecordOnline(event.record, options)
          } catch (err: any) {
            const errMsg = 'invalid record received, discarded'
            this.log(errMsg)

            yield queryErrorEvent({
              from: event.from,
              error: new QueryError(errMsg),
              path: options.path
            }, options)
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
  async _verifyRecordOnline (record: DHTRecord, options?: AbortOptions): Promise<void> {
    if (record.timeReceived == null) {
      throw new InvalidRecordError('invalid record received')
    }

    await verifyRecord(this.validators, new Libp2pRecord(record.key, record.value, record.timeReceived), options)
  }

  /**
   * Get the peers in our routing table that are closest to the passed key
   */
  async getClosestPeersOffline (key: Uint8Array, options?: GetClosestPeersOptions): Promise<PeerInfo[]> {
    const output: PeerInfo[] = []

    // try getting the peer directly
    try {
      const multihash = Digest.decode(key)
      const targetPeerId = peerIdFromMultihash(multihash)

      const peer = await this.components.peerStore.get(targetPeerId, options)

      output.push({
        id: peer.id,
        multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
      })
    } catch {}

    const keyKadId = await convertBuffer(key, options)
    const ids = this.routingTable.closestPeers(keyKadId, options)

    for (const peerId of ids) {
      try {
        output.push(await this.components.peerStore.getInfo(peerId, options))
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }

    if (output.length > 0) {
      this.log('getClosestPeersOffline returning the %d closest peer(s) %b we know', output.length, key)
    } else {
      this.log('getClosestPeersOffline could not any peers close to %b with %d peers in the routing table', key, this.routingTable.size)
    }

    return output
  }
}
