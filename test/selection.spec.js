/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

var expect = require('chai').expect

const libp2pRecord = require('../src')
const selection = libp2pRecord.selection

const records = [new Buffer(0), new Buffer('hello')]

describe('selection', () => {
  describe('bestRecord', () => {
    it('throws on missing selector in the record key', () => {
      expect(
        () => selection.bestRecord({}, new Buffer('/'), records)
      ).to.throw(
        /Record key does not have a selector function/
      )
    })

    it('throws on unknown key prefix', () => {
      expect(
        () => selection.bestRecord({world () {}}, new Buffer('/hello/'), records)
      ).to.throw(
        /Unrecognized key prefix: hello/
      )
    })

    it('returns the index from the matching selector', () => {
      const selectors = {
        hello (k, recs) {
          expect(k).to.be.eql(new Buffer('/hello/world'))
          expect(recs).to.be.eql(records)

          return 1
        }
      }

      expect(
        selection.bestRecord(selectors, new Buffer('/hello/world'), records)
      ).to.equal(
        1
      )
    })
  })

  describe('selectors', () => {
    it('public key', () => {
      expect(
        selection.selectors.pk(new Buffer('/hello/world'), records)
      ).to.equal(
        0
      )
    })
  })
})
