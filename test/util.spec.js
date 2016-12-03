/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const util = require('../src/crypto/util')
const BN = require('bn.js')

describe('Util', () => {
  let bn

  before((done) => {
    bn = new BN('dead', 16)
    done()
  })

  it('toBase64', (done) => {
    expect(util.toBase64(bn)).to.be.eql('3q0')
    done()
  })
})
