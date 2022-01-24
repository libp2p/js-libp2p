'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const Libp2p = require('../../src')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')
const MDNS = require('libp2p-mdns')
const { createPeerId } = require('../utils/creators/peer')
const { codes } = require('../../src/errors')
const { Multiaddr } = require('multiaddr')

async function createLibp2pNode (peerId) {
  return await Libp2p.create({
    peerId,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      peerDiscovery: [MDNS]
    }
  })
}

describe('Fetch', () => {
  /** @type {Libp2p} */
  let sender
  /** @type {Libp2p} */
  let receiver
  const PREFIX_A = '/moduleA/'
  const PREFIX_B = '/moduleB/'
  const DATA_A = { foobar: 'hello world' }
  const DATA_B = { foobar: 'goodnight moon' }

  const generateLookupFunction = function (prefix, data) {
    return async function (key) {
      key = key.slice(prefix.length) // strip prefix from key
      const val = data[key]
      if (val) {
        return (new TextEncoder()).encode(val)
      }
      return null
    }
  }

  beforeEach(async () => {
    const [peerIdA, peerIdB] = await createPeerId({ number: 2 })
    sender = await createLibp2pNode(peerIdA)
    receiver = await createLibp2pNode(peerIdB)

    await sender.start()
    await receiver.start()

    await Promise.all([
      ...sender.multiaddrs.map(addr => receiver.dial(addr.encapsulate(new Multiaddr(`/p2p/${sender.peerId}`)))),
      ...receiver.multiaddrs.map(addr => sender.dial(addr.encapsulate(new Multiaddr(`/p2p/${receiver.peerId}`))))
    ])
  })

  afterEach(async () => {
    receiver.fetchService.unregisterLookupFunction(PREFIX_A)
    receiver.fetchService.unregisterLookupFunction(PREFIX_B)

    await sender.stop()
    await receiver.stop()
  })

  it('fetch key that exists in receivers datastore', async () => {
    receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    const rawData = await sender.fetchService.fetch(receiver.peerId, '/moduleA/foobar')
    const value = (new TextDecoder()).decode(rawData)
    expect(value).to.equal('hello world')
  })

  it('Different lookups for different prefixes', async () => {
    receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    receiver.fetchService.registerLookupFunction(PREFIX_B, generateLookupFunction(PREFIX_B, DATA_B))

    const rawDataA = await sender.fetchService.fetch(receiver.peerId, '/moduleA/foobar')
    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    // Different lookup functions can be registered on different prefixes, and have different
    // values for the same key underneath the different prefix.
    const rawDataB = await sender.fetchService.fetch(receiver.peerId, '/moduleB/foobar')
    const valueB = (new TextDecoder()).decode(rawDataB)
    expect(valueB).to.equal('goodnight moon')
  })

  it('fetch key that does not exist in receivers datastore', async () => {
    receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    const result = await sender.fetchService.fetch(receiver.peerId, '/moduleA/garbage')

    expect(result).to.equal(null)
  })

  it('fetch key with unknown prefix throws error', async () => {
    receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    await expect(sender.fetchService.fetch(receiver.peerId, '/moduleUNKNOWN/foobar'))
      .to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('registering multiple handlers for same prefix errors', async () => {
    receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    expect(() => receiver.fetchService.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_B)))
      .to.throw().with.property('code', codes.ERR_KEY_ALREADY_EXISTS)
  })
})
