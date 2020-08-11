/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const { BufferList } = require('bl')
const { expect } = require('aegir/utils/chai')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayConcat = require('uint8arrays/concat')

const coder = require('../src/coder')

describe('coder', () => {
  it('should encode header', async () => {
    const source = [{ id: 17, type: 0, data: uint8ArrayFromString('17') }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    const expectedHeader = uint8ArrayFromString('880102', 'base16')
    expect(data.slice(0, expectedHeader.length)).to.be.eql(expectedHeader)
  })

  it('should decode header', async () => {
    const source = [uint8ArrayFromString('8801023137', 'base16')]
    for await (const msgs of coder.decode(source)) {
      expect(msgs.length).to.equal(1)
      msgs[0].data = msgs[0].data.slice() // convert BufferList to Buffer
      expect(msgs[0]).to.be.eql({ id: 17, type: 0, data: uint8ArrayFromString('17') })
    }
  })

  it('should encode several msgs into buffer', async () => {
    const source = [
      { id: 17, type: 0, data: uint8ArrayFromString('17') },
      { id: 19, type: 0, data: uint8ArrayFromString('19') },
      { id: 21, type: 0, data: uint8ArrayFromString('21') }
    ]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.be.eql(uint8ArrayFromString('88010231379801023139a801023231', 'base16'))
  })

  it('should encode from BufferList', async () => {
    const source = [{
      id: 17,
      type: 0,
      data: new BufferList([
        uint8ArrayFromString(Math.random().toString()),
        uint8ArrayFromString(Math.random().toString())
      ])
    }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.eql(uint8ArrayConcat([
      uint8ArrayFromString('8801', 'base16'),
      Uint8Array.from([source[0].data.length]),
      source[0].data.slice()
    ]))
  })

  it('should decode msgs from buffer', async () => {
    const source = [uint8ArrayFromString('88010231379801023139a801023231', 'base16')]

    const res = []
    for await (const msgs of coder.decode(source)) {
      for (const msg of msgs) {
        msg.data = msg.data.slice() // convert BufferList to Buffer
        res.push(msg)
      }
    }

    expect(res).to.be.deep.eql([
      { id: 17, type: 0, data: uint8ArrayFromString('17') },
      { id: 19, type: 0, data: uint8ArrayFromString('19') },
      { id: 21, type: 0, data: uint8ArrayFromString('21') }
    ])
  })

  it('should encode zero length body msg', async () => {
    const source = [{ id: 17, type: 0 }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.be.eql(uint8ArrayFromString('880100', 'base16'))
  })

  it('should decode zero length body msg', async () => {
    const source = [uint8ArrayFromString('880100', 'base16')]

    for await (const msgs of coder.decode(source)) {
      expect(msgs.length).to.equal(1)
      msgs[0].data = msgs[0].data.slice() // convert BufferList to Buffer
      expect(msgs[0]).to.be.eql({ id: 17, type: 0, data: new Uint8Array(0) })
    }
  })
})
