/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const { Buffer } = require('buffer')
const utils = require('../src/utils')

describe('utils', () => {
  it('randomSeqno', () => {
    const first = utils.randomSeqno()
    const second = utils.randomSeqno()

    expect(first).to.have.length(8)
    expect(second).to.have.length(8)
    expect(first).to.not.eql(second)
  })

  it('msgId', () => {
    expect(utils.msgId('hello', Buffer.from('world'))).to.be.eql('hello776f726c64')
  })

  it('msgId should not generate same ID for two different buffers', () => {
    const peerId = 'QmPNdSYk5Rfpo5euNqwtyizzmKXMNHdXeLjTQhcN4yfX22'
    const msgId0 = utils.msgId(peerId, Buffer.from('15603533e990dfde', 'hex'))
    const msgId1 = utils.msgId(peerId, Buffer.from('15603533e990dfe0', 'hex'))
    expect(msgId0).to.not.eql(msgId1)
  })

  it('anyMatch', () => {
    [
      [[1, 2, 3], [4, 5, 6], false],
      [[1, 2], [1, 2], true],
      [[1, 2, 3], [4, 5, 1], true],
      [[5, 6, 1], [1, 2, 3], true],
      [[], [], false],
      [[1], [2], false]
    ].forEach((test) => {
      expect(utils.anyMatch(new Set(test[0]), new Set(test[1])))
        .to.eql(test[2])

      expect(utils.anyMatch(new Set(test[0]), test[1]))
        .to.eql(test[2])
    })
  })

  it('ensureArray', () => {
    expect(utils.ensureArray('hello')).to.be.eql(['hello'])
    expect(utils.ensureArray([1, 2])).to.be.eql([1, 2])
  })

  it('converts an IN msg.from to b58', () => {
    const binaryId = Buffer.from('1220e2187eb3e6c4fb3e7ff9ad4658610624a6315e0240fc6f37130eedb661e939cc', 'hex')
    const stringId = 'QmdZEWgtaWAxBh93fELFT298La1rsZfhiC2pqwMVwy3jZM'
    const m = [
      { from: binaryId },
      { from: stringId }
    ]
    const expected = [
      { from: stringId },
      { from: stringId }
    ]
    for (let i = 0; i < m.length; i++) {
      expect(utils.normalizeInRpcMessage(m[i])).to.deep.eql(expected[i])
    }
  })

  it('converts an OUT msg.from to binary', () => {
    const binaryId = Buffer.from('1220e2187eb3e6c4fb3e7ff9ad4658610624a6315e0240fc6f37130eedb661e939cc', 'hex')
    const stringId = 'QmdZEWgtaWAxBh93fELFT298La1rsZfhiC2pqwMVwy3jZM'
    const m = [
      { from: binaryId },
      { from: stringId }
    ]
    const expected = [
      { from: binaryId },
      { from: binaryId }
    ]
    for (let i = 0; i < m.length; i++) {
      expect(utils.normalizeOutRpcMessage(m[i])).to.deep.eql(expected[i])
    }
  })
})
