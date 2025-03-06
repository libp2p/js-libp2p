/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import filter from 'it-filter'
import last from 'it-last'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MessageType } from '../src/index.js'
import { peerResponseEvent } from '../src/query/events.js'
import * as kadUtils from '../src/utils.js'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import { sortDHTs } from './utils/sort-closest-peers.js'
import { TestDHT } from './utils/test-dht.js'
import type { PeerIdWithPrivateKey } from './utils/create-peer-id.js'
import type { FinalPeerEvent, QueryEvent, ValueEvent } from '../src/index.js'

async function findEvent (events: AsyncIterable<QueryEvent>, name: 'FINAL_PEER'): Promise<FinalPeerEvent>
async function findEvent (events: AsyncIterable<QueryEvent>, name: 'VALUE'): Promise<ValueEvent>
async function findEvent (events: AsyncIterable<QueryEvent>, name: string): Promise<QueryEvent> {
  const eventTypes = new Set<string>()

  const event = await last(
    filter(events, event => {
      eventTypes.add(event.name)
      return event.name === name
    })
  )

  if (event == null) {
    throw new Error(`No ${name} event found, saw ${Array.from(eventTypes).join()}`)
  }

  return event
}

describe('KadDHT', () => {
  let peerIds: PeerIdWithPrivateKey[]
  let testDHT: TestDHT

  beforeEach(() => {
    testDHT = new TestDHT()
  })

  afterEach(async () => {
    await testDHT.teardown()
  })

  before(async function () {
    this.timeout(10 * 1000)
    peerIds = await createPeerIdsWithPrivateKey(3)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('start and stop', () => {
    it('default mode', async () => {
      // off by default
      const dht = await testDHT.spawn({ clientMode: undefined }, false)

      const registrarHandleSpy = sinon.spy(dht.components.registrar, 'handle')

      await dht.start()
      // by default we start in client mode
      expect(registrarHandleSpy).to.have.property('callCount', 0)

      await dht.setMode('server')
      // now we should be in server mode
      expect(registrarHandleSpy).to.have.property('callCount', 1)

      await dht.stop()
    })

    it('server mode', async () => {
      // turn client mode off explicitly
      const dht = await testDHT.spawn({ clientMode: false }, false)

      const registrarHandleSpy = sinon.spy(dht.components.registrar, 'handle')

      await dht.start()
      // should have started in server mode
      expect(registrarHandleSpy).to.have.property('callCount', 1)

      await dht.setMode('server')
      // we were already in server mode, should have been a no-op
      expect(registrarHandleSpy).to.have.property('callCount', 1)

      await dht.stop()
    })

    it('client mode', async () => {
      // turn client mode on explicitly
      const dht = await testDHT.spawn({ clientMode: true }, false)

      const registrarHandleSpy = sinon.spy(dht.components.registrar, 'handle')

      await dht.start()
      await dht.stop()

      // should not have registered handler in client mode
      expect(registrarHandleSpy).to.have.property('callCount', 0)
    })

    it('should not fail when already started', async () => {
      const dht = await testDHT.spawn(undefined, false)

      await dht.start()
      await dht.start()
      await dht.start()

      await dht.stop()
    })

    it('should not fail to stop when was not started', async () => {
      const dht = await testDHT.spawn(undefined, false)

      await dht.stop()
    })
  })

  describe('content fetching', () => {
    it('put - get same node', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const dht = await testDHT.spawn()

      // Exchange data through the dht
      await drain(dht.put(key, value))

      const res = await last(dht.get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - get', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      // Connect nodes
      await testDHT.connect(dhtA, dhtB)

      // Exchange data through the dht
      await drain(dhtA.put(key, value))

      const res = await findEvent(dhtB.get(key), 'VALUE')
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - get calls progress handler', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      // Connect nodes
      await testDHT.connect(dhtA, dhtB)

      const putProgress = sinon.stub()

      // Exchange data through the dht
      await drain(dhtA.put(key, value, {
        onProgress: putProgress
      }))

      expect(putProgress).to.have.property('called', true)

      const getProgress = sinon.stub()

      await drain(dhtB.get(key, {
        onProgress: getProgress
      }))

      expect(getProgress).to.have.property('called', true)
    })

    it('put - should require a minimum number of peers to have successful puts', async function () {
      this.timeout(10 * 1000)

      const error = new Error('fake error')
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB, dhtC, dhtD] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn({
          // Stub verify record
          validators: {
            v: sinon.stub().rejects(error)
          }
        })
      ])

      await Promise.all([
        testDHT.connect(dhtA, dhtB),
        testDHT.connect(dhtA, dhtC),
        testDHT.connect(dhtA, dhtD)
      ])

      // DHT operations
      await drain(dhtA.put(key, value))

      const res = await last(dhtB.get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - get using key with no prefix (no selector available)', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      await testDHT.connect(dhtA, dhtB)

      // DHT operations
      await drain(dhtA.put(key, value))

      const res = await last(dhtB.get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - get using key from provided validator and selector', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/ipns/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn({
          validators: {
            ipns: sinon.stub().resolves()
          },
          selectors: {
            ipns: sinon.stub().returns(0)
          }
        }),
        testDHT.spawn({
          validators: {
            ipns: sinon.stub().resolves()
          },
          selectors: {
            ipns: sinon.stub().returns(0)
          }
        })
      ])

      await testDHT.connect(dhtA, dhtB)

      // DHT operations
      await drain(dhtA.put(key, value))

      const res = await last(dhtB.get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - get should fail if unrecognized key prefix in get', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v2/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      await testDHT.connect(dhtA, dhtB)

      await drain(dhtA.put(key, value))

      await expect(last(dhtA.get(key))).to.eventually.be.rejected
        .with.property('name', 'MissingSelectorError')
    })

    it('put - get with update', async function () {
      this.timeout(20 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const valueA = uint8ArrayFromString('worldA')
      const valueB = uint8ArrayFromString('worldB')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      const dhtASpy = sinon.spy(dhtA.network, 'sendRequest')

      // Put before peers connected
      await drain(dhtA.put(key, valueA))
      await drain(dhtB.put(key, valueB))

      // Connect peers
      await testDHT.connect(dhtA, dhtB)

      // Get values
      const resA = await last(dhtA.get(key))
      const resB = await last(dhtB.get(key))

      // First is selected
      expect(resA).to.have.property('value').that.equalBytes(valueA)
      expect(resB).to.have.property('value').that.equalBytes(valueA)

      let foundGetValue = false
      let foundPutValue = false

      for (const call of dhtASpy.getCalls()) {
        if (call.args[0].equals(dhtB.components.peerId) && call.args[1].type === 'GET_VALUE') {
          // query B
          foundGetValue = true
        }

        if (call.args[0].equals(dhtB.components.peerId) && call.args[1].type === 'PUT_VALUE') {
          // update B
          foundPutValue = true
        }
      }

      expect(foundGetValue).to.be.true('did not get value from dhtB')
      expect(foundPutValue).to.be.true('did not update value on dhtB')
    })

    it('layered get', async function () {
      this.timeout(40 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const dhts = await sortDHTs(await Promise.all([
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn()
      ]), await kadUtils.convertBuffer(key))

      // Connect all
      await Promise.all([
        testDHT.connect(dhts[0], dhts[1]),
        testDHT.connect(dhts[1], dhts[2]),
        testDHT.connect(dhts[2], dhts[3])
      ])

      // DHT operations
      await drain(dhts[3].put(key, value))

      const res = await last(dhts[0].get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('getMany with number of values = 1 goes out to swarm if there is no local value', async () => {
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')
      const rec = new Libp2pRecord(key, value, new Date())
      const dht = await testDHT.spawn()

      // Simulate returning a peer id to query
      sinon.stub(dht.routingTable, 'closestPeers').returns([peerIds[1]])
      // Simulate going out to the network and returning the record
      sinon.stub(dht.peerRouting, 'getValueOrPeers').callsFake(async function * (peer) {
        yield peerResponseEvent({
          messageType: MessageType.GET_VALUE,
          from: peer,
          record: rec
        })
      }) // eslint-disable-line require-await

      const res = await last(dht.get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })
  })

  describe('peer routing', () => {
    it('findPeer', async function () {
      this.timeout(240 * 1000)

      const dhts = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn(),
        testDHT.spawn()
      ])

      await Promise.all([
        testDHT.connect(dhts[0], dhts[1]),
        testDHT.connect(dhts[0], dhts[2]),
        testDHT.connect(dhts[0], dhts[3])
      ])

      const ids = dhts.map((d) => d.components.peerId)

      const finalPeer = await findEvent(dhts[0].findPeer(ids[ids.length - 1]), 'FINAL_PEER')

      expect(finalPeer.peer.id.equals(ids[ids.length - 1])).to.eql(true)
    })

    it('getClosestPeers', async function () {
      this.timeout(240 * 1000)

      const nDHTs = 30
      const dhts = await Promise.all(
        new Array(nDHTs).fill(0).map(async () => testDHT.spawn())
      )

      const connected: Array<Promise<void>> = []

      for (let i = 0; i < dhts.length - 1; i++) {
        connected.push(testDHT.connect(dhts[i], dhts[(i + 1) % dhts.length]))
      }

      await Promise.all(connected)

      const res = await all(filter(dhts[1].getClosestPeers(uint8ArrayFromString('foo')), event => event.name === 'FINAL_PEER'))

      expect(res).to.not.be.empty()
    })

    it('should not include requester in getClosestPeers PEER_RESPONSE', async function () {
      this.timeout(240 * 1000)

      const nDHTs = 30
      const dhts = await Promise.all(
        new Array(nDHTs).fill(0).map(async () => testDHT.spawn())
      )

      const connected: Array<Promise<void>> = []

      for (let i = 0; i < dhts.length - 1; i++) {
        connected.push(testDHT.connect(dhts[i], dhts[(i + 1) % dhts.length]))
      }

      await Promise.all(connected)

      const res = await all(dhts[1].getClosestPeers(dhts[2].components.peerId.toMultihash().bytes))
      expect(res).to.not.be.empty()

      // no peer should include itself in the response, only other peers that it
      // knows who are closer
      for (const event of res) {
        if (event.name !== 'PEER_RESPONSE') {
          continue
        }

        expect(event.closer.map(peer => peer.id.toString()))
          .to.not.include(dhts[1].components.peerId.toString())
      }
    })
  })

  describe('errors', () => {
    it('get should correctly handle an unexpected error', async function () {
      this.timeout(240 * 1000)

      const error = new Error('fake error')

      const [dhtA, dhtB] = await Promise.all([
        testDHT.spawn(),
        testDHT.spawn()
      ])

      await testDHT.connect(dhtA, dhtB)

      const stub = sinon.stub(dhtA.components.connectionManager, 'openConnection').rejects(error)

      const errors = await all(filter(dhtA.get(uint8ArrayFromString('/v/hello')), event => event.name === 'QUERY_ERROR'))

      expect(errors).to.have.lengthOf(1)
      expect(errors).to.have.nested.property('[0].error', error)

      stub.restore()
    })
  })
})
