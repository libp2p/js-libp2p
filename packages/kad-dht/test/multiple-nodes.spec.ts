import { expect } from 'aegir/chai'
import drain from 'it-drain'
import last from 'it-last'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { convertBuffer } from '../src/utils.js'
import { sortDHTs } from './utils/sort-closest-peers.js'
import { TestDHT } from './utils/test-dht.js'
import type { KadDHTPeer } from './utils/test-dht.js'

describe('multiple nodes', function () {
  this.timeout(60 * 1000)
  const n = 8
  let testDHT: TestDHT
  let dhts: KadDHTPeer[]

  // spawn nodes
  beforeEach(async function () {
    testDHT = new TestDHT()
    dhts = await Promise.all(
      new Array(n).fill(0).map(async () => testDHT.spawn({
        clientMode: false
      }))
    )

    // all nodes except the last one
    const range = Array.from(Array(n - 1).keys())

    // connect the last one with the others one by one
    return Promise.all(range.map(async (i) => { await testDHT.connect(dhts[n - 1], dhts[i]) }))
  })

  afterEach(async function () {
    await testDHT.teardown()
  })

  it('put to "bootstrap" node and get with the others', async function () {
    const key = uint8ArrayFromString('/v/hello0')
    const value = uint8ArrayFromString('world')

    dhts = await sortDHTs(dhts, await convertBuffer(key))

    await drain(dhts[7].dht.put(key, value))

    const res = await Promise.all([
      last(dhts[0].dht.get(key)),
      last(dhts[1].dht.get(key)),
      last(dhts[2].dht.get(key)),
      last(dhts[3].dht.get(key)),
      last(dhts[4].dht.get(key)),
      last(dhts[5].dht.get(key)),
      last(dhts[6].dht.get(key))
    ])

    expect(res[0]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[1]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[2]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[3]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[4]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[5]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[6]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
  })

  it('put to a node and get with the others', async function () {
    const key = uint8ArrayFromString('/v/hello1')
    const value = uint8ArrayFromString('world')

    dhts = await sortDHTs(dhts, await convertBuffer(key))

    await drain(dhts[1].dht.put(key, value))

    const res = await Promise.all([
      last(dhts[0].dht.get(key)),
      last(dhts[2].dht.get(key)),
      last(dhts[3].dht.get(key)),
      last(dhts[4].dht.get(key)),
      last(dhts[5].dht.get(key)),
      last(dhts[6].dht.get(key)),
      last(dhts[7].dht.get(key))
    ])

    expect(res[0]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[1]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[2]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[3]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[4]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[5]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
    expect(res[6]).have.property('value').that.equalBytes(uint8ArrayFromString('world'))
  })

  it('put to several nodes in series with different values and get the last one in a subset of them', async function () {
    const key = uint8ArrayFromString('/v/hallo')
    const result = uint8ArrayFromString('world4')

    dhts = await sortDHTs(dhts, await convertBuffer(key))

    await drain(dhts[3].dht.put(key, uint8ArrayFromString('world0')))
    await drain(dhts[4].dht.put(key, uint8ArrayFromString('world1')))
    await drain(dhts[5].dht.put(key, uint8ArrayFromString('world2')))
    await drain(dhts[6].dht.put(key, uint8ArrayFromString('world3')))
    await drain(dhts[7].dht.put(key, uint8ArrayFromString('world4')))

    const res = await Promise.all([
      last(dhts[0].dht.get(key)),
      last(dhts[1].dht.get(key)),
      last(dhts[2].dht.get(key)),
      last(dhts[3].dht.get(key))
    ])

    expect(res[0]).have.property('value').that.equalBytes(result)
    expect(res[1]).have.property('value').that.equalBytes(result)
    expect(res[2]).have.property('value').that.equalBytes(result)
    expect(res[3]).have.property('value').that.equalBytes(result)
  })
})
