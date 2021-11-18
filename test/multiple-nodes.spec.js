/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const TestDHT = require('./utils/test-dht')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const drain = require('it-drain')
const last = require('it-last')

describe('multiple nodes', () => {
  const n = 8
  let tdht
  let dhts

  // spawn nodes
  beforeEach(async function () {
    this.timeout(10 * 1000)

    tdht = new TestDHT()
    dhts = await tdht.spawn(n, {
      clientMode: false
    })

    // all nodes except the last one
    const range = Array.from(Array(n - 1).keys())

    // connect the last one with the others one by one
    return Promise.all(range.map((i) => tdht.connect(dhts[n - 1], dhts[i])))
  })

  afterEach(function () {
    this.timeout(10 * 1000)

    tdht.teardown()
  })

  it('put to "bootstrap" node and get with the others', async function () {
    this.timeout(10 * 1000)
    const key = uint8ArrayFromString('/v/hello0')
    const value = uint8ArrayFromString('world')

    await drain(dhts[7].put(key, value))

    const res = await Promise.all([
      last(dhts[0].get(key)),
      last(dhts[1].get(key)),
      last(dhts[2].get(key)),
      last(dhts[3].get(key)),
      last(dhts[4].get(key)),
      last(dhts[5].get(key)),
      last(dhts[6].get(key))
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
    this.timeout(10 * 1000)
    const key = uint8ArrayFromString('/v/hello1')
    const value = uint8ArrayFromString('world')

    await drain(dhts[1].put(key, value))

    const res = await Promise.all([
      last(dhts[0].get(key)),
      last(dhts[2].get(key)),
      last(dhts[3].get(key)),
      last(dhts[4].get(key)),
      last(dhts[5].get(key)),
      last(dhts[6].get(key)),
      last(dhts[7].get(key))
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
    this.timeout(20 * 1000)
    const key = uint8ArrayFromString('/v/hallo')
    const result = uint8ArrayFromString('world4')

    await drain(dhts[0].put(key, uint8ArrayFromString('world0')))
    await drain(dhts[1].put(key, uint8ArrayFromString('world1')))
    await drain(dhts[2].put(key, uint8ArrayFromString('world2')))
    await drain(dhts[3].put(key, uint8ArrayFromString('world3')))
    await drain(dhts[4].put(key, uint8ArrayFromString('world4')))

    const res = await Promise.all([
      last(dhts[4].get(key)),
      last(dhts[5].get(key)),
      last(dhts[6].get(key)),
      last(dhts[7].get(key))
    ])

    expect(res[0]).have.property('value').that.equalBytes(result)
    expect(res[1]).have.property('value').that.equalBytes(result)
    expect(res[2]).have.property('value').that.equalBytes(result)
    expect(res[3]).have.property('value').that.equalBytes(result)
  })
})
