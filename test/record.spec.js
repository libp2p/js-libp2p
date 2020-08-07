/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const uint8ArrayFromString = require('uint8arrays/from-string')
const libp2pRecord = require('../src')
const Record = libp2pRecord.Record

const fixture = require('./fixtures/go-record.js')

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10))

describe('record', () => {
  it('new', () => {
    const rec = new Record(
      uint8ArrayFromString('hello'),
      uint8ArrayFromString('world')
    )

    expect(rec).to.have.property('key').eql(uint8ArrayFromString('hello'))
    expect(rec).to.have.property('value').eql(uint8ArrayFromString('world'))
  })

  it('serialize & deserialize', () => {
    const rec = new Record(uint8ArrayFromString('hello'), uint8ArrayFromString('world'), date)
    const dec = Record.deserialize(rec.serialize())

    expect(dec).to.have.property('key').eql(uint8ArrayFromString('hello'))
    expect(dec).to.have.property('value').eql(uint8ArrayFromString('world'))
    expect(dec.timeReceived).to.be.eql(date)
  })

  describe('go interop', () => {
    it('no signature', () => {
      const dec = Record.deserialize(fixture.serialized)
      expect(dec).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(dec).to.have.property('value').eql(uint8ArrayFromString('world'))
    })
  })
})
