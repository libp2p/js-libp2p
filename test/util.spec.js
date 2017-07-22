/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const util = require('../src/util')
const BN = require('bn.js')

describe('Util', () => {
  let bn

  before((done) => {
    bn = new BN('dead', 16)
    done()
  })

  it('toBase64', (done) => {
    expect(util.toBase64(bn)).to.eql('3q0')
    done()
  })

  it('toBase64 zero padding', (done) => {
    let bnpad = new BN('ff', 16)
    expect(util.toBase64(bnpad, 2)).to.eql('AP8')
    done()
  })
})
