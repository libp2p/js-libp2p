import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { persistentPeerStore } from '@libp2p/peer-store'
import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { TypedEventEmitter } from 'main-event'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PROVIDERS_VALIDITY } from '../../../src/constants.js'
import { MessageType } from '../../../src/message/dht.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import { GetValueHandler } from '../../../src/rpc/handlers/get-value.js'
import * as utils from '../../../src/utils.js'
import { createPeerIdWithPrivateKey } from '../../utils/create-peer-id.js'
import type { Message } from '../../../src/message/dht.js'
import type { GetValueHandlerComponents } from '../../../src/rpc/handlers/get-value.js'
import type { PeerAndKey } from '../../utils/create-peer-id.js'
import type { Libp2pEvents, PeerStore } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { SinonStubbedInstance } from 'sinon'

const T = MessageType.GET_VALUE

describe('rpc - handlers - GetValue', () => {
  let peerId: PeerAndKey
  let sourcePeer: PeerAndKey
  let closerPeer: PeerAndKey
  let targetPeer: PeerAndKey
  let handler: GetValueHandler
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let peerStore: PeerStore
  let datastore: Datastore

  beforeEach(async () => {
    peerId = await createPeerIdWithPrivateKey()
    sourcePeer = await createPeerIdWithPrivateKey()
    closerPeer = await createPeerIdWithPrivateKey()
    targetPeer = await createPeerIdWithPrivateKey()
    peerRouting = Sinon.createStubInstance(PeerRouting)
    datastore = new MemoryDatastore()
    peerStore = persistentPeerStore({
      peerId: peerId.peerId,
      datastore,
      events: new TypedEventEmitter<Libp2pEvents>(),
      logger: defaultLogger()
    })

    const components: GetValueHandlerComponents = {
      datastore,
      peerStore,
      logger: defaultLogger()
    }

    handler = new GetValueHandler(components, {
      peerRouting,
      logPrefix: 'dht',
      datastorePrefix: '/dht'
    })
  })

  it('errors when missing key', async () => {
    const msg: Message = {
      type: T,
      key: new Uint8Array(0),
      closer: [],
      providers: []
    }

    try {
      await handler.handle(sourcePeer.peerId, msg)
    } catch (err: any) {
      expect(err.name).to.equal('InvalidMessageError')
      return
    }

    throw new Error('should error when missing key')
  })

  it('responds with a local value', async () => {
    const key = uint8ArrayFromString('hello')
    const value = uint8ArrayFromString('world')
    const record = new Libp2pRecord(key, value, new Date())

    await datastore.put(utils.bufferToRecordKey('/dht/record', key), record.serialize().subarray())

    const msg: Message = {
      type: T,
      key,
      closer: [],
      providers: []
    }

    peerRouting.getClosestPeersOffline.withArgs(msg.key).resolves([])

    const response = await handler.handle(sourcePeer.peerId, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    if (response.record == null) {
      throw new Error('No record returned')
    }

    const responseRecord = Libp2pRecord.deserialize(response.record)
    expect(responseRecord).to.have.property('key').that.equalBytes(key)
    expect(responseRecord).to.have.property('value').that.equalBytes(value)
  })

  it('responds with closer peers returned from the dht', async () => {
    const key = uint8ArrayFromString('hello')

    peerRouting.getClosestPeersOffline.withArgs(key)
      .resolves([{
        id: closerPeer.peerId,
        multiaddrs: []
      }])

    const msg: Message = {
      type: T,
      key,
      closer: [],
      providers: []
    }
    const response = await handler.handle(sourcePeer.peerId, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response).to.have.nested.property('closer[0].id').that.deep.equals(closerPeer.peerId.toMultihash().bytes)
  })

  describe('public key', () => {
    it('peer in peer store', async () => {
      const key = utils.keyForPublicKey(targetPeer.peerId)
      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      if (targetPeer.peerId.publicKey == null) {
        throw new Error('targetPeer had no public key')
      }

      await peerStore.merge(targetPeer.peerId, {
        publicKey: targetPeer.peerId.publicKey
      })

      const response = await handler.handle(sourcePeer.peerId, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      if (response.record == null) {
        throw new Error('No record returned')
      }

      const responseRecord = Libp2pRecord.deserialize(response.record)

      expect(responseRecord).to.have.property('value').that.equalBytes(publicKeyToProtobuf(targetPeer.peerId.publicKey))
    })

    it('peer not in peer store', async () => {
      const key = utils.keyForPublicKey(targetPeer.peerId)
      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      peerRouting.getClosestPeersOffline.resolves([])

      const response = await handler.handle(sourcePeer.peerId, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response.record).to.not.be.ok()
    })
  })

  describe('record expiration', () => {
    it('should return valid record within PROVIDERS_VALIDITY period', async () => {
      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')
      const record = new Libp2pRecord(key, value, new Date())

      await datastore.put(utils.bufferToRecordKey('/dht/record', key), record.serialize())

      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      peerRouting.getClosestPeersOffline.withArgs(msg.key).resolves([])

      const response = await handler.handle(sourcePeer.peerId, msg)

      expect(response).to.not.be.undefined()
      expect(response.record).to.not.be.undefined()

      if (response.record != null) {
        const responseRecord = Libp2pRecord.deserialize(response.record)
        expect(responseRecord.value).to.equalBytes(value)
      }
    })

    it('should delete and return no record when expired beyond PROVIDERS_VALIDITY', async () => {
      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')
      // Create record with old timestamp (beyond PROVIDERS_VALIDITY)
      const oldTimestamp = new Date(Date.now() - PROVIDERS_VALIDITY - 1000)
      const record = new Libp2pRecord(key, value, oldTimestamp)

      const dsKey = utils.bufferToRecordKey('/dht/record', key)
      await datastore.put(dsKey, record.serialize())

      // Verify record exists before the test
      const existsBefore = await datastore.has(dsKey)
      expect(existsBefore).to.be.true()

      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      peerRouting.getClosestPeersOffline.withArgs(msg.key).resolves([])

      const response = await handler.handle(sourcePeer.peerId, msg)

      expect(response).to.not.be.undefined()
      expect(response.record).to.be.undefined()

      // Verify the expired record was deleted from datastore
      const existsAfter = await datastore.has(dsKey)
      expect(existsAfter).to.be.false()
    })
  })
})
