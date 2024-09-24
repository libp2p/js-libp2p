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
import { type Message, MessageType } from '../../../src/message/dht.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import { GetValueHandler, type GetValueHandlerComponents } from '../../../src/rpc/handlers/get-value.js'
import * as utils from '../../../src/utils.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { Libp2pEvents, PeerId, PeerStore } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { SinonStubbedInstance } from 'sinon'

const T = MessageType.GET_VALUE

describe('rpc - handlers - GetValue', () => {
  let peerId: PeerId
  let sourcePeer: PeerId
  let closerPeer: PeerId
  let targetPeer: PeerId
  let handler: GetValueHandler
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let peerStore: PeerStore
  let datastore: Datastore

  beforeEach(async () => {
    peerId = await createPeerId()
    sourcePeer = await createPeerId()
    closerPeer = await createPeerId()
    targetPeer = await createPeerId()
    peerRouting = Sinon.createStubInstance(PeerRouting)
    datastore = new MemoryDatastore()
    peerStore = persistentPeerStore({
      peerId,
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
      logPrefix: ''
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
      await handler.handle(sourcePeer, msg)
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

    await datastore.put(utils.bufferToRecordKey(key), record.serialize().subarray())

    const msg: Message = {
      type: T,
      key,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline.withArgs(msg.key, sourcePeer).resolves([])

    const response = await handler.handle(sourcePeer, msg)

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

    peerRouting.getCloserPeersOffline.withArgs(key, sourcePeer)
      .resolves([{
        id: closerPeer,
        multiaddrs: []
      }])

    const msg: Message = {
      type: T,
      key,
      closer: [],
      providers: []
    }
    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response).to.have.nested.property('closer[0].id').that.deep.equals(closerPeer.toMultihash().bytes)
  })

  describe('public key', () => {
    it('peer in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      if (targetPeer.publicKey == null) {
        throw new Error('targetPeer had no public key')
      }

      await peerStore.merge(targetPeer, {
        publicKey: targetPeer.publicKey
      })

      const response = await handler.handle(sourcePeer, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      if (response.record == null) {
        throw new Error('No record returned')
      }

      const responseRecord = Libp2pRecord.deserialize(response.record)

      expect(responseRecord).to.have.property('value').that.equalBytes(publicKeyToProtobuf(targetPeer.publicKey))
    })

    it('peer not in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg: Message = {
        type: T,
        key,
        closer: [],
        providers: []
      }

      peerRouting.getCloserPeersOffline.resolves([])

      const response = await handler.handle(sourcePeer, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response.record).to.not.be.ok()
    })
  })
})
