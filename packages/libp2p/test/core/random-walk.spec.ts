import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import map from 'it-map'
import take from 'it-take'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { RandomWalk as RandomWalkClass } from '../../src/random-walk.js'
import type { PeerRouting, PeerInfo, AbortOptions } from '@libp2p/interface'
import type { RandomWalk } from '@libp2p/interface-internal'

let port = 1234

async function createRandomPeerInfo (): Promise<PeerInfo> {
  port++

  return {
    id: await createEd25519PeerId(),
    multiaddrs: [
      multiaddr(`/ip4/123.123.123.123/tcp/${port}`)
    ]
  }
}

// eslint-disable-next-line require-yield
async function * slowIterator (): any {
  await delay(1000)
}

describe('random-walk', () => {
  let randomwalk: RandomWalk
  let peerRouting: StubbedInstance<PeerRouting>

  beforeEach(async () => {
    peerRouting = stubInterface<PeerRouting>()

    randomwalk = new RandomWalkClass({
      peerRouting,
      logger: defaultLogger()
    })
  })

  afterEach(async () => {
    await stop(randomwalk)
  })

  it('should perform a random walk', async () => {
    const randomPeer = await createRandomPeerInfo()

    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * () {
        yield randomPeer
      }())
      .onSecondCall().returns(slowIterator())

    const peers = await all(take(randomwalk.walk(), 1))

    expect(peers.map(peer => peer.id.toString())).to.include(randomPeer.id.toString())
  })

  it('should break out of a random walk', async () => {
    let yielded = 0

    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          yielded++
          yield await createRandomPeerInfo()
          options?.signal?.throwIfAborted()
        }
      }())
      .onSecondCall().returns(slowIterator())

    await drain(take(randomwalk.walk(), 1))

    expect(yielded).to.equal(1)
  })

  it('should keep walking until done', async () => {
    const randomPeer1 = await createRandomPeerInfo()
    const randomPeer2 = await createRandomPeerInfo()

    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * () {
        yield randomPeer1
      }())
      .onSecondCall().returns(async function * () {
        yield randomPeer2
      }())
      .onThirdCall().returns(slowIterator())

    const peers = await all(take(randomwalk.walk(), 2))

    expect(peers.map(peer => peer.id.toString())).to.deep.equal([
      randomPeer1.id.toString(),
      randomPeer2.id.toString()
    ])
  })

  it('should join an existing random walk', async () => {
    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * () {
        for (let i = 0; i < 100; i++) {
          yield await createRandomPeerInfo()
          await delay(100)
        }
      }())
      .onSecondCall().returns(slowIterator())

    const [
      peers1,
      peers2
    ] = await Promise.all([
      all(take(randomwalk.walk(), 2)),
      all(take(randomwalk.walk(), 2))
    ])

    expect(peers1.map(peer => peer.id.toString())).to.deep.equal(peers2.map(peer => peer.id.toString()))
  })

  it('should continue random walk until all consumers satisfied', async () => {
    let yielded = 0

    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          yielded++
          yield await createRandomPeerInfo()
          options?.signal?.throwIfAborted()
        }
      }())
      .onSecondCall().returns(slowIterator())

    await Promise.all([
      drain(take(randomwalk.walk(), 1)),
      drain(take(randomwalk.walk(), 2))
    ])

    expect(yielded).to.equal(2)
  })

  it('should not block walk on slow consumers', async () => {
    let yielded = 0

    peerRouting.getClosestPeers
      .onFirstCall().returns(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          yielded++
          yield await createRandomPeerInfo()
          options?.signal?.throwIfAborted()
        }
      }())
      .onSecondCall().returns(slowIterator())

    await Promise.all([
      drain(take(randomwalk.walk(), 5)),
      drain(map(take(randomwalk.walk(), 2), async peer => {
        await delay(100)
        return peer
      }))
    ])

    expect(yielded).to.equal(7)
  })
})
