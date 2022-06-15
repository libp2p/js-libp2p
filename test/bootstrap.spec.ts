/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { IPFS } from '@multiformats/mafmt'
import { Bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import partialValidPeerList from './fixtures/some-invalid-peers.js'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { isPeerId } from '@libp2p/interface-peer-id'

describe('bootstrap', () => {
  it('should throw if no peer list is provided', () => {
    expect(() => new Bootstrap())
      .to.throw('Bootstrap requires a list of peer addresses')
  })

  it('find the other peer', async function () {
    this.timeout(5 * 1000)
    const r = new Bootstrap({
      list: peerList,
      interval: 2000
    })

    const p = new Promise((resolve) => r.addEventListener('peer', resolve, {
      once: true
    }))
    r.start()

    await p
    r.stop()
  })

  it('not fail on malformed peers in peer list', async function () {
    this.timeout(5 * 1000)

    const r = new Bootstrap({
      list: partialValidPeerList,
      interval: 2000
    })

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

  it('stop emitting events when stop() called', async function () {
    const interval = 100
    const r = new Bootstrap({
      list: peerList,
      interval
    })

    let emitted: PeerInfo[] = []
    r.addEventListener('peer', p => emitted.push(p.detail))

    // Should fire emit event for each peer in list on start,
    // so wait 50 milliseconds then check
    const p = new Promise((resolve) => setTimeout(resolve, 50))
    r.start()
    await p
    expect(emitted).to.have.length(peerList.length)

    // After stop is called, no more peers should be emitted
    emitted = []
    r.stop()
    await new Promise((resolve) => setTimeout(resolve, interval))
    expect(emitted).to.have.length(0)
  })
})
