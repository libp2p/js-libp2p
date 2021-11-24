'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const Libp2p = require('../../src')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')
const MDNS = require('libp2p-mdns')
const Fetch = require('../../src/fetch')

async function createLibp2pNode (lookupFunc) {
  return await Libp2p.create({
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
  const DATA = { foobar: 'hello world' }

  before(async () => {
    sender = await createLibp2pNode()
    receiver = await createLibp2pNode()

    const lookupFunc = async function (key) {
      const val = DATA[key]
      if (val) {
        return (new TextEncoder()).encode(val)
      }
      return null
    }

    Fetch.mount(receiver, lookupFunc)

    await sender.start()
    await receiver.start()
  })

  after(async () => {
    await sender.stop()
    await receiver.stop()
  })

  it('fetch key that exists in receivers datastore', async () => {
    const rawData = await Fetch(sender, receiver.peerId, 'foobar')
    const value = (new TextDecoder()).decode(rawData)

    expect(value).to.equal('hello world')
  })

  it('fetch key that does not exist in receivers datastore', async () => {
    const result = await Fetch(sender, receiver.peerId, 'garbage')

    expect(result).to.equal(null)
  })
})
