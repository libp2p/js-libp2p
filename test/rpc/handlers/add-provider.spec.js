/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Multiaddr } = require('multiaddr')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const { Message } = require('../../../src/message')
const { AddProviderHandler } = require('../../../src/rpc/handlers/add-provider')

const createPeerId = require('../../utils/create-peer-id')
const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - AddProvider', () => {
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
    [dht] = await tdht.spawn(1)

    handler = new AddProviderHandler({
      peerId: dht._libp2p.peerId,
      providers: dht._lan._providers,
      peerStore: dht._libp2p.peerStore
    })
  })

  afterEach(() => tdht.teardown())

  describe('invalid messages', async () => {
    const tests = [{
      message: new Message(Message.TYPES.ADD_PROVIDER, new Uint8Array(0), 0),
      error: 'ERR_MISSING_KEY'
    }, {
      message: new Message(Message.TYPES.ADD_PROVIDER, uint8ArrayFromString('hello world'), 0),
      error: 'ERR_INVALID_CID'
    }]

    tests.forEach((t) => {
      it(t.error.toString(), async () => {
        try {
          await handler.handle(peerIds[0], t.message)
        } catch (/** @type {any} */ err) {
          expect(err).to.exist()
          expect(err.code).to.eql(t.error)
          return
        }
        throw new Error()
      })
    })
  })

  it('ignore providers that do not match the sender', async () => {
    const cid = values[0].cid
    const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.bytes, 0)

    const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/1234')
    const ma2 = new Multiaddr('/ip4/127.0.0.1/tcp/2345')

    msg.providerPeers = [
      {
        id: peerIds[0],
        multiaddrs: [ma1]
      },
      {
        id: peerIds[1],
        multiaddrs: [ma2]
      }
    ]

    await handler.handle(peerIds[0], msg)

    const provs = await dht._lan._providers.getProviders(cid)
    expect(provs).to.have.length(1)
    expect(provs[0].id).to.eql(peerIds[0].id)

    const bookEntry = dht._libp2p.peerStore.get(peerIds[0])
    expect(bookEntry.addresses.map((address) => address.multiaddr)).to.eql([ma1])
  })
})
