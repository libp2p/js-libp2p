/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import * as util from '../src/util.js'

describe('Util', () => {
  it('should convert base64url encoded string to Uint8Array with padding', () => {
    const buf = util.base64urlToBuffer('AP8', 2)
    expect(Uint8Array.from([0, 255])).to.eql(buf)
  })
})
