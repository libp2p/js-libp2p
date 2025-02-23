import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
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
    id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
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
  let randomWalk: RandomWalk
  let peerRouting: StubbedInstance<PeerRouting>

  beforeEach(async () => {
    peerRouting = stubInterface<PeerRouting>()

    randomWalk = new RandomWalkClass({
      peerRouting,
      logger: defaultLogger()
    })
  })

  afterEach(async () => {
    await stop(randomWalk)
  })

  it('should perform a random walk', async () => {
    const randomPeer = await createRandomPeerInfo()

    peerRouting.getClosestPeers
      .onFirstCall().callsFake(async function * () {
        yield randomPeer
      })
      .onSecondCall().returns(slowIterator())

    const peers = await all(take(randomWalk.walk(), 1))

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

    await drain(take(randomWalk.walk(), 1))

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

    await expect(all(randomWalk.walk())).to.eventually.be.rejectedWith(err)
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

    const peers = await all(take(randomWalk.walk(), 2))

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
      all(take(randomWalk.walk(), 2)),
      all(take(randomWalk.walk(), 2))
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
      drain(take(randomWalk.walk(), 1)),
      drain(take(randomWalk.walk(), 2))
    ])

    expect(yielded).to.equal(3)
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
      drain(take(randomWalk.walk(), 5)),
      drain(map(take(randomWalk.walk(), 2), async peer => {
        await delay(100)
        return peer
      }))
    ])

    expect(yielded).to.equal(10)
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
    const slowPeersPromise = all(map(take(randomWalk.walk(), 2), async (peer, index) => {
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
      all(take(randomWalk.walk(), 5))
    ])

    // both should hav got peers
    expect(slowPeers).to.have.lengthOf(2)
    expect(fastPeers).to.have.lengthOf(5)
  })

  it('should abort a slow query', async () => {
    peerRouting.getClosestPeers.returns(slowIterator())

    await expect(drain(randomWalk.walk({
      signal: AbortSignal.timeout(10)
    }))).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })

  it('should allow an impatient consumer to abort a slow query but other consumers to receive values', async () => {
    peerRouting.getClosestPeers.callsFake(async function * (key, options?: AbortOptions) {
      await delay(100)

      for (let i = 0; i < 100; i++) {
        options?.signal?.throwIfAborted()
        yield await createRandomPeerInfo()
      }
    })

    const results = await Promise.allSettled([
      drain(randomWalk.walk({
        signal: AbortSignal.timeout(10)
      })),
      all(take(randomWalk.walk({
        signal: AbortSignal.timeout(5000)
      }), 2))
    ])

    expect(results).to.have.nested.property('[0].status', 'rejected')
    expect(results).to.have.nested.property('[0].reason.name', 'AbortError')

    expect(results).to.have.nested.property('[1].status', 'fulfilled')
    expect(results).to.have.nested.property('[1].value').with.lengthOf(2)
  })
})
