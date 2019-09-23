/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { BufferList } = require('bl')
const { expect } = chai
chai.use(dirtyChai)

const coder = require('../src/coder')

describe('coder', () => {
  it('should encode header', async () => {
    const source = [{ id: 17, type: 0, data: Buffer.from('17') }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    const expectedHeader = Buffer.from('880102', 'hex')
    expect(data.slice(0, expectedHeader.length)).to.be.eql(expectedHeader)
  })

  it('should decode header', async () => {
    const source = [Buffer.from('8801023137', 'hex')]
    for await (const msgs of coder.decode(source)) {
      expect(msgs.length).to.equal(1)
      msgs[0].data = msgs[0].data.slice() // convert BufferList to Buffer
      expect(msgs[0]).to.be.eql({ id: 17, type: 0, data: Buffer.from('17') })
    }
  })

  it('should encode several msgs into buffer', async () => {
    const source = [
      { id: 17, type: 0, data: Buffer.from('17') },
      { id: 19, type: 0, data: Buffer.from('19') },
      { id: 21, type: 0, data: Buffer.from('21') }
    ]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.be.eql(Buffer.from('88010231379801023139a801023231', 'hex'))
  })

  it('should encode from BufferList', async () => {
    const source = [{
      id: 17,
      type: 0,
      data: new BufferList([
        Buffer.from(Math.random().toString()),
        Buffer.from(Math.random().toString())
      ])
    }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.be.eql(Buffer.concat([
      Buffer.from('8801', 'hex'),
      Buffer.from([source[0].data.length]),
      source[0].data.slice()
    ]))
  })

  it('should decode msgs from buffer', async () => {
    const source = [Buffer.from('88010231379801023139a801023231', 'hex')]

    const res = []
    for await (const msgs of coder.decode(source)) {
      for (const msg of msgs) {
        msg.data = msg.data.slice() // convert BufferList to Buffer
        res.push(msg)
      }
    }

    expect(res).to.be.deep.eql([
      { id: 17, type: 0, data: Buffer.from('17') },
      { id: 19, type: 0, data: Buffer.from('19') },
      { id: 21, type: 0, data: Buffer.from('21') }
    ])
  })

  it('should encode zero length body msg', async () => {
    const source = [{ id: 17, type: 0 }]

    const data = new BufferList()
    for await (const chunk of coder.encode(source)) {
      data.append(chunk)
    }

    expect(data.slice()).to.be.eql(Buffer.from('880100', 'hex'))
  })

  it('should decode zero length body msg', async () => {
    const source = [Buffer.from('880100', 'hex')]

    for await (const msgs of coder.decode(source)) {
      expect(msgs.length).to.equal(1)
      msgs[0].data = msgs[0].data.slice() // convert BufferList to Buffer
      expect(msgs[0]).to.be.eql({ id: 17, type: 0, data: Buffer.alloc(0) })
    }
  })
})
