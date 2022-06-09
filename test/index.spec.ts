import { expect } from 'aegir/chai'
import { logger } from '../src/index.js'

describe('logger', () => {
  it('creates a logger', () => {
    const log = logger('hello')

    expect(log).to.be.a('function')
    expect(log).to.have.property('error').that.is.a('function')
    expect(log).to.have.property('enabled')
  })
})
