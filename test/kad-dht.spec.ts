/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import { Libp2pRecord } from '@libp2p/record'
import errcode from 'err-code'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import drain from 'it-drain'
import { EventTypes, FinalPeerEvent, MessageType, QueryEvent, ValueEvent } from '@libp2p/interfaces/dht'
import all from 'it-all'
import delay from 'delay'
import filter from 'it-filter'
import last from 'it-last'
import * as kadUtils from '../src/utils.js'
import * as c from '../src/constants.js'
import { MESSAGE_TYPE, MESSAGE_TYPE_LOOKUP } from '../src/message/index.js'
import { peerResponseEvent } from '../src/query/events.js'
import { createPeerIds } from './utils/create-peer-id.js'
import { createValues } from './utils/create-values.js'
import { TestDHT } from './utils/test-dht.js'
import { countDiffPeers } from './utils/index.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { CID } from 'multiformats/cid'
import type { DualKadDHT } from '../src/dual-kad-dht.js'
import { pipe } from 'it-pipe'
import map from 'it-map'

async function findEvent (events: AsyncIterable<QueryEvent>, name: 'FINAL_PEER'): Promise<FinalPeerEvent>
async function findEvent (events: AsyncIterable<QueryEvent>, name: 'VALUE'): Promise<ValueEvent>
async function findEvent (events: AsyncIterable<QueryEvent>, name: string) {
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
  let peerIds: PeerId[]
  let values: Array<{ cid: CID, value: Uint8Array }>
  let tdht: TestDHT

  beforeEach(() => {
    tdht = new TestDHT()
  })

  afterEach(async () => {
    await tdht.teardown()
  })

  before(async function () {
    this.timeout(10 * 1000)

    const res = await Promise.all([
      createPeerIds(3),
      createValues(20)
    ])

    peerIds = res[0]
    values = res[1]
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('create', () => {
    it('simple', async () => {
      const dht = await tdht.spawn({
        kBucketSize: 5
      })

      expect(dht).to.have.property('put')
      expect(dht).to.have.property('get')
      expect(dht).to.have.property('provide')
      expect(dht).to.have.property('findProviders')
      expect(dht).to.have.property('findPeer')
      expect(dht).to.have.property('getClosestPeers')
      expect(dht).to.have.property('getMode')
      expect(dht).to.have.property('setMode')
    })
  })

  describe('start and stop', () => {
    it('simple with defaults', async () => {
      const dht = await tdht.spawn(undefined, false)

      sinon.spy(dht.wan.network, 'start')
      sinon.spy(dht.wan.network, 'stop')
      sinon.spy(dht.lan.network, 'start')
      sinon.spy(dht.lan.network, 'stop')

      await dht.start()
      expect(dht.wan.network.start).to.have.property('calledOnce', true)
      expect(dht.lan.network.start).to.have.property('calledOnce', true)

      await dht.stop()
      expect(dht.wan.network.stop).to.have.property('calledOnce', true)
      expect(dht.lan.network.stop).to.have.property('calledOnce', true)
    })

    it('server mode', async () => {
      // Currently off by default
      const dht = await tdht.spawn(undefined, false)

      const registrarHandleSpy = sinon.spy(dht.components.getRegistrar(), 'handle')

      await dht.start()
      // lan dht is always in server mode
      expect(registrarHandleSpy).to.have.property('callCount', 1)

      await dht.setMode('server')
      // now wan dht should be in server mode too
      expect(registrarHandleSpy).to.have.property('callCount', 2)

      await dht.stop()
    })

    it('client mode', async () => {
      // Currently on by default
      const dht = await tdht.spawn({ clientMode: true }, false)

      const registrarHandleSpy = sinon.spy(dht.components.getRegistrar(), 'handle')

      await dht.start()
      await dht.stop()

      // lan dht is always in server mode, wan is not
      expect(registrarHandleSpy).to.have.property('callCount', 1)
    })

    it('should not fail when already started', async () => {
      const dht = await tdht.spawn(undefined, false)

      await dht.start()
      await dht.start()
      await dht.start()

      await dht.stop()
    })

    it('should not fail to stop when was not started', async () => {
      const dht = await tdht.spawn(undefined, false)

      await dht.stop()
    })
  })

  describe('content fetching', () => {
    it('put - get same node', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const dht = await tdht.spawn()

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
        tdht.spawn(),
        tdht.spawn()
      ])

      // Connect nodes
      await tdht.connect(dhtA, dhtB)

      // Exchange data through the dht
      await drain(dhtA.put(key, value))

      const res = await findEvent(dhtB.get(key), 'VALUE')
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('put - should require a minimum number of peers to have successful puts', async function () {
      this.timeout(10 * 1000)

      const errCode = 'ERR_NOT_AVAILABLE'
      const error = errcode(new Error('fake error'), errCode)
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB, dhtC, dhtD] = await Promise.all([
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn({
          // Stub verify record
          validators: {
            v: {
              func: sinon.stub().rejects(error)
            }
          }
        })
      ])

      await Promise.all([
        tdht.connect(dhtA, dhtB),
        tdht.connect(dhtA, dhtC),
        tdht.connect(dhtA, dhtD)
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
        tdht.spawn(),
        tdht.spawn()
      ])

      await tdht.connect(dhtA, dhtB)

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
        tdht.spawn({
          validators: {
            ipns: {
              func: sinon.stub().resolves()
            }
          },
          selectors: {
            ipns: sinon.stub().returns(0)
          }
        }),
        tdht.spawn({
          validators: {
            ipns: {
              func: sinon.stub().resolves()
            }
          },
          selectors: {
            ipns: sinon.stub().returns(0)
          }
        })
      ])

      await tdht.connect(dhtA, dhtB)

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
        tdht.spawn(),
        tdht.spawn()
      ])

      await tdht.connect(dhtA, dhtB)

      await drain(dhtA.put(key, value))

      await expect(last(dhtA.get(key))).to.eventually.be.rejected().property('code', 'ERR_UNRECOGNIZED_KEY_PREFIX')
    })

    it('put - get with update', async function () {
      this.timeout(20 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const valueA = uint8ArrayFromString('worldA')
      const valueB = uint8ArrayFromString('worldB')

      const [dhtA, dhtB] = await Promise.all([
        tdht.spawn(),
        tdht.spawn()
      ])

      const dhtASpy = sinon.spy(dhtA.lan.network, 'sendRequest')

      // Put before peers connected
      await drain(dhtA.put(key, valueA))
      await drain(dhtB.put(key, valueB))

      // Connect peers
      await tdht.connect(dhtA, dhtB)

      // Get values
      const resA = await last(dhtA.get(key))
      const resB = await last(dhtB.get(key))

      // First is selected
      expect(resA).to.have.property('value').that.equalBytes(valueA)
      expect(resB).to.have.property('value').that.equalBytes(valueA)

      expect(dhtASpy.callCount).to.eql(2)

      expect(dhtASpy.getCall(0).args[0].equals(dhtB.components.getPeerId())).to.be.true() // query B
      expect(MESSAGE_TYPE_LOOKUP[dhtASpy.getCall(0).args[1].type]).to.equal('GET_VALUE') // query B

      expect(dhtASpy.getCall(1).args[0].equals(dhtB.components.getPeerId())).to.be.true() // update B
      expect(MESSAGE_TYPE_LOOKUP[dhtASpy.getCall(1).args[1].type]).to.equal('PUT_VALUE') // update B
    })

    it('layered get', async function () {
      this.timeout(40 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const dhts = await Promise.all([
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn()
      ])

      // Connect all
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      // DHT operations
      await drain(dhts[3].put(key, value))

      const res = await last(dhts[0].get(key))
      expect(res).to.have.property('value').that.equalBytes(value)
    })

    it('getMany with nvals=1 goes out to swarm if there is no local value', async () => {
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')
      const rec = new Libp2pRecord(key, value)
      const dht = await tdht.spawn()

      // Simulate returning a peer id to query
      sinon.stub(dht.lan.routingTable, 'closestPeers').returns([peerIds[1]])
      // Simulate going out to the network and returning the record
      sinon.stub(dht.lan.peerRouting, 'getValueOrPeers').callsFake(async function * (peer) {
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

  describe('content routing', () => {
    it('provides', async function () {
      this.timeout(20 * 1000)

      const dhts = await Promise.all([
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn()
      ])

      const ids = dhts.map((d) => d.components.getPeerId())
      const idsB58 = ids.map(id => id.toString())
      sinon.spy(dhts[3].lan.network, 'sendMessage')

      // connect peers
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      // provide values
      await Promise.all(values.map(async (value) => await drain(dhts[3].provide(value.cid))))

      // Expect an ADD_PROVIDER message to be sent to each peer for each value
      const fn = dhts[3].lan.network.sendMessage
      const valuesBuffs = values.map(v => v.cid.bytes)
      // @ts-expect-error fn is a spy
      const calls = fn.getCalls().map(c => c.args)

      for (const [peerId, msg] of calls) {
        expect(idsB58).includes(peerId.toString())
        expect(msg.type).equals(MESSAGE_TYPE.ADD_PROVIDER)
        expect(valuesBuffs).includes(msg.key)
        expect(msg.providerPeers.length).equals(1)
        expect(msg.providerPeers[0].id.toString()).equals(idsB58[3])
      }

      // Expect each DHT to find the provider of each value
      let n = 0
      for (const v of values) {
        n = (n + 1) % 3

        const events = await all(dhts[n].findProviders(v.cid))
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

    it('does not provide to wan if in client mode', async function () {
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

      const wanSpy = sinon.spy(dhts[0].wan, 'provide')
      const lanSpy = sinon.spy(dhts[0].lan, 'provide')

      await drain(dhts[0].provide(values[0].cid))

      expect(wanSpy.called).to.be.false()
      expect(lanSpy.called).to.be.true()
    })

    it('provides to wan if in server mode', async function () {
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

      const wanSpy = sinon.spy(dhts[0].wan, 'provide')
      const lanSpy = sinon.spy(dhts[0].lan, 'provide')

      await dhts[0].setMode('server')

      await drain(dhts[0].provide(values[0].cid))

      expect(wanSpy.called).to.be.true()
      expect(lanSpy.called).to.be.true()
    })

    it('find providers', async function () {
      this.timeout(20 * 1000)

      const val = values[0]

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

      await Promise.all(dhts.map(async (dht) => await drain(dht.provide(val.cid))))

      const events = await all(dhts[0].findProviders(val.cid))

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

      const val = values[0]

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

      await Promise.all(dhts.map(async (dht) => await drain(dht.provide(val.cid))))

      const events = await all(dhts[0].findProviders(val.cid))

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

      const val = values[0]

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

      await drain(clientDHT.provide(val.cid))

      await delay(1e3)

      const events = await all(dhts[1].findProviders(val.cid))

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
      const val = values[0]

      const dht = await tdht.spawn()

      sinon.stub(dht.lan.providers, 'getProviders').resolves([dht.components.getPeerId()])

      // Find provider
      const events = await all(dht.findProviders(val.cid))
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

  describe('peer routing', () => {
    it('findPeer', async function () {
      this.timeout(240 * 1000)

      const dhts = await Promise.all([
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn()
      ])

      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[0], dhts[2]),
        tdht.connect(dhts[0], dhts[3])
      ])

      const ids = dhts.map((d) => d.components.getPeerId())

      const finalPeer = await findEvent(dhts[0].findPeer(ids[ids.length - 1]), 'FINAL_PEER')

      expect(finalPeer.peer.id.equals(ids[ids.length - 1])).to.eql(true)
    })

    it('find peer query', async function () {
      this.timeout(240 * 1000)

      // Create 101 nodes
      const nDHTs = 100

      const dhts = await Promise.all(
        new Array(nDHTs).fill(0).map(async () => await tdht.spawn())
      )

      const dhtsById: Map<PeerId, DualKadDHT> = new Map(dhts.map((d) => [d.components.getPeerId(), d]))
      const ids = [...dhtsById.keys()]

      // The origin node for the FIND_PEER query
      const originNode = dhts[0]

      // The key
      const val = uint8ArrayFromString('foobar')

      // Hash the key into the DHT's key format
      const rtval = await kadUtils.convertBuffer(val)
      // Make connections between nodes close to each other
      const sorted = await sortClosestPeers(ids, rtval)

      const conns = []
      const maxRightIndex = sorted.length - 1
      for (let i = 0; i < sorted.length; i++) {
        // Connect to 5 nodes on either side (10 in total)
        for (const distance of [1, 3, 11, 31, 63]) {
          let rightIndex = i + distance
          if (rightIndex > maxRightIndex) {
            rightIndex = maxRightIndex * 2 - (rightIndex + 1)
          }
          let leftIndex = i - distance
          if (leftIndex < 0) {
            leftIndex = 1 - leftIndex
          }
          conns.push([sorted[leftIndex], sorted[rightIndex]])
        }
      }

      await Promise.all(conns.map(async (conn) => {
        const dhtA = dhtsById.get(conn[0])
        const dhtB = dhtsById.get(conn[1])

        if (dhtA == null || dhtB == null) {
          throw new Error('Could not find DHT')
        }

        return await tdht.connect(dhtA, dhtB)
      }))

      // Get the alpha (3) closest peers to the key from the origin's
      // routing table
      const rtablePeers = originNode.lan.routingTable.closestPeers(rtval, c.ALPHA)
      expect(rtablePeers).to.have.length(c.ALPHA)

      // The set of peers used to initiate the query (the closest alpha
      // peers to the key that the origin knows about)
      const rtableSet: Record<string, boolean> = {}
      rtablePeers.forEach((p) => {
        rtableSet[p.toString()] = true
      })

      const originNodeIndex = ids.findIndex(i => uint8ArrayEquals(i.multihash.bytes, originNode.components.getPeerId().multihash.bytes))
      const otherIds = ids.slice(0, originNodeIndex).concat(ids.slice(originNodeIndex + 1))

      // Make the query
      const out = await pipe(
        originNode.getClosestPeers(val),
        source => filter(source, (event) => event.type === EventTypes.FINAL_PEER),
        // @ts-expect-error tsc has problems with filtering
        source => map(source, (event) => event.peer.id),
        async source => await all(source)
      )

      const actualClosest = await sortClosestPeers(otherIds, rtval)

      // Expect that the response includes nodes that are were not
      // already in the origin's routing table (ie it went out to
      // the network to find closer peers)
      expect(out.filter((p) => !rtableSet[p.toString()]))
        .to.not.be.empty()

      // The expected closest kValue peers to the key
      const exp = actualClosest.slice(0, c.K)

      // Expect the kValue peers found to include the kValue closest connected peers
      // to the key
      expect(countDiffPeers(out, exp)).to.equal(0)
    })

    it('getClosestPeers', async function () {
      this.timeout(240 * 1000)

      const nDHTs = 30
      const dhts = await Promise.all(
        new Array(nDHTs).fill(0).map(async () => await tdht.spawn())
      )

      for (let i = 0; i < dhts.length - 1; i++) {
        await tdht.connect(dhts[i], dhts[(i + 1) % dhts.length])
      }

      const res = await all(filter(dhts[1].getClosestPeers(uint8ArrayFromString('foo')), event => event.name === 'FINAL_PEER'))

      expect(res).to.not.be.empty()
    })
  })

  describe('errors', () => {
    it('get should fail if only has one peer', async function () {
      this.timeout(240 * 1000)

      const dht = await tdht.spawn()

      // TODO: Switch not closing well, but it will be removed
      // (invalid transition: STOPPED -> done)
      await delay(100)

      await expect(all(dht.get(uint8ArrayFromString('/v/hello')))).to.eventually.be.rejected().property('code', 'ERR_NO_PEERS_IN_ROUTING_TABLE')

      // TODO: after error switch
    })

    it('get should handle correctly an unexpected error', async function () {
      this.timeout(240 * 1000)

      const errCode = 'ERR_INVALID_RECORD_FAKE'
      const error = errcode(new Error('fake error'), errCode)

      const [dhtA, dhtB] = await Promise.all([
        tdht.spawn(),
        tdht.spawn()
      ])
      const stub = sinon.stub(dhtA.components.getDialer(), 'dialProtocol').rejects(error)

      await tdht.connect(dhtA, dhtB)

      const errors = await all(filter(dhtA.get(uint8ArrayFromString('/v/hello')), event => event.name === 'QUERY_ERROR'))

      expect(errors).to.have.lengthOf(3)
      expect(errors).to.have.nested.property('[0].error.code', errCode)
      expect(errors).to.have.nested.property('[1].error.code', errCode)
      expect(errors).to.have.nested.property('[2].error.code', 'ERR_NOT_FOUND')

      stub.restore()
    })

    it('findPeer should fail if no closest peers available', async function () {
      this.timeout(240 * 1000)

      const dhts = await Promise.all([
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn(),
        tdht.spawn()
      ])

      const ids = dhts.map((d) => d.components.getPeerId())
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      dhts[0].lan.findPeer = sinon.stub().returns([])
      dhts[0].wan.findPeer = sinon.stub().returns([])

      await expect(drain(dhts[0].findPeer(ids[3]))).to.eventually.be.rejected().property('code', 'ERR_LOOKUP_FAILED')
    })
  })
})
