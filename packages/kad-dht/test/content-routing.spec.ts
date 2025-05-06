/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import sinon from 'sinon'
import { MessageType } from '../src/index.js'
import * as kadUtils from '../src/utils.js'
import { createValues } from './utils/create-values.js'
import { sortDHTs } from './utils/sort-closest-peers.js'
import { TestDHT } from './utils/test-dht.js'
import type { PeerId } from '@libp2p/interface'
import type { CID } from 'multiformats/cid'

describe('content routing', () => {
  let cid: CID
  let testDHT: TestDHT

  beforeEach(() => {
    testDHT = new TestDHT()
  })

  afterEach(async () => {
    await testDHT.teardown()
  })

  before(async function () {
    this.timeout(10 * 1000)

    cid = (await createValues(1))[0].cid
  })

  afterEach(() => {
    sinon.restore()
  })

  it('provides', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    sinon.spy(dhts[3].network, 'sendMessage')

    // connect peers
    await Promise.all([
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2]),
      testDHT.connect(dhts[2], dhts[3])
    ])

    // run provide operation
    await drain(dhts[3].provide(cid))

    // check network messages
    // @ts-expect-error fn is a spy
    const calls = dhts[3].network.sendMessage.getCalls().map(c => c.args)

    const peersSentMessage = new Set<string>()

    for (const [peerId, msg] of calls) {
      peersSentMessage.add(peerId.toString())

      expect(msg.type).equals(MessageType.ADD_PROVIDER)
      expect(msg.key).equalBytes(cid.multihash.bytes)
      expect(msg.providers.length).equals(1)
      expect(msg.providers[0].id).to.equalBytes(dhts[3].components.peerId.toMultihash().bytes)
    }

    // expect an ADD_PROVIDER message to be sent to each peer for each value
    expect([...peersSentMessage].sort()).to.deep.equal([
      dhts[0].components.peerId.toString(),
      dhts[1].components.peerId.toString(),
      dhts[2].components.peerId.toString()
    ].sort(), 'did not send ADD_PROVIDER to network peers')

    // Expect each DHT to find the provider of each value
    for (const d of dhts) {
      const events = await all(d.findProviders(cid))
      const provs = Object.values(events.reduce<Record<string, PeerId>>((acc, curr) => {
        if (curr.name === 'PEER_RESPONSE') {
          curr.providers.forEach(peer => {
            acc[peer.id.toString()] = peer.id
          })
        }

        return acc
      }, {}))

      expect(provs).to.have.length(1)
      expect(provs[0].toString()).to.equal(dhts[3].components.peerId.toString())
    }
  })

  it('provides if in server mode', async function () {
    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    // connect peers
    await Promise.all([
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2]),
      testDHT.connect(dhts[2], dhts[3])
    ])

    const sendMessageSpy = sinon.spy(dhts[0].network, 'sendMessage')

    await dhts[0].setMode('server')

    await drain(dhts[0].provide(cid))

    expect(sendMessageSpy.called).to.be.true()
  })

  it('find providers', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    // Connect
    await Promise.all([
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2])
    ])

    await Promise.all(dhts.map(async (dht) => { await drain(dht.provide(cid)) }))

    const events = await all(dhts[0].findProviders(cid))

    // find providers find all the 3 providers
    const provs = Object.values(events.reduce<Record<string, PeerId>>((acc, curr) => {
      if (curr.name === 'PEER_RESPONSE') {
        curr.providers.forEach(peer => {
          acc[peer.id.toString()] = peer.id
        })
      }

      return acc
    }, {}))
    expect(provs).to.have.length(3)
  })

  it('find providers from client', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))
    const clientDHT = await testDHT.spawn({ clientMode: true })

    // Connect
    await Promise.all([
      testDHT.connect(clientDHT, dhts[0]),
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2])
    ])

    await drain(dhts[2].provide(cid))

    // wait for messages to be handled
    await delay(1000)

    const events = await all(clientDHT.findProviders(cid))

    // find providers find all the 3 providers
    const provs = Object.values(events.reduce<Record<string, PeerId>>((acc, curr) => {
      if (curr.name === 'PEER_RESPONSE') {
        curr.providers.forEach(peer => {
          acc[peer.id.toString()] = peer.id
        })
      }

      return acc
    }, {}))
    expect(provs).to.have.length(1)
  })

  it('find provider published by client', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))
    const clientDHT = await testDHT.spawn({ clientMode: true })

    // Connect
    await Promise.all([
      testDHT.connect(clientDHT, dhts[0]),
      testDHT.connect(dhts[0], dhts[1])
    ])

    await drain(clientDHT.provide(cid))

    await delay(1e3)

    const events = await all(dhts[1].findProviders(cid))

    // find providers find the client provider
    const provs = Object.values(events.reduce<Record<string, PeerId>>((acc, curr) => {
      if (curr.name === 'PEER_RESPONSE') {
        curr.providers.forEach(peer => {
          acc[peer.id.toString()] = peer.id
        })
      }

      return acc
    }, {}))
    expect(provs).to.have.length(1)
  })

  it('find one provider locally', async function () {
    this.timeout(20 * 1000)

    const dht = await testDHT.spawn()

    sinon.stub(dht.components.peerStore, 'get').withArgs(dht.components.peerId)
      .resolves({
        id: dht.components.peerId,
        addresses: [],
        protocols: [],
        tags: new Map(),
        metadata: new Map()
      })
    sinon.stub(dht.providers, 'getProviders').resolves([dht.components.peerId])

    // Find provider
    const events = await all(dht.findProviders(cid))
    const provs = Object.values(events.reduce<Record<string, PeerId>>((acc, curr) => {
      if (curr.name === 'PEER_RESPONSE') {
        curr.providers.forEach(peer => {
          acc[peer.id.toString()] = peer.id
        })
      }

      return acc
    }, {}))
    expect(provs).to.have.length(1)
  })

  it('aborts provide operation when abort signal is triggered before starting', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    // Spy on network.sendMessage to verify it's not called after abort
    const sendMessageSpy = sinon.spy(dhts[3].network, 'sendMessage')

    // Connect peers
    await Promise.all([
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2]),
      testDHT.connect(dhts[2], dhts[3])
    ])

    const controller = new AbortController()
    controller.abort()

    const generator = dhts[3].provide(cid, { signal: controller.signal })
    expect(all(generator)).to.be.rejectedWith('Operation aborted')


    expect(sendMessageSpy.called).to.be.false('sendMessage should not be called when aborted')
  })

  it('properly terminates generator when a non-immediate abort signal is triggered', async function () {
    this.timeout(20 * 1000)

    const dhts = await sortDHTs(await Promise.all([
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn(),
      testDHT.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    // Connect peers
    await Promise.all([
      testDHT.connect(dhts[0], dhts[1]),
      testDHT.connect(dhts[1], dhts[2]),
      testDHT.connect(dhts[2], dhts[3])
    ])

    const sendMessageSpy = sinon.spy(dhts[3].network, 'sendMessage')

    const controller = new AbortController()
    
    // Start the provide operation
    const generator = dhts[3].provide(cid, { signal: controller.signal })
    
    // We want to push the generator manually to control timing
    const reader = async () => {
      const results = []
      try {
        for await (const event of generator) {
          results.push(event)
          // After we get the first few results, abort the operation
          if (results.length === 2) {
            controller.abort()
            // TODO: If this delay is removed, the generator terminates fine
            // This delay causes the generator to not terminate for some reason
            await delay(50) 
          }
        }
      } catch (err) {
        // We expect an abort error here
        // @ts-expect-error error is not typed
        expect(err.message).to.include('abort')
        return { results, aborted: true }
      }
      return { results, aborted: false }
    }

    console.log('reader before')
    const { results, aborted } = await reader()
    console.log('reader after')
    
    // We should have aborted
    expect(aborted).to.be.true('Generator should have thrown an abort error')
    
    // We should have received some events before the abort
    expect(results.length).to.be.greaterThan(0, 'Should have received some events before abort')
    
    // After aborting, if we try to get more from the generator, it should be done
    // Testing this requires using the original generator reference, but we've already
    // drained it. So instead we check side effects to confirm the operation stopped.
    
    // Wait a reasonable time for any pending operations to complete
    await delay(500)
    
    // Check that no new network calls were made after the abort
    const initialMessageCalls = sendMessageSpy.callCount
    await delay(200)
    
    // The number of calls should not have increased
    expect(sendMessageSpy.callCount).to.equal(initialMessageCalls, 
      'No new network calls should be made after abort')
  })
})
