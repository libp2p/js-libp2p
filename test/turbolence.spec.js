/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
// const TCP = require('../src')

describe.skip('turbolence', () => {
  it('dialer - emits error on the other end is terminated abruptly', (done) => {
    expect('ok').to.equal('ok')
  })

  it('listener - emits error on the other end is terminated abruptly', (done) => {})
})
