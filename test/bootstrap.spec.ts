/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { IPFS } from '@multiformats/mafmt'
import { PeerId } from '@libp2p/peer-id'
import { Bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import partialValidPeerList from './fixtures/some-invalid-peers.js'
import type { PeerData } from '@libp2p/interfaces/peer-data'

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

    const p = new Promise((resolve) => r.once('peer', resolve))
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
      r.once('peer', ({ id, multiaddrs }) => {
        expect(id).to.exist()
        expect(id).to.be.an.instanceOf(PeerId)
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

    let emitted: PeerData[] = []
    r.on('peer', p => emitted.push(p))

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
