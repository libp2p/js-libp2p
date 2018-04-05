/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Prepare = require('./utils/prepare')

describe('connection manager', function () {
  const prepare = Prepare(3)
  before(prepare.before)
  after(prepare.after)

  it('works', (done) => {
    setTimeout(done, 1900)
  })
})
