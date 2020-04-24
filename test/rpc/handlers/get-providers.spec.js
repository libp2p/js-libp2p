/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Message = require('../../../src/message')
const utils = require('../../../src/utils')
const handler = require('../../../src/rpc/handlers/get-providers')

const T = Message.TYPES.GET_PROVIDERS

const createPeerId = require('../../utils/create-peer-id')
const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - GetProviders', () => {
  let peerIds
  let values
  let tdht
  let dht

  before(async () => {
    [peerIds, values] = await Promise.all([
      createPeerId(3),
      createValues(2)
    ])
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('errors with an invalid key ', async () => {
    const msg = new Message(T, Buffer.from('hello'), 0)

    try {
      await handler(dht)(peerIds[0], msg)
    } catch (err) {
      expect(err.code).to.eql('ERR_INVALID_CID')
    }
  })

  it('responds with self if the value is in the datastore', async () => {
    const v = values[0]

    const msg = new Message(T, v.cid.buffer, 0)
    const dsKey = utils.bufferToKey(v.cid.buffer)

    await dht.datastore.put(dsKey, v.value)
    const response = await handler(dht)(peerIds[0], msg)

    expect(response.key).to.be.eql(v.cid.buffer)
    expect(response.providerPeers).to.have.length(1)
    expect(response.providerPeers[0].id.toB58String())
      .to.eql(dht.peerId.toB58String())
  })

  it('responds with listed providers and closer peers', async () => {
    const v = values[0]

    const msg = new Message(T, v.cid.buffer, 0)
    const prov = peerIds[1]
    const closer = peerIds[2]

    await dht._add(closer)
    await dht.providers.addProvider(v.cid, prov)
    const response = await handler(dht)(peerIds[0], msg)

    expect(response.key).to.be.eql(v.cid.buffer)
    expect(response.providerPeers).to.have.length(1)
    expect(response.providerPeers[0].id.toB58String())
      .to.eql(prov.toB58String())

    expect(response.closerPeers).to.have.length(1)
    expect(response.closerPeers[0].id.toB58String())
      .to.eql(closer.toB58String())
  })
})
