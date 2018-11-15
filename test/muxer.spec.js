/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const pair = require('pull-pair/duplex')

const Muxer = require('../src/muxer')
const Multiplex = require('../src/internals')

describe('multiplex-muxer', () => {
  let muxer
  let multiplex

  it('can be created', () => {
    const p = pair()
    multiplex = new Multiplex()
    muxer = new Muxer(p, multiplex)
  })

  it('catches newStream errors', (done) => {
    multiplex.createStream = () => {
      throw new Error('something nbad happened')
    }
    muxer.newStream((err) => {
      expect(err).to.exist()
      expect(err.message).to.equal('something nbad happened')
      done()
    })
  })

  it('can be destroyed with an error', (done) => {
    const p = pair()
    const multiplex = new Multiplex()
    const muxer = new Muxer(p, multiplex)
    const error = new Error('bad things')
    muxer.once('error', (err) => {
      expect(err).to.eql(error)
      done()
    })
    muxer.end(error)
  })

  it('destroying with error does not throw with no listener', () => {
    const p = pair()
    const multiplex = new Multiplex()
    const muxer = new Muxer(p, multiplex)
    const error = new Error('bad things')
    expect(() => muxer.end(error)).to.not.throw()
  })

  it('can get destroyed', (done) => {
    expect(multiplex.destroyed).to.eql(false)

    muxer.end((err) => {
      expect(err).to.not.exist()
      expect(multiplex.destroyed).to.be.true()
      done()
    })
  })

  it('should handle a repeat destroy', (done) => {
    expect(multiplex.destroyed).to.be.true()

    muxer.end((err) => {
      expect(err).to.not.exist()
      expect(multiplex.destroyed).to.be.true()
      done()
    })
  })
})
