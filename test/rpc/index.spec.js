/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const pDefer = require('p-defer')
const pipe = require('it-pipe')
const lp = require('it-length-prefixed')
const { collect } = require('streaming-iterables')
const { Message } = require('../../src/message')
const { RPC } = require('../../src/rpc')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const createPeerId = require('../utils/create-peer-id')
const TestDHT = require('../utils/test-dht')
const toBuffer = require('../utils/to-buffer')

describe('rpc', () => {
  let peerIds
  let tdht
  let rpc
  let dht

  before(async () => {
    peerIds = await createPeerId(2)
    tdht = new TestDHT()
  })

  beforeEach(async () => {
    [dht] = await tdht.spawn(1)

    rpc = new RPC({
      routingTable: dht._lan._routingTable,
      peerId: dht._libp2p.peerId,
      providers: dht._lan._providers,
      peerStore: dht._libp2p.peerStore,
      addressable: dht._libp2p,
      peerRouting: dht._lan._peerRouting,
      records: dht._lan._contentFetching._records,
      validators: dht._lan._validators
    })
  })

  afterEach(() => tdht.teardown())

  it('calls back with the response', async () => {
    const defer = pDefer()
    const msg = new Message(Message.TYPES.GET_VALUE, uint8ArrayFromString('hello'), 5)

    const validateMessage = (res) => {
      const msg = Message.deserialize(res[0])
      expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(msg).to.have.property('closerPeers').eql([])
      defer.resolve()
    }

    const source = await pipe(
      [msg.serialize()],
      lp.encode(),
      collect
    )

    const duplexStream = {
      source,
      sink: async (source) => {
        const res = await pipe(
          source,
          lp.decode(),
          toBuffer, // Ensure we have buffers here for validateMessage to consume
          collect
        )
        validateMessage(res)
      }
    }

    rpc.onIncomingStream({
      protocol: 'protocol',
      stream: duplexStream,
      connection: {
        remotePeer: peerIds[1]
      }
    })

    return defer.promise
  })
})
