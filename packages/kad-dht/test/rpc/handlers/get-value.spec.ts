/* eslint-env mocha */

import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { persistentPeerStore } from '@libp2p/peer-store'
import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
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

    peerRouting.getCloserPeersOffline.withArgs(msg.key, sourcePeer.peerId).resolves([])

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

    peerRouting.getCloserPeersOffline.withArgs(key, sourcePeer.peerId)
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

      peerRouting.getCloserPeersOffline.resolves([])

      const response = await handler.handle(sourcePeer.peerId, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response.record).to.not.be.ok()
    })
  })
})
