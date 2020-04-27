/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const { Buffer } = require('buffer')
const libp2pRecord = require('../src')
const Record = libp2pRecord.Record

const fixture = require('./fixtures/go-record.js')

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10))

describe('record', () => {
  it('new', () => {
    const rec = new Record(
      Buffer.from('hello'),
      Buffer.from('world')
    )

    expect(rec).to.have.property('key').eql(Buffer.from('hello'))
    expect(rec).to.have.property('value').eql(Buffer.from('world'))
  })

  it('serialize & deserialize', () => {
    const rec = new Record(Buffer.from('hello'), Buffer.from('world'), date)
    const dec = Record.deserialize(rec.serialize())

    expect(dec).to.have.property('key').eql(Buffer.from('hello'))
    expect(dec).to.have.property('value').eql(Buffer.from('world'))
    expect(dec.timeReceived).to.be.eql(date)
  })

  describe('go interop', () => {
    it('no signature', () => {
      const dec = Record.deserialize(fixture.serialized)
      expect(dec).to.have.property('key').eql(Buffer.from('hello'))
      expect(dec).to.have.property('value').eql(Buffer.from('world'))
    })
  })
})
