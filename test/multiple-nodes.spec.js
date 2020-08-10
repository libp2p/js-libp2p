/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const TestDHT = require('./utils/test-dht')
const uint8ArrayFromString = require('uint8arrays/from-string')

describe('multiple nodes', () => {
  const n = 8
  let tdht
  let dhts

  // spawn nodes
  beforeEach(async function () {
    this.timeout(10 * 1000)

    tdht = new TestDHT()
    dhts = await tdht.spawn(n)

    // all nodes except the last one
    const range = Array.from(Array(n - 1).keys())

    // connect the last one with the others one by one
    return Promise.all(range.map((i) => tdht.connect(dhts[n - 1], dhts[i])))
  })

  afterEach(function () {
    this.timeout(10 * 1000)

    return tdht.teardown()
  })

  it('put to "bootstrap" node and get with the others', async function () {
    this.timeout(10 * 1000)
    const key = uint8ArrayFromString('/v/hello0')
    const value = uint8ArrayFromString('world')

    await dhts[7].put(key, value)

    const res = await Promise.all([
      dhts[0].get(key, { timeout: 1000 }),
      dhts[1].get(key, { timeout: 1000 }),
      dhts[2].get(key, { timeout: 1000 }),
      dhts[3].get(key, { timeout: 1000 }),
      dhts[4].get(key, { timeout: 1000 }),
      dhts[5].get(key, { timeout: 1000 }),
      dhts[6].get(key, { timeout: 1000 })
    ])

    expect(res[0]).to.eql(uint8ArrayFromString('world'))
    expect(res[1]).to.eql(uint8ArrayFromString('world'))
    expect(res[2]).to.eql(uint8ArrayFromString('world'))
    expect(res[3]).to.eql(uint8ArrayFromString('world'))
    expect(res[4]).to.eql(uint8ArrayFromString('world'))
    expect(res[5]).to.eql(uint8ArrayFromString('world'))
    expect(res[6]).to.eql(uint8ArrayFromString('world'))
  })

  it('put to a node and get with the others', async function () {
    this.timeout(10 * 1000)
    const key = uint8ArrayFromString('/v/hello1')
    const value = uint8ArrayFromString('world')

    await dhts[1].put(key, value)

    const res = await Promise.all([
      dhts[0].get(key, { timeout: 1000 }),
      dhts[2].get(key, { timeout: 1000 }),
      dhts[3].get(key, { timeout: 1000 }),
      dhts[4].get(key, { timeout: 1000 }),
      dhts[5].get(key, { timeout: 1000 }),
      dhts[6].get(key, { timeout: 1000 }),
      dhts[7].get(key, { timeout: 1000 })
    ])

    expect(res[0]).to.eql(uint8ArrayFromString('world'))
    expect(res[1]).to.eql(uint8ArrayFromString('world'))
    expect(res[2]).to.eql(uint8ArrayFromString('world'))
    expect(res[3]).to.eql(uint8ArrayFromString('world'))
    expect(res[4]).to.eql(uint8ArrayFromString('world'))
    expect(res[5]).to.eql(uint8ArrayFromString('world'))
    expect(res[6]).to.eql(uint8ArrayFromString('world'))
  })

  it('put to several nodes in series with different values and get the last one in a subset of them', async function () {
    this.timeout(20 * 1000)
    const key = uint8ArrayFromString('/v/hallo')
    const result = uint8ArrayFromString('world4')

    await dhts[0].put(key, uint8ArrayFromString('world0'))
    await dhts[1].put(key, uint8ArrayFromString('world1'))
    await dhts[2].put(key, uint8ArrayFromString('world2'))
    await dhts[3].put(key, uint8ArrayFromString('world3'))
    await dhts[4].put(key, uint8ArrayFromString('world4'))

    const res = await Promise.all([
      dhts[4].get(key, { timeout: 2000 }),
      dhts[5].get(key, { timeout: 2000 }),
      dhts[6].get(key, { timeout: 2000 }),
      dhts[7].get(key, { timeout: 2000 })
    ])

    expect(res[0]).to.eql(result)
    expect(res[1]).to.eql(result)
    expect(res[2]).to.eql(result)
    expect(res[3]).to.eql(result)
  })
})
