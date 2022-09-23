/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { IPFS } from '@multiformats/mafmt'
import { Bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import partialValidPeerList from './fixtures/some-invalid-peers.js'
import { isPeerId } from '@libp2p/interface-peer-id'
import { Components } from '@libp2p/components'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import delay from 'delay'

describe('bootstrap', () => {
  let components: Components

  beforeEach(() => {
    const datastore = new MemoryDatastore()
    const peerStore = new PersistentPeerStore()

    components = new Components({
      peerStore,
      datastore
    })

    peerStore.init(components)
  })

  it('should throw if no peer list is provided', () => {
    expect(() => new Bootstrap())
      .to.throw('Bootstrap requires a list of peer addresses')
  })

  it('should discover bootstrap peers', async function () {
    this.timeout(5 * 1000)
    const r = new Bootstrap({
      list: peerList,
      timeout: 100
    })
    r.init(components)

    const p = new Promise((resolve) => r.addEventListener('peer', resolve, {
      once: true
    }))
    r.start()

    await p
    r.stop()
  })

  it('should tag bootstrap peers', async function () {
    this.timeout(5 * 1000)

    const tagName = 'tag-tag'
    const tagValue = 10
    const tagTTL = 50

    const r = new Bootstrap({
      list: peerList,
      timeout: 100,
      tagName,
      tagValue,
      tagTTL
    })
    r.init(components)

    const p = new Promise((resolve) => r.addEventListener('peer', resolve, {
      once: true
    }))
    r.start()

    await p

    const bootstrapper0ma = multiaddr(peerList[0])
    const bootstrapper0PeerIdStr = bootstrapper0ma.getPeerId()

    if (bootstrapper0PeerIdStr == null) {
      throw new Error('bootstrapper had no PeerID')
    }

    const bootstrapper0PeerId = peerIdFromString(bootstrapper0PeerIdStr)

    const tags = await components.getPeerStore().getTags(bootstrapper0PeerId)

    expect(tags).to.have.lengthOf(1, 'bootstrap tag was not set')
    expect(tags).to.have.nested.property('[0].name', tagName, 'bootstrap tag had incorrect name')
    expect(tags).to.have.nested.property('[0].value', tagValue, 'bootstrap tag had incorrect value')

    await delay(tagTTL * 2)

    const tags2 = await components.getPeerStore().getTags(bootstrapper0PeerId)

    expect(tags2).to.have.lengthOf(0, 'bootstrap tag did not expire')

    r.stop()
  })

  it('should not fail on malformed peers in peer list', async function () {
    this.timeout(5 * 1000)

    const r = new Bootstrap({
      list: partialValidPeerList,
      timeout: 100
    })
    r.init(components)

    const p = new Promise<void>((resolve) => {
      r.addEventListener('peer', (evt) => {
        const { id, multiaddrs } = evt.detail

        expect(id).to.exist()
        expect(isPeerId(id)).to.be.true()
        expect(multiaddrs.length).to.eq(1)
        expect(IPFS.matches(multiaddrs[0].toString())).equals(true)
        resolve()
      })
    })

    r.start()

    await p
    r.stop()
  })
})
