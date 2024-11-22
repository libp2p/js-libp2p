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
  let tdht: TestDHT

  beforeEach(() => {
    tdht = new TestDHT()
  })

  afterEach(async () => {
    await tdht.teardown()
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
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn()
    ]), await kadUtils.convertBuffer(cid.multihash.bytes))

    const ids = dhts.map((d) => d.components.peerId)
    sinon.spy(dhts[3].network, 'sendMessage')

    // connect peers
    await Promise.all([
      tdht.connect(dhts[0], dhts[1]),
      tdht.connect(dhts[1], dhts[2]),
      tdht.connect(dhts[2], dhts[3])
    ])

    // provide values
    await drain(dhts[3].provide(cid))

    // Expect an ADD_PROVIDER message to be sent to each peer for each value
    const fn = dhts[3].network.sendMessage
    // @ts-expect-error fn is a spy
    const calls = fn.getCalls().map(c => c.args)

    const peersSentMessage = new Set<string>()

    for (const [peerId, msg] of calls) {
      peersSentMessage.add(peerId.toString())
      expect(msg.type).equals(MessageType.ADD_PROVIDER)
      expect(msg.key).equalBytes(cid.multihash.bytes)
      expect(msg.providers.length).equals(1)
      expect(msg.providers[0].id).to.equalBytes(dhts[3].components.peerId.toMultihash().bytes)
    }

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
      expect(provs[0].toString()).to.equal(ids[3].toString())
    }
  })

  it('provides if in server mode', async function () {
    const dhts = await Promise.all([
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn()
    ])

    // connect peers
    await Promise.all([
      tdht.connect(dhts[0], dhts[1]),
      tdht.connect(dhts[1], dhts[2]),
      tdht.connect(dhts[2], dhts[3])
    ])

    const sendMessageSpy = sinon.spy(dhts[0].network, 'sendMessage')

    await dhts[0].setMode('server')

    await drain(dhts[0].provide(cid))

    expect(sendMessageSpy.called).to.be.true()
  })

  it('find providers', async function () {
    this.timeout(20 * 1000)

    const dhts = await Promise.all([
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn()
    ])

    // Connect
    await Promise.all([
      tdht.connect(dhts[0], dhts[1]),
      tdht.connect(dhts[1], dhts[2])
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

    const dhts = await Promise.all([
      tdht.spawn(),
      tdht.spawn(),
      tdht.spawn()
    ])
    const clientDHT = await tdht.spawn({ clientMode: true })

    // Connect
    await Promise.all([
      tdht.connect(clientDHT, dhts[0]),
      tdht.connect(dhts[0], dhts[1]),
      tdht.connect(dhts[1], dhts[2])
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

  it('find client provider', async function () {
    this.timeout(20 * 1000)

    const dhts = await Promise.all([
      tdht.spawn(),
      tdht.spawn()
    ])
    const clientDHT = await tdht.spawn({ clientMode: true })

    // Connect
    await Promise.all([
      tdht.connect(clientDHT, dhts[0]),
      tdht.connect(dhts[0], dhts[1])
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

    const dht = await tdht.spawn()

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
})
