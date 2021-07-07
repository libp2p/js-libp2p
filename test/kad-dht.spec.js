/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { Multiaddr } = require('multiaddr')
const { Record } = require('libp2p-record')
const errcode = require('err-code')
const uint8ArrayEquals = require('uint8arrays/equals')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')

const all = require('async-iterator-all')
const pMapSeries = require('p-map-series')
const pEachSeries = require('p-each-series')
const delay = require('delay')

const kadUtils = require('../src/utils')
const c = require('../src/constants')
const Message = require('../src/message')

const createPeerId = require('./utils/create-peer-id')
const createValues = require('./utils/create-values')
const TestDHT = require('./utils/test-dht')
const { countDiffPeers } = require('./utils')

describe('KadDHT', () => {
  let peerIds
  let values

  before(async function () {
    this.timeout(10 * 1000)

    const res = await Promise.all([
      createPeerId(3),
      createValues(20)
    ])

    peerIds = res[0]
    values = res[1]
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('create', () => {
    let tdht

    beforeEach(() => {
      tdht = new TestDHT()
    })

    afterEach(() => {
      tdht.teardown()
    })

    it('simple', async () => {
      const [dht] = await tdht.spawn(1, {
        kBucketSize: 5
      })

      expect(dht).to.have.property('peerId')
      expect(dht).to.have.property('kBucketSize', 5)
      expect(dht).to.have.property('routingTable')
    })

    it('with validators and selectors', async () => {
      const [dht] = await tdht.spawn(1, {
        validators: {
          ipns: { func: () => { } }
        },
        selectors: {
          ipns: () => 0
        }
      })

      expect(dht).to.have.property('peerId')
      expect(dht).to.have.property('routingTable')
      expect(dht.validators).to.have.property('ipns')
      expect(dht.selectors).to.have.property('ipns')
    })
  })

  describe('start and stop', () => {
    let tdht

    beforeEach(() => {
      tdht = new TestDHT()
    })

    afterEach(() => {
      tdht.teardown()
    })

    it('simple with defaults', async () => {
      const [dht] = await tdht.spawn(1, null, false)

      sinon.spy(dht.network, 'start')
      sinon.spy(dht.randomWalk, 'start')

      sinon.spy(dht.network, 'stop')
      sinon.spy(dht.randomWalk, 'stop')

      dht.start()
      expect(dht.network.start.calledOnce).to.equal(true)
      expect(dht.randomWalk.start.calledOnce).to.equal(true)

      dht.stop()
      expect(dht.network.stop.calledOnce).to.equal(true)
      expect(dht.randomWalk.stop.calledOnce).to.equal(true)
    })

    it('server mode', async () => {
      // Currently on by default
      const [dht] = await tdht.spawn(1, null, false)
      sinon.spy(dht.registrar, 'handle')

      dht.start()
      expect(dht.registrar.handle.callCount).to.equal(1)
      dht.stop()
    })

    it('client mode', async () => {
      const [dht] = await tdht.spawn(1, { clientMode: true }, false)
      sinon.spy(dht.registrar, 'handle')

      dht.start()
      expect(dht.registrar.handle.callCount).to.equal(0)
      dht.stop()
    })

    it('random-walk disabled', async () => {
      const [dht] = await tdht.spawn(1, {
        randomWalk: { enabled: false }
      }, false)

      sinon.spy(dht.network, 'start')
      sinon.spy(dht.randomWalk, 'start')

      sinon.spy(dht.network, 'stop')
      sinon.spy(dht.randomWalk, 'stop')

      dht.start()
      expect(dht.network.start.calledOnce).to.equal(true)
      expect(dht.randomWalk._runningHandle).to.not.exist()

      dht.stop()
      expect(dht.network.stop.calledOnce).to.equal(true)
      expect(dht.randomWalk.stop.calledOnce).to.equal(true) // Should be always disabled, as it can be started using the instance
    })

    it('should not fail when already started', async () => {
      const [dht] = await tdht.spawn(1, null, false)

      dht.start()
      dht.start()
      dht.start()

      dht.stop()
    })

    it('should not fail to stop when was not started', async () => {
      const [dht] = await tdht.spawn(1, null, false)

      dht.stop()
    })
  })

  describe('content fetching', () => {
    it('put - get same node', async function () {
      this.timeout(10 * 1000)

      const tdht = new TestDHT()
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dht] = await tdht.spawn(2)

      // Exchange data through the dht
      await dht.put(key, value)

      const res = await dht.get(uint8ArrayFromString('/v/hello'), { timeout: 1000 })
      expect(res).to.eql(value)

      tdht.teardown()
    })

    it('put - removeLocal', async function () {
      this.timeout(10 * 1000)

      const tdht = new TestDHT()
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dht] = await tdht.spawn(2)

      await dht.put(key, value)

      const res = await dht.get(uint8ArrayFromString('/v/hello'), { timeout: 1000 })
      expect(res).to.eql(value)

      // remove from the local datastore
      await dht.removeLocal(key)
      try {
        await dht.datastore.get(key)
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.be.eql('ERR_NOT_FOUND')
      } finally {
        tdht.teardown()
      }
    })

    it('put - get', async function () {
      this.timeout(10 * 1000)

      const tdht = new TestDHT()
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const [dhtA, dhtB] = await tdht.spawn(2)

      // Connect nodes
      await tdht.connect(dhtA, dhtB)

      // Exchange data through the dht
      await dhtA.put(key, value)

      const res = await dhtB.get(uint8ArrayFromString('/v/hello'), { timeout: 1000 })
      expect(res).to.eql(value)

      tdht.teardown()
    })

    it('put - should require a minimum number of peers to have successful puts', async function () {
      this.timeout(10 * 1000)

      const errCode = 'ERR_NOT_AVAILABLE'
      const error = errcode(new Error('fake error'), errCode)
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB, dhtC, dhtD] = await tdht.spawn(4)

      // Stub verify record
      const stub = sinon.stub(dhtD, '_verifyRecordLocally').rejects(error)

      await Promise.all([
        tdht.connect(dhtA, dhtB),
        tdht.connect(dhtA, dhtC),
        tdht.connect(dhtA, dhtD)
      ])
      // DHT operations
      await dhtA.put(key, value, { minPeers: 2 })
      const res = await dhtB.get(key, { timeout: 1000 })

      expect(res).to.eql(value)
      stub.restore()
      tdht.teardown()
    })

    it('put - should fail if not enough peers can be written to', async function () {
      this.timeout(10 * 1000)

      const errCode = 'ERR_NOT_AVAILABLE'
      const error = errcode(new Error('fake error'), errCode)
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB, dhtC, dhtD] = await tdht.spawn(4)

      // Stub verify record
      const stub = sinon.stub(dhtD, '_verifyRecordLocally').rejects(error)
      const stub2 = sinon.stub(dhtC, '_verifyRecordLocally').rejects(error)

      await Promise.all([
        tdht.connect(dhtA, dhtB),
        tdht.connect(dhtA, dhtC),
        tdht.connect(dhtA, dhtD)
      ])

      // DHT operations
      await expect(dhtA.put(key, value, { minPeers: 2 })).to.eventually.be.rejected().property('code', 'ERR_NOT_ENOUGH_PUT_PEERS')

      stub.restore()
      stub2.restore()
      tdht.teardown()
    })

    it('put - should require all peers to be put to successfully if no minPeers specified', async function () {
      this.timeout(10 * 1000)

      const errCode = 'ERR_NOT_AVAILABLE'
      const error = errcode(new Error('fake error'), errCode)
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB, dhtC] = await tdht.spawn(3)

      // Stub verify record
      const stub = sinon.stub(dhtC, '_verifyRecordLocally').rejects(error)

      await Promise.all([
        tdht.connect(dhtA, dhtB),
        tdht.connect(dhtA, dhtC)
      ])

      // DHT operations
      await expect(dhtA.put(key, value)).to.eventually.be.rejected().property('code', 'ERR_NOT_ENOUGH_PUT_PEERS')

      stub.restore()
      tdht.teardown()
    })

    it('put - get using key with no prefix (no selector available)', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2)

      await tdht.connect(dhtA, dhtB)

      // DHT operations
      await dhtA.put(key, value)
      const res = await dhtB.get(key, { timeout: 1000 })

      expect(res).to.eql(value)
      tdht.teardown()
    })

    it('put - get using key from provided validator and selector', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/ipns/hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2, {
        validators: {
          ipns: {
            func: (key, record) => Promise.resolve(true)
          }
        },
        selectors: {
          ipns: (key, records) => 0
        }
      })

      await tdht.connect(dhtA, dhtB)

      // DHT operations
      await dhtA.put(key, value)
      const res = await dhtB.get(key, { timeout: 1000 })

      expect(res).to.eql(value)
      tdht.teardown()
    })

    it('put - get should fail if unrecognized key prefix in get', async function () {
      this.timeout(10 * 1000)

      const key = uint8ArrayFromString('/v2/hello')
      const value = uint8ArrayFromString('world')

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2)

      await tdht.connect(dhtA, dhtB)

      await dhtA.put(key, value)

      await expect(dhtA.get(key)).to.eventually.be.rejected().property('code', 'ERR_UNRECOGNIZED_KEY_PREFIX')

      tdht.teardown()
    })

    it('put - get with update', async function () {
      this.timeout(20 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const valueA = uint8ArrayFromString('worldA')
      const valueB = uint8ArrayFromString('worldB')

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2)

      const dhtASpy = sinon.spy(dhtA, '_putValueToPeer')

      // Put before peers connected
      await dhtA.put(key, valueA)
      await dhtB.put(key, valueB)

      // Connect peers
      await tdht.connect(dhtA, dhtB)

      // Get values
      const resA = await dhtA.get(key, { timeout: 1000 })
      const resB = await dhtB.get(key, { timeout: 1000 })

      // First is selected
      expect(resA).to.eql(valueA)
      expect(resB).to.eql(valueA)

      expect(dhtASpy.callCount).to.eql(1)
      expect(dhtASpy.getCall(0).args[2].isEqual(dhtB.peerId)).to.eql(true) // inform B

      tdht.teardown()
    })

    it('layered get', async function () {
      this.timeout(40 * 1000)

      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')

      const nDHTs = 4
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(nDHTs)

      // Connect all
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      // DHT operations
      await dhts[3].put(key, value)
      const res = await dhts[0].get(key, { timeout: 1000 })

      expect(res).to.eql(value)
      tdht.teardown()
    })

    it('getMany with nvals=1 goes out to swarm if there is no local value', async () => {
      const key = uint8ArrayFromString('/v/hello')
      const value = uint8ArrayFromString('world')
      const rec = new Record(key, value)

      const tdht = new TestDHT()
      const [dht] = await tdht.spawn(1)

      const stubs = [
        // Simulate returning a peer id to query
        sinon.stub(dht.routingTable, 'closestPeers').returns([peerIds[1]]),
        // Simulate going out to the network and returning the record
        sinon.stub(dht, '_getValueOrPeers').callsFake(async () => ({ record: rec })) // eslint-disable-line require-await
      ]

      const res = await dht.getMany(key, 1)

      expect(res.length).to.eql(1)
      expect(res[0].val).to.eql(value)

      for (const stub of stubs) {
        stub.restore()
      }

      tdht.teardown()
    })
  })

  describe('content routing', () => {
    it('provides', async function () {
      this.timeout(20 * 1000)

      const tdht = new TestDHT()
      const dhts = await tdht.spawn(4)

      const ids = dhts.map((d) => d.peerId)
      const idsB58 = ids.map(id => id.toB58String())
      sinon.spy(dhts[3].network, 'sendMessage')

      // connect peers
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      // provide values
      await Promise.all(values.map((value) => dhts[3].provide(value.cid)))

      // Expect an ADD_PROVIDER message to be sent to each peer for each value
      const fn = dhts[3].network.sendMessage
      const valuesBuffs = values.map(v => v.cid.bytes)
      const calls = fn.getCalls().map(c => c.args)

      for (const [peerId, msg] of calls) {
        expect(idsB58).includes(peerId.toB58String())
        expect(msg.type).equals(Message.TYPES.ADD_PROVIDER)
        expect(valuesBuffs).includes(msg.key)
        expect(msg.providerPeers.length).equals(1)
        expect(msg.providerPeers[0].id.toB58String()).equals(idsB58[3])
      }

      // Expect each DHT to find the provider of each value
      let n = 0
      await pEachSeries(values, async (v) => {
        n = (n + 1) % 3

        const provs = await all(dhts[n].findProviders(v.cid, { timeout: 5000 }))

        expect(provs).to.have.length(1)
        expect(provs[0].id.id).to.be.eql(ids[3].id)
      })

      tdht.teardown()
    })

    it('find providers', async function () {
      this.timeout(20 * 1000)

      const val = values[0]
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(3)

      // Connect
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2])
      ])

      await Promise.all(dhts.map((dht) => dht.provide(val.cid)))

      const res0 = await all(dhts[0].findProviders(val.cid))
      const res1 = await all(dhts[0].findProviders(val.cid, { maxNumProviders: 2 }))

      // find providers find all the 3 providers
      expect(res0).to.exist()
      expect(res0).to.have.length(3)

      // find providers limited to a maxium of 2 providers
      expect(res1).to.exist()
      expect(res1).to.have.length(2)

      tdht.teardown()
    })

    it('find providers from client', async function () {
      this.timeout(20 * 1000)

      const val = values[0]
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(2)
      const [clientDHT] = await tdht.spawn(1, { clientMode: true })

      // Connect
      await Promise.all([
        tdht.connect(clientDHT, dhts[0]),
        tdht.connect(dhts[0], dhts[1])
      ])

      await Promise.all(dhts.map((dht) => dht.provide(val.cid)))

      const res0 = await all(clientDHT.findProviders(val.cid))
      const res1 = await all(clientDHT.findProviders(val.cid, { maxNumProviders: 1 }))

      // find providers find all the 2 providers
      expect(res0).to.exist()
      expect(res0).to.have.length(2)

      // find providers limited to a maxium of 1 providers
      expect(res1).to.exist()
      expect(res1).to.have.length(1)

      tdht.teardown()
    })

    it('find client provider', async function () {
      this.timeout(20 * 1000)

      const val = values[0]
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(2)
      const [clientDHT] = await tdht.spawn(1, { clientMode: true })

      // Connect
      await Promise.all([
        tdht.connect(clientDHT, dhts[0]),
        tdht.connect(dhts[0], dhts[1])
      ])

      await clientDHT.provide(val.cid)

      await delay(1e3)

      const res = await all(dhts[1].findProviders(val.cid))

      // find providers find the client provider
      expect(res).to.exist()
      expect(res).to.have.length(1)

      tdht.teardown()
    })

    it('find one provider locally', async function () {
      this.timeout(20 * 1000)
      const val = values[0]
      const tdht = new TestDHT()
      const [dht] = await tdht.spawn(1)

      sinon.stub(dht.providers, 'getProviders').returns([dht.peerId])

      // Find provider
      const res = await all(dht.findProviders(val.cid, { maxNumProviders: 1 }))

      expect(res).to.exist()
      expect(res).to.have.length(1)

      tdht.teardown()
    })
  })

  describe('peer routing', () => {
    it('findPeer', async function () {
      this.timeout(40 * 1000)

      const nDHTs = 4
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(nDHTs)

      // Connect all
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      const ids = dhts.map((d) => d.peerId)
      const res = await dhts[0].findPeer(ids[3], { timeout: 1000 })
      expect(res.id.isEqual(ids[3])).to.eql(true)

      tdht.teardown()
    })

    it('find peer query', async function () {
      this.timeout(40 * 1000)

      // Create 101 nodes
      const nDHTs = 100
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(nDHTs)

      const dhtsById = new Map(dhts.map((d) => [d.peerId, d]))
      const ids = [...dhtsById.keys()]

      // The origin node for the FIND_PEER query
      const guy = dhts[0]

      // The key
      const val = uint8ArrayFromString('foobar')

      // Hash the key into the DHT's key format
      const rtval = await kadUtils.convertBuffer(val)
      // Make connections between nodes close to each other
      const sorted = await kadUtils.sortClosestPeers(ids, rtval)

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

      await Promise.all(conns.map((conn) => tdht.connect(dhtsById.get(conn[0]), dhtsById.get(conn[1]))))

      // Get the alpha (3) closest peers to the key from the origin's
      // routing table
      const rtablePeers = guy.routingTable.closestPeers(rtval, c.ALPHA)
      expect(rtablePeers).to.have.length(c.ALPHA)

      // The set of peers used to initiate the query (the closest alpha
      // peers to the key that the origin knows about)
      const rtableSet = {}
      rtablePeers.forEach((p) => {
        rtableSet[p.toB58String()] = true
      })

      const guyIndex = ids.findIndex(i => uint8ArrayEquals(i.id, guy.peerId.id))
      const otherIds = ids.slice(0, guyIndex).concat(ids.slice(guyIndex + 1))

      // Make the query
      const out = await all(guy.getClosestPeers(val))
      const actualClosest = await kadUtils.sortClosestPeers(otherIds, rtval)

      // Expect that the response includes nodes that are were not
      // already in the origin's routing table (ie it went out to
      // the network to find closer peers)
      expect(out.filter((p) => !rtableSet[p.toB58String()]))
        .to.not.be.empty()

      // Expect that there were kValue peers found
      expect(out).to.have.length(c.K)

      // The expected closest kValue peers to the key
      const exp = actualClosest.slice(0, c.K)

      // Expect the kValue peers found to be the kValue closest connected peers
      // to the key
      expect(countDiffPeers(exp, out)).to.eql(0)

      tdht.teardown()
    })

    it('getClosestPeers', async function () {
      this.timeout(40 * 1000)

      const nDHTs = 30
      const tdht = new TestDHT()
      const dhts = await tdht.spawn(nDHTs)

      await pMapSeries(dhts, async (_, index) => {
        await tdht.connect(dhts[index], dhts[(index + 1) % dhts.length])
      })

      const res = await all(dhts[1].getClosestPeers(uint8ArrayFromString('foo')))
      expect(res).to.have.length(c.K)

      tdht.teardown()
    })
  })

  describe('getPublicKey', () => {
    it('already known', async function () {
      this.timeout(20 * 1000)

      const tdht = new TestDHT()
      const dhts = await tdht.spawn(2)

      const ids = dhts.map((d) => d.peerId)
      dhts[0].peerStore.addressBook.add(dhts[1].peerId, [new Multiaddr('/ip4/160.1.1.1/tcp/80')])

      const key = await dhts[0].getPublicKey(ids[1])
      expect(key).to.eql(dhts[1].peerId.pubKey)

      await delay(100)

      tdht.teardown()
    })

    it('connected node', async function () {
      this.timeout(30 * 1000)

      const tdht = new TestDHT()
      const dhts = await tdht.spawn(2)

      const ids = dhts.map((d) => d.peerId)

      await tdht.connect(dhts[0], dhts[1])

      dhts[0].peerStore.addressBook.add(dhts[1].peerId, [new Multiaddr('/ip4/160.1.1.1/tcp/80')])

      const key = await dhts[0].getPublicKey(ids[1])
      expect(uint8ArrayEquals(key, dhts[1].peerId.pubKey)).to.eql(true)

      tdht.teardown()
    })
  })

  describe('internals', () => {
    let tdht

    beforeEach(() => {
      tdht = new TestDHT()
    })

    afterEach(() => {
      tdht.teardown()
    })

    it('_nearestPeersToQuery', async () => {
      const [dht] = await tdht.spawn(1)

      await dht._add(peerIds[1])
      const res = await dht._nearestPeersToQuery({ key: uint8ArrayFromString('hello') })
      expect(res).to.be.eql([{
        id: peerIds[1],
        multiaddrs: []
      }])
    })

    it('_betterPeersToQuery', async () => {
      const [dht] = await tdht.spawn(1)

      await dht._add(peerIds[1])
      await dht._add(peerIds[2])
      const res = await dht._betterPeersToQuery({ key: uint8ArrayFromString('hello') }, peerIds[1])

      expect(res[0].id).to.be.eql(peerIds[2])
    })

    describe('_checkLocalDatastore', () => {
      let tdht

      beforeEach(() => {
        tdht = new TestDHT()
      })

      afterEach(() => {
        tdht.teardown()
      })

      it('allow a peer record from store if recent', async () => {
        const [dht] = await tdht.spawn(1)

        const record = new Record(
          uint8ArrayFromString('hello'),
          uint8ArrayFromString('world')
        )
        record.timeReceived = new Date()

        await dht.contentFetching._putLocal(record.key, record.serialize())
        const rec = await dht._checkLocalDatastore(record.key)

        expect(rec).to.exist('Record should not have expired')
        expect(uint8ArrayToString(rec.value)).to.equal(uint8ArrayToString(record.value))
      })

      it('delete entries received from peers that have expired', async () => {
        const [dht] = await tdht.spawn(1)

        const record = new Record(
          uint8ArrayFromString('hello'),
          uint8ArrayFromString('world')
        )
        const received = new Date()
        received.setDate(received.getDate() - 2)

        record.timeReceived = received

        await dht.contentFetching._putLocal(record.key, record.serialize())

        const lookup = await dht.datastore.get(kadUtils.bufferToKey(record.key))
        expect(lookup).to.exist('Record should be in the local datastore')

        let eventResponse
        dht.onRemove = (record) => {
          eventResponse = { record }
        }

        const rec = await dht._checkLocalDatastore(record.key)
        expect(rec).to.not.exist('Record should have expired')

        expect(eventResponse).to.have.property('record').eql(record)
        // TODO
        // const lookup2 = await dht.datastore.get(kadUtils.bufferToKey(record.key))
        // expect(lookup2).to.not.exist('Record should be removed from datastore')
      })
    })

    it('_verifyRecordLocally', async () => {
      const [dht] = await tdht.spawn(1)
      const record = new Record(
        uint8ArrayFromString('hello'),
        uint8ArrayFromString('world')
      )
      const enc = record.serialize()

      return dht._verifyRecordLocally(Record.deserialize(enc))
    })
  })

  describe('errors', () => {
    it('get many should fail if only has one peer', async function () {
      this.timeout(20 * 1000)

      const tdht = new TestDHT()
      const dhts = await tdht.spawn(1)

      // TODO: Switch not closing well, but it will be removed
      // (invalid transition: STOPPED -> done)
      await delay(100)

      await expect(dhts[0].getMany(uint8ArrayFromString('/v/hello'), 5)).to.eventually.be.rejected().property('code', 'ERR_NO_PEERS_IN_ROUTING_TABLE')

      tdht.teardown()

      // TODO: after error switch
    })

    it('get should handle correctly an unexpected error', async function () {
      this.timeout(20 * 1000)

      const errCode = 'ERR_INVALID_RECORD_FAKE'
      const error = errcode(new Error('fake error'), errCode)

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2)
      const stub = sinon.stub(dhtA, '_getValueOrPeers').rejects(error)

      await tdht.connect(dhtA, dhtB)

      await expect(dhtA.get(uint8ArrayFromString('/v/hello'), { timeout: 1000 })).to.eventually.be.rejected().property('code', errCode)

      stub.restore()
      tdht.teardown()
    })

    it('get should handle correctly an invalid record error and return not found', async function () {
      this.timeout(20 * 1000)

      const error = errcode(new Error('invalid record error'), 'ERR_INVALID_RECORD')

      const tdht = new TestDHT()
      const [dhtA, dhtB] = await tdht.spawn(2)
      const stub = sinon.stub(dhtA, '_getValueOrPeers').rejects(error)

      await tdht.connect(dhtA, dhtB)

      await expect(dhtA.get(uint8ArrayFromString('/v/hello'), { timeout: 1000 })).to.eventually.be.rejected().property('code', 'ERR_NOT_FOUND')

      stub.restore()
      tdht.teardown()
    })

    it('findPeer should fail if no closest peers available', async function () {
      this.timeout(40 * 1000)

      const tdht = new TestDHT()
      const dhts = await tdht.spawn(4)

      const ids = dhts.map((d) => d.peerId)
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      const stub = sinon.stub(dhts[0].routingTable, 'closestPeers').returns([])

      await expect(dhts[0].findPeer(ids[3], { timeout: 1000 })).to.eventually.be.rejected().property('code', 'ERR_LOOKUP_FAILED')

      stub.restore()
      tdht.teardown()
    })

    it('should not find peers with different protocols', async function () {
      this.timeout(40 * 1000)

      const protocol1 = '/test1'
      const protocol2 = '/test2'

      const tdht = new TestDHT()
      const dhts = []
      dhts.push(...await tdht.spawn(2, { protocolPrefix: protocol1 }))
      dhts.push(...await tdht.spawn(2, { protocolPrefix: protocol2 }))

      // Connect all
      await Promise.all([
        tdht.connect(dhts[0], dhts[1]),
        tdht.connect(dhts[1], dhts[2]),
        tdht.connect(dhts[2], dhts[3])
      ])

      const ids = dhts.map((d) => d.peerId)

      await expect(dhts[0].findPeer(ids[3], { timeout: 1000 })).to.eventually.be.rejected().property('code', 'ERR_NOT_FOUND')

      tdht.teardown()
    })

    it('force legacy protocol', async function () {
      this.timeout(40 * 1000)

      const protocol = '/test/dht/0.0.0'

      const tdht = new TestDHT()
      const [dht] = await tdht.spawn(1, { protocolPrefix: protocol, forceProtocolLegacy: true })

      expect(dht.protocol).to.eql(protocol)
      tdht.teardown()
    })
  })
})
