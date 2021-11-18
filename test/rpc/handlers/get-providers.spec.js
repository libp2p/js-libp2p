/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Message } = require('../../../src/message')
const utils = require('../../../src/utils')
const { GetProvidersHandler } = require('../../../src/rpc/handlers/get-providers')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { Multiaddr } = require('multiaddr')

const T = Message.TYPES.GET_PROVIDERS

const createPeerId = require('../../utils/create-peer-id')
const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - GetProviders', () => {
  let peerIds
  let values
  let tdht
  let dht
  let handler

  before(async () => {
    tdht = new TestDHT()

    ;[peerIds, values] = await Promise.all([
      createPeerId(3),
      createValues(2)
    ])
  })

  beforeEach(async () => {
    const dhts = await tdht.spawn(1)
    dht = dhts[0]

    handler = new GetProvidersHandler({
      peerId: dht._libp2p.peerId,
      peerRouting: dht._lan._peerRouting,
      providers: dht._lan._providers,
      datastore: dht._datastore,
      peerStore: dht._libp2p.peerStore,
      addressable: dht._libp2p
    })
  })

  afterEach(() => tdht.teardown())

  it('errors with an invalid key ', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)

    await expect(handler.handle(peerIds[0], msg)).to.eventually.be.rejected().with.property('code', 'ERR_INVALID_CID')
  })

  it('responds with self if the value is in the datastore', async () => {
    const v = values[0]

    const msg = new Message(T, v.cid.bytes, 0)
    const dsKey = utils.bufferToKey(v.cid.bytes)

    await dht._datastore.put(dsKey, v.value)
    const response = await handler.handle(peerIds[0], msg)

    expect(response.key).to.be.eql(v.cid.bytes)
    expect(response.providerPeers).to.have.length(1)
    expect(response.providerPeers[0].id.toB58String())
      .to.equal(dht._libp2p.peerId.toB58String())
  })

  it('responds with listed providers and closer peers', async () => {
    const v = values[0]

    const msg = new Message(T, v.cid.bytes, 0)
    const prov = peerIds[1]
    const closer = peerIds[2]

    await dht._lan._routingTable.add(closer)
    await dht._lan._providers.addProvider(v.cid, prov)
    await dht._libp2p.peerStore.addressBook.set(prov, [
      new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
      new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
      new Multiaddr('/ip4/135.4.67.0/tcp/4002')
    ])
    await dht._libp2p.peerStore.addressBook.set(closer, [
      new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
      new Multiaddr('/ip4/192.168.2.6/tcp/4002'),
      new Multiaddr('/ip4/21.31.57.23/tcp/4002')
    ])

    const response = await handler.handle(peerIds[0], msg)

    expect(response.key).to.be.eql(v.cid.bytes)
    expect(response.providerPeers).to.have.length(1)
    expect(response.providerPeers[0].id.toB58String())
      .to.equal(prov.toB58String())

    expect(response.closerPeers).to.have.length(1)
    expect(response.closerPeers[0].id.toB58String())
      .to.equal(closer.toB58String())
  })
})
