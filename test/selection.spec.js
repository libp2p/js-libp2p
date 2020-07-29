/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
const { utf8TextEncoder } = require('./utils')
const libp2pRecord = require('../src')
const selection = libp2pRecord.selection

const records = [new Uint8Array(), utf8TextEncoder.encode('hello')]

describe('selection', () => {
  describe('bestRecord', () => {
    it('throws no records given when no records received', () => {
      expect(
        () => selection.bestRecord({}, utf8TextEncoder.encode('/'), [])
      ).to.throw(
        /No records given/
      )
    })

    it('throws on missing selector in the record key', () => {
      expect(
        () => selection.bestRecord({}, utf8TextEncoder.encode('/'), records)
      ).to.throw(
        /Record key does not have a selector function/
      )
    })

    it('throws on unknown key prefix', () => {
      expect(
        () => selection.bestRecord({ world () {} }, utf8TextEncoder.encode('/hello/'), records)
      ).to.throw(
        /Unrecognized key prefix: hello/
      )
    })

    it('returns the index from the matching selector', () => {
      const selectors = {
        hello (k, recs) {
          expect(k).to.be.eql(utf8TextEncoder.encode('/hello/world'))
          expect(recs).to.be.eql(records)

          return 1
        }
      }

      expect(
        selection.bestRecord(selectors, utf8TextEncoder.encode('/hello/world'), records)
      ).to.equal(
        1
      )
    })
  })

  describe('selectors', () => {
    it('public key', () => {
      expect(
        selection.selectors.pk(utf8TextEncoder.encode('/hello/world'), records)
      ).to.equal(
        0
      )
    })
  })
})
