import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidMessageError, NotFoundError } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import {
  PROVIDERS_VALIDITY
} from '../../constants.js'
import { MessageType } from '../../message/dht.js'
import { bufferToRecordKey, isPublicKeyKey, fromPublicKeyKey } from '../../utils.js'
import type { Message } from '../../message/dht.js'
import type { PeerRouting } from '../../peer-routing/index.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerStore } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

export interface GetValueHandlerInit {
  peerRouting: PeerRouting
  logPrefix: string
  datastorePrefix: string
}

export interface GetValueHandlerComponents {
  peerStore: PeerStore
  datastore: Datastore
  logger: ComponentLogger
}

export class GetValueHandler implements DHTMessageHandler {
  private readonly peerStore: PeerStore
  private readonly datastore: Datastore
  private readonly peerRouting: PeerRouting
  private readonly log: Logger
  private readonly datastorePrefix: string

  constructor (components: GetValueHandlerComponents, init: GetValueHandlerInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:get-value`)
    this.datastorePrefix = `${init.datastorePrefix}/record`
    this.peerStore = components.peerStore
    this.datastore = components.datastore
    this.peerRouting = init.peerRouting
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    const key = msg.key

    this.log('%p asked for key %b', peerId, key)

    if (key == null || key.length === 0) {
      throw new InvalidMessageError('Invalid key')
    }

    const response: Message = {
      type: MessageType.GET_VALUE,
      key,
      clusterLevel: msg.clusterLevel,
      closer: [],
      providers: []
    }

    if (isPublicKeyKey(key)) {
      this.log('is public key')
      const idFromKey = fromPublicKeyKey(key)
      let pubKey: Uint8Array | undefined

      try {
        const peer = await this.peerStore.get(idFromKey)

        if (peer.id.publicKey == null) {
          throw new NotFoundError('No public key found in key book')
        }

        pubKey = publicKeyToProtobuf(peer.id.publicKey)
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }

      if (pubKey != null) {
        this.log('returning found public key')
        response.record = new Libp2pRecord(key, pubKey, new Date()).serialize()
        return response
      }
    }

    const [record, closer] = await Promise.all([
      this._checkLocalDatastore(key),
      this.peerRouting.getClosestPeersOffline(key)
    ])

    if (record != null) {
      this.log('had record for %b in local datastore', key)
      response.record = record.serialize()
    }

    if (closer.length > 0) {
      this.log('had %s closer peers in routing table', closer.length)
      response.closer = closer.map(peerInfo => ({
        id: peerInfo.id.toMultihash().bytes,
        multiaddrs: peerInfo.multiaddrs.map(ma => ma.bytes)
      }))
    }

    return response
  }

  /**
   * Try to fetch a given record by from the local datastore.
   * Returns the record if it is still valid, meaning
   * - it was either authored by this node, or
   * - it was received less than `PROVIDERS_VALIDITY` ago.
   */
  async _checkLocalDatastore (key: Uint8Array): Promise<Libp2pRecord | undefined> {
    this.log('checkLocalDatastore looking for %b', key)
    const dsKey = bufferToRecordKey(this.datastorePrefix, key)

    // Fetch value from ds
    let rawRecord
    try {
      rawRecord = await this.datastore.get(dsKey)
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return undefined
      }
      throw err
    }

    // Create record from the returned bytes
    const record = Libp2pRecord.deserialize(rawRecord)

    // Check validity: compare time received with max record age
    if (record.timeReceived == null ||
      Date.now() - record.timeReceived.getTime() > PROVIDERS_VALIDITY) {
      // If record is bad delete it and return
      await this.datastore.delete(dsKey)
      return undefined
    }

    // Record is valid
    return record
  }
}
