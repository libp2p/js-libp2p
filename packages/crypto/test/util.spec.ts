/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import 'node-forge/lib/jsbn.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import * as util from '../src/util.js'

describe('Util', () => {
  let bn: typeof forge.jsbn.BigInteger

  before(() => {
    bn = new forge.jsbn.BigInteger('dead', 16)
  })

  it('should convert BigInteger to a uint base64url encoded string', () => {
    expect(util.bigIntegerToUintBase64url(bn)).to.eql('3q0')
  })

  it('should convert BigInteger to a uint base64url encoded string with padding', () => {
    const bnpad = new forge.jsbn.BigInteger('ff', 16)
    expect(util.bigIntegerToUintBase64url(bnpad, 2)).to.eql('AP8')
  })

  it('should convert base64url encoded string to BigInteger', () => {
    const num = util.base64urlToBigInteger('3q0')
    expect(num.equals(bn)).to.be.true()
  })

  it('should convert base64url encoded string to Uint8Array with padding', () => {
    const buf = util.base64urlToBuffer('AP8', 2)
    expect(Uint8Array.from([0, 255])).to.eql(buf)
  })
})
