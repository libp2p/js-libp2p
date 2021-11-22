/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Message } = require('../../../src/message')
const { GetValueHandler } = require('../../../src/rpc/handlers/get-value')
const utils = require('../../../src/utils')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const drain = require('it-drain')

const T = Message.TYPES.GET_VALUE

const createPeerId = require('../../utils/create-peer-id')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - GetValue', () => {
  let peerIds
  let tdht
  let dht
  let handler

  before(async () => {
    tdht = new TestDHT()
    peerIds = await createPeerId(2)
  })

  beforeEach(async () => {
    [dht] = await tdht.spawn(1)

    handler = new GetValueHandler({
      peerId: dht._libp2p.peerId,
      peerStore: dht._libp2p.peerStore,
      peerRouting: dht._lan._peerRouting,
      records: dht._lan._contentFetching._records
    })
  })

  afterEach(() => tdht.teardown())

  it('errors when missing key', async () => {
    const msg = new Message(T, new Uint8Array(0), 0)

    try {
      await handler.handle(peerIds[0], msg)
    } catch (/** @type {any} */ err) {
      expect(err.code).to.eql('ERR_INVALID_KEY')
      return
    }

    throw new Error('should error when missing key')
  })

  it('responds with a local value', async () => {
    const key = uint8ArrayFromString('hello')
    const value = uint8ArrayFromString('world')

    await drain(dht.put(key, value))

    const msg = new Message(T, key, 0)
    const response = await handler.handle(peerIds[0], msg)

    expect(response.record).to.exist()
    expect(response.record.key).to.eql(key)
    expect(response.record.value).to.eql(value)
  })

  it('responds with closerPeers returned from the dht', async () => {
    const key = uint8ArrayFromString('hello')
    const msg = new Message(T, key, 0)
    const other = peerIds[1]

    await dht._lan._routingTable.add(other)
    const response = await handler.handle(peerIds[0], msg)

    expect(response.closerPeers).to.have.length(1)
    expect(response.closerPeers[0].id.toB58String()).to.be.eql(other.toB58String())
  })

  describe('public key', () => {
    it('self', async () => {
      const key = utils.keyForPublicKey(dht._libp2p.peerId)

      const msg = new Message(T, key, 0)
      const response = await handler.handle(peerIds[0], msg)

      expect(response.record).to.exist()
      expect(response.record.value).to.eql(dht._libp2p.peerId.pubKey.bytes)
    })

    it('other in peerstore', async () => {
      const other = peerIds[1]
      const key = utils.keyForPublicKey(other)

      const msg = new Message(T, key, 0)

      dht._libp2p.peerStore.addressBook.add(other, [])
      dht._libp2p.peerStore.keyBook.set(other, other.pubKey)

      await dht._lan._routingTable.add(other)
      const response = await handler.handle(peerIds[0], msg)
      expect(response.record).to.exist()
      expect(response.record.value).to.eql(other.pubKey.bytes)
    })

    it('other unkown', async () => {
      const other = peerIds[1]
      const key = utils.keyForPublicKey(other)

      const msg = new Message(T, key, 0)
      const response = await handler.handle(peerIds[0], msg)
      expect(response.record).to.not.exist()
    })
  })
})
