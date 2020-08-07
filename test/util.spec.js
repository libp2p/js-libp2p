/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
require('node-forge/lib/jsbn')
const forge = require('node-forge/lib/forge')
const util = require('../src/util')

describe('Util', () => {
  let bn

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
