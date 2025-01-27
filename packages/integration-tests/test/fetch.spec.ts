/* eslint-env mocha */

import { type Fetch, fetch } from '@libp2p/fetch'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isWebWorker } from 'wherearewe'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

async function createNode (): Promise<Libp2p<{ fetch: Fetch }>> {
  return createLibp2p(createBaseOptions({
    services: {
      fetch: fetch()
    }
  }))
}

describe('fetch', () => {
  if (isWebWorker) {
    it.skip('tests are skipped because WebWorkers can only have limited connections', () => {

    })
    return
  }

  let sender: Libp2p<{ fetch: Fetch }>
  let receiver: Libp2p<{ fetch: Fetch }>
  const PREFIX_A = '/moduleA/'
  const PREFIX_B = '/moduleB/'
  const DATA_A = { foobar: 'hello world' }
  const DATA_B = { foobar: 'goodnight moon' }

  const generateLookupFunction = function (prefix: string, data: Record<string, string>) {
    return async function (key: Uint8Array): Promise<Uint8Array | undefined> {
      key = key.slice(prefix.length) // strip prefix from key
      const val = data[uint8ArrayToString(key)]
      if (val != null) {
        return (new TextEncoder()).encode(val)
      }
    }
  }

  beforeEach(async () => {
    sender = await createNode()
    receiver = await createNode()

    await sender.start()
    await receiver.start()

    await sender.peerStore.patch(receiver.peerId, {
      multiaddrs: receiver.getMultiaddrs()
    })
    await receiver.peerStore.patch(sender.peerId, {
      multiaddrs: sender.getMultiaddrs()
    })
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

  it('different lookups for different prefixes', async () => {
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

    expect(result).to.be.undefined()
  })

  it('fetch key with unknown prefix throws error', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    await expect(sender.services.fetch.fetch(receiver.peerId, '/moduleUNKNOWN/foobar'))
      .to.eventually.be.rejected.with.property('name', 'ProtocolError')
  })

  it('registering multiple handlers for same prefix errors', async () => {
    receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_A))

    expect(() => { receiver.services.fetch.registerLookupFunction(PREFIX_A, generateLookupFunction(PREFIX_A, DATA_B)) })
      .to.throw().with.property('name', 'InvalidParametersError')
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

    receiver.services.fetch.unregisterLookupFunction(PREFIX_A, async () => {
      return undefined
    })

    const rawDataB = await sender.services.fetch.fetch(receiver.peerId, '/moduleA/foobar')

    if (rawDataB == null) {
      throw new Error('Value was not found')
    }

    const valueB = (new TextDecoder()).decode(rawDataB)
    expect(valueB).to.equal('hello world')
  })
})
