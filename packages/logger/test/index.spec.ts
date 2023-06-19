import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import debug from 'debug'
import { Key } from 'interface-datastore'
import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'
import { base64 } from 'multiformats/bases/base64'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as unint8ArrayToString } from 'uint8arrays/to-string'
import { logger } from '../src/index.js'

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

  it('has all formatters', () => {
    debug.enable('enabled-with-formatters')

    expect(debug.formatters).to.have.property('b').that.is.a('function')
    expect(debug.formatters).to.have.property('t').that.is.a('function')
    expect(debug.formatters).to.have.property('m').that.is.a('function')
    expect(debug.formatters).to.have.property('p').that.is.a('function')
    expect(debug.formatters).to.have.property('c').that.is.a('function')
    expect(debug.formatters).to.have.property('k').that.is.a('function')
    expect(debug.formatters).to.have.property('a').that.is.a('function')
  })

  it('test printf style formatting', () => {
    const log = logger('printf-style')
    debug.enable('printf-style')

    const ma = multiaddr('/ip4/127.0.0.1/tcp/4001')

    const debugSpy = sinon.spy(debug, 'log')

    log('multiaddr %a', ma)

    expect(debugSpy.firstCall.args[0], 'Multiaddr formatting not included').to.include(`multiaddr ${ma.toString()}`)
  })

  it('test ma formatter', () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/4001')

    expect(debug.formatters.a(ma)).to.equal(ma.toString())
  })

  it('test peerId formatter', () => {
    const peerId = peerIdFromString('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    expect(debug.formatters.p(peerId)).to.equal(peerId.toString())
  })

  it('test cid formatter', () => {
    const peerId = peerIdFromString('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')
    const cid = peerId.toCID()

    expect(debug.formatters.c(cid)).to.equal(cid.toString())
  })

  it('test base58 formatter', () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base58btc')

    expect(debug.formatters.b(buf)).to.equal(base58btc.baseEncode(buf))
  })

  it('test base32 formatter', () => {
    const buf = uint8ArrayFromString('jbswy3dpfqqho33snrscc===', 'base32')

    expect(debug.formatters.t(buf)).to.equal(base32.baseEncode(buf))
  })

  it('test base64 formatter', () => {
    const buf = uint8ArrayFromString('12D3KooWbtp1AcgweFSArD7dbKWYpAr8MZR1tofwNwLFLjeNGLWa', 'base64')

    expect(debug.formatters.m(buf)).to.equal(base64.baseEncode(buf))
  })

  it('test datastore key formatter', () => {
    const buf = uint8ArrayFromString('jbswy3dpfqqho33snrscc===', 'base32')

    const key = new Key('/' + unint8ArrayToString(buf, 'base32'), false)

    expect(debug.formatters.k(key)).to.equal(key.toString())
  })
})
