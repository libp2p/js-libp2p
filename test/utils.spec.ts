/* eslint-env mocha */

import { expect } from 'aegir/chai'
import * as utils from '../src/utils.js'

const dates = [{
  obj: new Date(Date.UTC(2016, 0, 1, 8, 22, 33, 392)),
  str: '2016-01-01T08:22:33.392000000Z'
}, {
  obj: new Date(Date.UTC(2016, 11, 30, 20, 2, 3, 392)),
  str: '2016-12-30T20:02:03.392000000Z'
}, {
  obj: new Date(Date.UTC(2016, 11, 30, 20, 2, 5, 297)),
  str: '2016-12-30T20:02:05.297000000Z'
}, {
  obj: new Date(Date.UTC(2012, 1, 25, 10, 10, 10, 10)),
  str: '2012-02-25T10:10:10.10000000Z'
}]

describe('utils', () => {
  it('toRFC3339', () => {
    dates.forEach((c) => {
      expect(utils.toRFC3339(c.obj)).to.be.eql(c.str)
    })
  })

  it('parseRFC3339', () => {
    dates.forEach((c) => {
      expect(utils.parseRFC3339(c.str)).to.be.eql(c.obj)
    })
  })

  it('to and from RFC3339', () => {
    dates.forEach((c) => {
      expect(
        utils.parseRFC3339(utils.toRFC3339(c.obj))
      ).to.be.eql(
        c.obj
      )
      expect(
        utils.toRFC3339(utils.parseRFC3339(c.str))
      ).to.be.eql(
        c.str
      )
    })
  })
})
