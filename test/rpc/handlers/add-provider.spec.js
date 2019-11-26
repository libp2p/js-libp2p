/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const _ = require('lodash')

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/add-provider')

const createPeerInfo = require('../../utils/create-peer-info')
const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - AddProvider', () => {
  let peers
  let values
  let tdht
  let dht

  before(async () => {
    [peers, values] = await Promise.all([
      createPeerInfo(3),
      createValues(2)
    ])
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  describe('invalid messages', async () => {
    const tests = [{
      message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.alloc(0), 0),
      error: 'ERR_MISSING_KEY'
    }, {
      message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.from('hello world'), 0),
      error: 'ERR_INVALID_CID'
    }]

    await Promise.all(tests.map((t) => {
      it(t.error.toString(), async () => {
        try {
          await handler(dht)(peers[0], t.message)
        } catch (err) {
          expect(err).to.exist()
          expect(err.code).to.eql(t.error)
          return
        }
        throw new Error()
      })
    }))
  })

  it('ignore providers that do not match the sender', async () => {
    const cid = values[0].cid

    const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0)
    const sender = _.cloneDeep(peers[0])
    const provider = _.cloneDeep(peers[0])
    provider.multiaddrs.add('/ip4/127.0.0.1/tcp/1234')

    const other = _.cloneDeep(peers[1])
    other.multiaddrs.add('/ip4/127.0.0.1/tcp/2345')
    msg.providerPeers = [
      provider,
      other
    ]

    await handler(dht)(sender, msg)

    const provs = await dht.providers.getProviders(cid)

    expect(provs).to.have.length(1)
    expect(provs[0].id).to.eql(provider.id.id)
    const bookEntry = dht.peerStore.get(provider.id)

    // Favour peerInfo from payload over peerInfo from sender
    expect(bookEntry.multiaddrs.toArray()).to.eql(
      provider.multiaddrs.toArray()
    )
  })

  it('fall back to sender if providers have no multiaddrs', async () => {
    const cid = values[0].cid
    const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0)
    const sender = _.cloneDeep(peers[0])
    const provider = _.cloneDeep(peers[0])
    provider.multiaddrs.clear()
    msg.providerPeers = [provider]

    await handler(dht)(sender, msg)

    const provs = await dht.providers.getProviders(cid)

    expect(dht.peerStore.has(provider.id)).to.equal(false)
    expect(provs).to.have.length(1)
    expect(provs[0].id).to.eql(provider.id.id)
  })
})
