/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')

describe('Constructor', () => {
  it('create an instance', () => {
    const tcp = new TCP()
    expect(tcp).to.exist()
  })
})
