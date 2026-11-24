/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { TypedEventEmitter } from 'main-event'
import sinon from 'sinon'
import { persistentPeerStore } from '../src/index.ts'
import { peerIdToDatastoreKey } from '../src/utils/peer-id-to-datastore-key.ts'

const addr = multiaddr('/ip4/127.0.0.1/tcp/8000')

describe('write abort options', () => {
  for (const method of ['save', 'patch', 'merge'] as const) {
    it(`passes options to the datastore when calling ${method}`, async () => {
      const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const datastore = new MemoryDatastore()
      const put = sinon.spy(datastore, 'put')
      const peerStore = persistentPeerStore({
        peerId,
        events: new TypedEventEmitter(),
        datastore,
        logger: defaultLogger()
      })
      const options = { signal: new AbortController().signal }

      await peerStore[method](otherPeerId, { multiaddrs: [addr] }, options)

      expect(put.calledOnce).to.be.true()
      expect(put.firstCall.args[2]).to.equal(options)
    })
  }

  it('passes the signal to an async address filter during merge', async () => {
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const controller = new AbortController()
    let filterCalls = 0
    const peerStore = persistentPeerStore({
      peerId,
      events: new TypedEventEmitter(),
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      addressFilter: async (_peerId, _addr, options) => {
        await Promise.resolve()
        filterCalls++
        expect(options?.signal).to.equal(controller.signal)
        return true
      }
    })

    await peerStore.merge(otherPeerId, { multiaddrs: [addr] }, { signal: controller.signal })

    expect(filterCalls).to.equal(1)
  })

  it('does not persist a merge aborted during address filtering', async () => {
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const controller = new AbortController()
    const datastore = new MemoryDatastore()
    const originalPut = datastore.put.bind(datastore)
    const put = sinon.stub(datastore, 'put').callsFake(async (key, value, options) => {
      options?.signal?.throwIfAborted()
      return originalPut(key, value, options)
    })
    const peerStore = persistentPeerStore({
      peerId,
      events: new TypedEventEmitter(),
      datastore,
      logger: defaultLogger()
    }, {
      addressFilter: async () => {
        await Promise.resolve()
        controller.abort()
        return true
      }
    })

    await expect(peerStore.merge(otherPeerId, { multiaddrs: [addr] }, { signal: controller.signal }))
      .to.eventually.be.rejected.with.property('name', 'AbortError')

    expect(put.calledOnce).to.be.true()
    expect(await datastore.has(peerIdToDatastoreKey(otherPeerId))).to.be.false()
  })
})
