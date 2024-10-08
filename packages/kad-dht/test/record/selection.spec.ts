/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as selection from '../../src/record/selectors.js'
import type { Selectors } from '../../src/index.js'

const records = [new Uint8Array(), uint8ArrayFromString('hello')]

describe('selection', () => {
  describe('bestRecord', () => {
    it('throws no records given when no records received', () => {
      expect(
        () => selection.bestRecord({}, uint8ArrayFromString('/'), [])
      ).to.throw().with.property('name', 'InvalidParametersError')
    })

    it('throws on missing selector in the record key', () => {
      expect(
        () => selection.bestRecord({}, uint8ArrayFromString('/no-selector/key-value'), records)
      ).to.throw().with.property('name', 'MissingSelectorError')
    })

    it('throws on unknown key prefix', () => {
      expect(
        // @ts-expect-error invalid input
        () => selection.bestRecord({ world () {} }, uint8ArrayFromString('/world'), records)
      ).to.throw().with.property('name', 'InvalidParametersError')
    })

    it('returns the index from the matching selector', () => {
      const selectors: Selectors = {
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
