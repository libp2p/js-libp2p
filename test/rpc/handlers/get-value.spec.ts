/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { Message, MESSAGE_TYPE } from '../../../src/message/index.js'
import { GetValueHandler, GetValueHandlerComponents } from '../../../src/rpc/handlers/get-value.js'
import * as utils from '../../../src/utils.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { SinonStubbedInstance } from 'sinon'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import Sinon from 'sinon'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import type { Datastore } from 'interface-datastore'
import { Libp2pRecord } from '@libp2p/record'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

const T = MESSAGE_TYPE.GET_VALUE

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
    peerStore = new PersistentPeerStore({
      peerId,
      datastore,
      events: new EventEmitter<Libp2pEvents>()
    })

    const components: GetValueHandlerComponents = {
      datastore,
      peerStore
    }

    handler = new GetValueHandler(components, {
      peerRouting
    })
  })

  it('errors when missing key', async () => {
    const msg = new Message(T, new Uint8Array(0), 0)

    try {
      await handler.handle(sourcePeer, msg)
    } catch (err: any) {
      expect(err.code).to.eql('ERR_INVALID_KEY')
      return
    }

    throw new Error('should error when missing key')
  })

  it('responds with a local value', async () => {
    const key = uint8ArrayFromString('hello')
    const value = uint8ArrayFromString('world')
    const record = new Libp2pRecord(key, value, new Date())

    await datastore.put(utils.bufferToRecordKey(key), record.serialize().subarray())

    const msg = new Message(T, key, 0)

    peerRouting.getCloserPeersOffline.withArgs(msg.key, sourcePeer).resolves([])

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.record).to.exist()
    expect(response).to.have.nested.property('record.key').that.equalBytes(key)
    expect(response).to.have.nested.property('record.value').that.equalBytes(value)
  })

  it('responds with closerPeers returned from the dht', async () => {
    const key = uint8ArrayFromString('hello')

    peerRouting.getCloserPeersOffline.withArgs(key, sourcePeer)
      .resolves([{
        id: closerPeer,
        multiaddrs: [],
        protocols: []
      }])

    const msg = new Message(T, key, 0)
    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response).to.have.nested.property('closerPeers[0].id').that.deep.equals(closerPeer)
  })

  describe('public key', () => {
    it('peer in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg = new Message(T, key, 0)

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

      expect(response).to.have.nested.property('record.value').that.equalBytes(targetPeer.publicKey)
    })

    it('peer not in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg = new Message(T, key, 0)

      peerRouting.getCloserPeersOffline.resolves([])

      const response = await handler.handle(sourcePeer, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response.record).to.not.be.ok()
    })
  })
})
