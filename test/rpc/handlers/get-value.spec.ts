/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Message, MESSAGE_TYPE } from '../../../src/message/index.js'
import { GetValueHandler } from '../../../src/rpc/handlers/get-value.js'
import * as utils from '../../../src/utils.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { SinonStubbedInstance } from 'sinon'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import Sinon from 'sinon'
import type { KeyBook } from '@libp2p/interfaces/peer-store'
import { createPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import type { Datastore } from 'interface-datastore'

const T = MESSAGE_TYPE.GET_VALUE

describe('rpc - handlers - GetValue', () => {
  let peerId: PeerId
  let sourcePeer: PeerId
  let closerPeer: PeerId
  let targetPeer: PeerId
  let handler: DHTMessageHandler
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let keyBook: KeyBook
  let datastore: Datastore

  beforeEach(async () => {
    peerId = await createPeerId()
    sourcePeer = await createPeerId()
    closerPeer = await createPeerId()
    targetPeer = await createPeerId()
    peerRouting = Sinon.createStubInstance(PeerRouting)
    datastore = new MemoryDatastore()

    const peerStore = createPeerStore({
      peerId,
      datastore
    })
    keyBook = peerStore.keyBook

    handler = new GetValueHandler({
      keyBook,
      peerRouting,
      datastore
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

    await datastore.put(utils.bufferToRecordKey(key), value)

    const msg = new Message(T, key, 0)
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

    expect(response.record).to.exist()
    expect(response).to.have.nested.property('closerPeers[0].id').that.deep.equals(closerPeer)
  })

  describe('public key', () => {
    it('peer in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg = new Message(T, key, 0)

      if (targetPeer.publicKey == null) {
        throw new Error('targetPeer had no public key')
      }

      await keyBook.set(targetPeer, targetPeer.publicKey)

      const response = await handler.handle(sourcePeer, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response).to.have.nested.property('record.value').that.equalBytes(targetPeer.publicKey)
    })

    it('peer not in peerstore', async () => {
      const key = utils.keyForPublicKey(targetPeer)
      const msg = new Message(T, key, 0)
      const response = await handler.handle(sourcePeer, msg)

      if (response == null) {
        throw new Error('No response received from handler')
      }

      expect(response).to.not.have.nested.property('record')
    })
  })
})
