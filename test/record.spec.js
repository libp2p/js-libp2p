/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const { utf8TextEncoder } = require('./utils')
const libp2pRecord = require('../src')
const Record = libp2pRecord.Record

const fixture = require('./fixtures/go-record.js')

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10))

describe('record', () => {
  it('new', () => {
    const rec = new Record(
      utf8TextEncoder.encode('hello'),
      utf8TextEncoder.encode('world')
    )

    expect(rec).to.have.property('key').eql(utf8TextEncoder.encode('hello'))
    expect(rec).to.have.property('value').eql(utf8TextEncoder.encode('world'))
  })

  it('serialize & deserialize', () => {
    const rec = new Record(utf8TextEncoder.encode('hello'), utf8TextEncoder.encode('world'), date)
    const dec = Record.deserialize(rec.serialize())

    expect(dec).to.have.property('key').eql(utf8TextEncoder.encode('hello'))
    expect(dec).to.have.property('value').eql(utf8TextEncoder.encode('world'))
    expect(dec.timeReceived).to.be.eql(date)
  })

  describe('go interop', () => {
    it('no signature', () => {
      const dec = Record.deserialize(fixture.serialized)
      expect(dec).to.have.property('key').eql(utf8TextEncoder.encode('hello'))
      expect(dec).to.have.property('value').eql(utf8TextEncoder.encode('world'))
    })
  })
})
