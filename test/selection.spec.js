/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const libp2pRecord = require('../src')
const selection = libp2pRecord.selection

const records = [new Uint8Array(), uint8ArrayFromString('hello')]

describe('selection', () => {
  describe('bestRecord', () => {
    it('throws no records given when no records received', () => {
      expect(
        () => selection.bestRecord({}, uint8ArrayFromString('/'), [])
      ).to.throw(
        /No records given/
      )
    })

    it('throws on missing selector in the record key', () => {
      expect(
        () => selection.bestRecord({}, uint8ArrayFromString('/'), records)
      ).to.throw(
        /Record key does not have a selector function/
      )
    })

    it('throws on unknown key prefix', () => {
      expect(
        () => selection.bestRecord({ world () {} }, uint8ArrayFromString('/hello/'), records)
      ).to.throw(
        /Unrecognized key prefix: hello/
      )
    })

    it('returns the index from the matching selector', () => {
      const selectors = {
        hello (k, recs) {
          expect(k).to.be.eql(uint8ArrayFromString('/hello/world'))
          expect(recs).to.be.eql(records)

          return 1
        }
      }

      expect(
        selection.bestRecord(selectors, uint8ArrayFromString('/hello/world'), records)
      ).to.equal(
        1
      )
    })
  })

  describe('selectors', () => {
    it('public key', () => {
      expect(
        selection.selectors.pk(uint8ArrayFromString('/hello/world'), records)
      ).to.equal(
        0
      )
    })

    it('returns the first record when there is only one to select', () => {
      expect(
        selection.selectors.pk(uint8ArrayFromString('/hello/world'), [records[0]])
      ).to.equal(
        0
      )
    })
  })
})
