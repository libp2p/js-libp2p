/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { IPFS } from '@multiformats/mafmt'
import { bootstrap, BootstrapComponents } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import partialValidPeerList from './fixtures/some-invalid-peers.js'
import { isPeerId } from '@libp2p/interface-peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import { start, stop } from '@libp2p/interfaces/startable'
import { StubbedInstance, stubInterface } from 'sinon-ts'
import type { PeerStore } from '@libp2p/interface-peer-store'

describe('bootstrap', () => {
  let components: BootstrapComponents
  let peerStore: StubbedInstance<PeerStore>

  beforeEach(async () => {
    peerStore = stubInterface<PeerStore>()

    components = {
      peerStore
    }
  })

  it('should throw if no peer list is provided', () => {
    // @ts-expect-error missing args
    expect(() => bootstrap()())
      .to.throw('Bootstrap requires a list of peer addresses')
  })

  it('should discover bootstrap peers', async function () {
    this.timeout(5 * 1000)
    const r = bootstrap({
      list: peerList,
      timeout: 100
    })(components)

    const p = new Promise((resolve) => {
      r.addEventListener('peer', resolve, {
        once: true
      })
    })
    await start(r)

    await p
    await stop(r)
  })

  it('should tag bootstrap peers', async function () {
    this.timeout(5 * 1000)

    const tagName = 'tag-tag'
    const tagValue = 10
    const tagTTL = 50

    const r = bootstrap({
      list: peerList,
      timeout: 100,
      tagName,
      tagValue,
      tagTTL
    })(components)

    const p = new Promise((resolve) => {
      r.addEventListener('peer', resolve, {
        once: true
      })
    })
    await start(r)

    await p

    const bootstrapper0ma = multiaddr(peerList[0])
    const bootstrapper0PeerIdStr = bootstrapper0ma.getPeerId()

    if (bootstrapper0PeerIdStr == null) {
      throw new Error('bootstrapper had no PeerID')
    }

    const bootstrapper0PeerId = peerIdFromString(bootstrapper0PeerIdStr)

    expect(peerStore.merge).to.have.property('called', true)

    const call = peerStore.merge.getCall(0)
    expect(call).to.have.deep.nested.property('args[0]', bootstrapper0PeerId)
    expect(call).to.have.deep.nested.property('args[1]', {
      tags: {
        [tagName]: {
          value: tagValue,
          ttl: tagTTL
        }
      }
    })

    await stop(r)
  })

  it('should not fail on malformed peers in peer list', async function () {
    this.timeout(5 * 1000)

    const r = bootstrap({
      list: partialValidPeerList,
      timeout: 100
    })(components)

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

    await start(r)

    await p
    await stop(r)
  })
})
