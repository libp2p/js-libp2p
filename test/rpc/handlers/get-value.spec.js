/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/get-value')
const utils = require('../../../src/utils')

const T = Message.TYPES.GET_VALUE

const createPeerInfo = require('../../utils/create-peer-info')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - GetValue', () => {
  let peers
  let tdht
  let dht

  before(async () => {
    peers = await createPeerInfo(2)
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('errors when missing key', async () => {
    const msg = new Message(T, Buffer.alloc(0), 0)

    try {
      await handler(dht)(peers[0], msg)
    } catch (err) {
      expect(err.code).to.eql('ERR_INVALID_KEY')
      return
    }

    throw new Error('should error when missing key')
  })

  it('responds with a local value', async () => {
    const key = Buffer.from('hello')
    const value = Buffer.from('world')
    const msg = new Message(T, key, 0)

    await dht.put(key, value)
    const response = await handler(dht)(peers[0], msg)

    expect(response.record).to.exist()
    expect(response.record.key).to.eql(key)
    expect(response.record.value).to.eql(value)
  })

  it('responds with closerPeers returned from the dht', async () => {
    const key = Buffer.from('hello')
    const msg = new Message(T, key, 0)
    const other = peers[1]

    await dht._add(other)
    const response = await handler(dht)(peers[0], msg)

    expect(response.closerPeers).to.have.length(1)
    expect(response.closerPeers[0].id.toB58String()).to.be.eql(other.id.toB58String())
  })

  describe('public key', () => {
    it('self', async () => {
      const key = utils.keyForPublicKey(dht.peerInfo.id)

      const msg = new Message(T, key, 0)
      const response = await handler(dht)(peers[0], msg)

      expect(response.record).to.exist()
      expect(response.record.value).to.eql(dht.peerInfo.id.pubKey.bytes)
    })

    it('other in peerstore', async () => {
      const other = peers[1]
      const key = utils.keyForPublicKey(other.id)

      const msg = new Message(T, key, 0)

      dht.peerStore.put(other)
      await dht._add(other)
      const response = await handler(dht)(peers[0], msg)
      expect(response.record).to.exist()
      expect(response.record.value).to.eql(other.id.pubKey.bytes)
    })

    it('other unkown', async () => {
      const other = peers[1]
      const key = utils.keyForPublicKey(other.id)

      const msg = new Message(T, key, 0)
      const response = await handler(dht)(peers[0], msg)
      expect(response.record).to.not.exist()
    })
  })
})
