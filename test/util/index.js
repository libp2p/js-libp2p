'use strict'

const chai = require('chai')
const expect = chai.expect

const expectErrCode = async (p, code) => {
  try {
    await p
  } catch (err) {
    expect(err).to.have.property('code', code)
    return
  }
  expect.fail(`Expected error with code ${code} but no error thrown`)
}

module.exports = { expectErrCode }
