'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const Libp2p = require('../../src')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')
const MDNS = require('libp2p-mdns')
const { createPeerId } = require('../utils/creators/peer')
const Fetch = require('../../src/fetch')
const { codes } = require('../../src/errors')

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

describe('Fetch Protocol', () => {
  let sender
  let receiver
  const PREFIX_A = '/moduleA/'
  const PREFIX_B = '/moduleB/'
  const DATA_A = { 'foobar': 'hello world' }
  const DATA_B = { 'foobar': 'goodnight moon' }

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

  before(async () => {
    const [peerIdA, peerIdB] = await createPeerId({ number: 2 })
    sender = await createLibp2pNode(peerIdA)
    receiver = await createLibp2pNode(peerIdB)

    await sender.start()
    await receiver.start()
  })

  after(async () => {
    await sender.stop()
    await receiver.stop()
  })

  it('fetch key that exists in receivers datastore', async () => {
    const fetch = new Fetch()
    fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    fetch.mount(receiver)

    const rawData = await Fetch.fetch(sender, receiver.peerId, '/moduleA/foobar')
    const value = (new TextDecoder()).decode(rawData)
    expect(value).to.equal('hello world')
  })

  it('Different lookups for different prefixes', async () => {
    const fetch = new Fetch()
    fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    fetch.registerLookupFunction(PREFIX_B, generateLookupFunction(PREFIX_B, DATA_B))
    fetch.mount(receiver)

    const rawDataA = await Fetch.fetch(sender, receiver.peerId, '/moduleA/foobar')
    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    // Different lookup functions can be registered on different prefixes, and have different
    // values for the same key underneath the different prefix.
    const rawDataB = await Fetch.fetch(sender, receiver.peerId, '/moduleB/foobar')
    const valueB = (new TextDecoder()).decode(rawDataB)
    expect(valueB).to.equal('goodnight moon')
  })

  it('fetch key that does not exist in receivers datastore', async () => {
    const fetch = new Fetch()
    fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    fetch.mount(receiver)
    const result = await Fetch.fetch(sender, receiver.peerId, '/moduleA/garbage')

    expect(result).to.equal(null)
  })

  it('fetch key with unknown prefix throws error', async () => {
    const fetch = new Fetch()
    fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    fetch.mount(receiver)

    await expect(Fetch.fetch(sender, receiver.peerId, '/moduleUNKNOWN/foobar')).to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('Registering multiple handlers for same prefix errors', async () => {
    const fetch = new Fetch()
    fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    try {
      fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_B))
      expect.fail("didn't throw")
    } catch (err) {
      expect(err).to.be.an('Error')
      expect(err.code).to.equal(codes.ERR_KEY_ALREADY_EXISTS)
    }
  })
})
