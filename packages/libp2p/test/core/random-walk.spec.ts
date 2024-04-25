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
import pDefer from 'p-defer'
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
      .onFirstCall().callsFake(async function * () {
        yield randomPeer
      })
      .onSecondCall().returns(slowIterator())

    const peers = await all(take(randomwalk.walk(), 1))

    expect(peers.map(peer => peer.id.toString())).to.include(randomPeer.id.toString())
  })

  it('should break out of a random walk', async () => {
    let yielded = 0

    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          options?.signal?.throwIfAborted()
          yielded++
          yield await createRandomPeerInfo()
        }
      })
      .onSecondCall().returns(slowIterator())

    await drain(take(randomwalk.walk(), 1))

    expect(yielded).to.equal(1)
  })

  it('should throw if walking fails', async () => {
    const err = new Error('Oh no!')
    const randomPeer1 = await createRandomPeerInfo()

    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * () {
        yield randomPeer1
        throw err
      })
      .onThirdCall().returns(slowIterator())

    await expect(all(randomwalk.walk())).to.eventually.be.rejectedWith(err)
  })

  it('should keep walking until the consumer stops pulling', async () => {
    const randomPeer1 = await createRandomPeerInfo()
    const randomPeer2 = await createRandomPeerInfo()

    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * () {
        yield randomPeer1
      })
      .onSecondCall().callsFake(async function * () {
        yield randomPeer2
      })

    const peers = await all(take(randomwalk.walk(), 2))

    expect(peers.map(peer => peer.id.toString())).to.deep.equal([
      randomPeer1.id.toString(),
      randomPeer2.id.toString()
    ])
  })

  it('should join an existing random walk', async () => {
    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          options?.signal?.throwIfAborted()
          yield await createRandomPeerInfo()
          await delay(100)
        }
      })
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
      .onFirstCall().callsFake(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          options?.signal?.throwIfAborted()
          yielded++
          yield await createRandomPeerInfo()
        }
      })
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
      .onFirstCall().callsFake(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          options?.signal?.throwIfAborted()
          yielded++
          yield await createRandomPeerInfo()
        }
      })
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

  it('should unpause query if second consumer requires peers', async () => {
    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * (key, options?: AbortOptions) {
        for (let i = 0; i < 100; i++) {
          options?.signal?.throwIfAborted()
          yield await createRandomPeerInfo()
        }
      })
      .onSecondCall().returns(slowIterator())

    const deferred = pDefer()

    // one slow consumer starts
    const slowPeersPromise = all(map(take(randomwalk.walk(), 2), async (peer, index) => {
      if (index === 1) {
        deferred.resolve()
        await delay(100)
      }

      return peer
    }))

    // wait for slow consumer to have received the first peer
    await deferred.promise

    // start fast consumer
    const [
      slowPeers,
      fastPeers
    ] = await Promise.all([
      slowPeersPromise,
      all(take(randomwalk.walk(), 5))
    ])

    // both should hav got peers
    expect(slowPeers).to.have.lengthOf(2)
    expect(fastPeers).to.have.lengthOf(5)
  })

  it('should abort a slow query', async () => {
    peerRouting.getClosestPeers.returns(slowIterator())

    await expect(drain(randomwalk.walk({
      signal: AbortSignal.timeout(10)
    }))).to.eventually.be.rejected
      .with.property('code', 'ABORT_ERR')
  })
})
