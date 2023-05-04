/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import { createPeerId } from '../utils/creators/peer.js'
import { codes } from '../../src/errors.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { FetchService, fetchService } from '../../src/fetch/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

async function createNode (peerId: PeerId): Promise<Libp2p<{ fetch: FetchService }>> {
  return await createLibp2p({
    peerId,
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ],
    services: {
      fetch: fetchService()
    }
  })
}

describe('Fetch', () => {
  let sender: Libp2p<{ fetch: FetchService }>
  let receiver: Libp2p<{ fetch: FetchService }>
  const PREFIX_A = '/moduleA/'
  const PREFIX_B = '/moduleB/'
  const DATA_A = { foobar: 'hello world' }
  const DATA_B = { foobar: 'goodnight moon' }

  const generateLookupFunction = function (prefix: string, data: Record<string, string>) {
    return async function (key: string): Promise<Uint8Array | null> {
      key = key.slice(prefix.length) // strip prefix from key
      const val = data[key]
      if (val != null) {
        return (new TextEncoder()).encode(val)
      }
      return null
    }
  }

  beforeEach(async () => {
    const peerIdA = await createPeerId()
    const peerIdB = await createPeerId()
    sender = await createNode(peerIdA)
    receiver = await createNode(peerIdB)

    await sender.start()
    await receiver.start()

    await receiver.dial(sender.getMultiaddrs()[0])
  })

  afterEach(async () => {
    await sender.stop()
    await receiver.stop()
  })

  it('fetch key that exists in receivers datastore', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    const rawData = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawData == null) {
      throw new Error('Value was not found')
    }

    const value = (new TextDecoder()).decode(rawData)
    expect(value).to.equal('hello world')
  })

  it('Different lookups for different prefixes', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    receiver.services.fetch.registerLookupFunction(PREFIX_B, generateLookupFunction(PREFIX_B, DATA_B))

    const rawDataA = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataA == null) {
      throw new Error('Value was not found')
    }

    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    // Different lookup functions can be registered on different prefixes, and have different
    // values for the same key underneath the different prefix.
    const rawDataB = await sender.services.fetch.fetch(receiver.peerId, '/moduleB/foobar')

    if (rawDataB == null) {
      throw new Error('Value was not found')
    }

    const valueB = (new TextDecoder()).decode(rawDataB)
    expect(valueB).to.equal('goodnight moon')
  })

  it('fetch key that does not exist in receivers datastore', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))
    const result = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/garbage')

    expect(result).to.equal(null)
  })

  it('fetch key with unknown prefix throws error', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    await expect(sender.services.fetch.fetch(receiver.peerId, '/moduleUNKNOWN/foobar'))
      .to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('registering multiple handlers for same prefix errors', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    expect(() => { receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_B)) })
      .to.throw().with.property('code', codes.ERR_KEY_ALREADY_EXISTS)
  })

  it('can unregister handler', async () => {
    const lookupFunction = generateLookupFunction(PREFIX_A, DATA_A)
    receiver.services.fetch.registerLookupFunction(PREFIX_A, lookupFunction)
    const rawDataA = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataA == null) {
      throw new Error('Value was not found')
    }

    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    receiver.services.fetch.unregisterLookupFunction(PREFIX_A, lookupFunction)

    await expect(sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar'))
      .to.eventually.be.rejectedWith(/No lookup function registered for key/)
  })

  it('can unregister all handlers', async () => {
    const lookupFunction = generateLookupFunction(PREFIX_A, DATA_A)
    receiver.services.fetch.registerLookupFunction(PREFIX_A, lookupFunction)
    const rawDataA = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataA == null) {
      throw new Error('Value was not found')
    }

    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    receiver.services.fetch.unregisterLookupFunction(PREFIX_A)

    await expect(sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar'))
      .to.eventually.be.rejectedWith(/No lookup function registered for key/)
  })

  it('does not unregister wrong handlers', async () => {
    const lookupFunction = generateLookupFunction(PREFIX_A, DATA_A)
    receiver.services.fetch.registerLookupFunction(PREFIX_A, lookupFunction)
    const rawDataA = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataA == null) {
      throw new Error('Value was not found')
    }

    const valueA = (new TextDecoder()).decode(rawDataA)
    expect(valueA).to.equal('hello world')

    receiver.services.fetch.unregisterLookupFunction(PREFIX_A, async () => { return null })

    const rawDataB = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataB == null) {
      throw new Error('Value was not found')
    }

    const valueB = (new TextDecoder()).decode(rawDataB)
    expect(valueB).to.equal('hello world')
  })
})
