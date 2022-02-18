/* eslint-env mocha */
import { expect } from 'aegir/utils/chai.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Libp2pRecord } from '../src/index.js'
import * as fixture from './fixtures/go-record.js'

const date = new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10))

describe('record', () => {
  it('new', () => {
    const rec = new Libp2pRecord(
      uint8ArrayFromString('hello'),
      uint8ArrayFromString('world')
    )

    expect(rec).to.have.property('key').eql(uint8ArrayFromString('hello'))
    expect(rec).to.have.property('value').eql(uint8ArrayFromString('world'))
  })

  it('serialize & deserialize', () => {
    const rec = new Libp2pRecord(uint8ArrayFromString('hello'), uint8ArrayFromString('world'), date)
    const dec = Libp2pRecord.deserialize(rec.serialize())

    expect(dec).to.have.property('key').eql(uint8ArrayFromString('hello'))
    expect(dec).to.have.property('value').eql(uint8ArrayFromString('world'))
    expect(dec.timeReceived).to.be.eql(date)
  })

  describe('go interop', () => {
    it('no signature', () => {
      const dec = Libp2pRecord.deserialize(fixture.serialized)
      expect(dec).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(dec).to.have.property('value').eql(uint8ArrayFromString('world'))
    })
  })
})
