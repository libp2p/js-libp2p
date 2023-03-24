import { expect } from 'aegir/chai'
import { logger } from '../src/index.js'
import debug from 'debug'

describe('logger', () => {
  it('creates a logger', () => {
    const log = logger('hello')

    expect(log).to.be.a('function')
    expect(log).to.a.property('enabled').that.is.not.true()
    expect(log).to.have.property('error').that.is.a('function')
    expect(log).to.have.nested.property('error.enabled').that.is.not.true()
    expect(log).to.have.property('trace').that.is.a('function')
    expect(log).to.have.nested.property('trace.enabled').that.is.not.true()
  })

  it('creates a logger with logging enabled', () => {
    debug.enable('enabled-logger')

    const log = logger('enabled-logger')

    expect(log).to.be.a('function')
    expect(log).to.a.property('enabled').that.is.true()
    expect(log).to.have.property('error').that.is.a('function')
    expect(log).to.have.nested.property('error.enabled').that.is.not.true()
    expect(log).to.have.property('trace').that.is.a('function')
    expect(log).to.have.nested.property('trace.enabled').that.is.not.true()
  })

  it('creates a logger with logging and errors enabled', () => {
    debug.enable('enabled-with-error-logger*')

    const log = logger('enabled-with-error-logger')

    expect(log).to.be.a('function')
    expect(log).to.a.property('enabled').that.is.true()
    expect(log).to.have.property('error').that.is.a('function')
    expect(log).to.have.nested.property('error.enabled').that.is.true()
    expect(log).to.have.property('trace').that.is.a('function')
    expect(log).to.have.nested.property('trace.enabled').that.is.not.true()
  })

  it('creates a logger with trace enabled', () => {
    debug.enable('enabled-with-trace-logger*,*:trace')

    const log = logger('enabled-with-trace-logger')

    expect(log).to.be.a('function')
    expect(log).to.a.property('enabled').that.is.true()
    expect(log).to.have.property('error').that.is.a('function')
    expect(log).to.have.nested.property('error.enabled').that.is.true()
    expect(log).to.have.property('trace').that.is.a('function')
    expect(log).to.have.nested.property('trace.enabled').that.is.true()
  })
})
