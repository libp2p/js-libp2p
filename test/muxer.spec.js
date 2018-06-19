/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const EventEmitter = require('events')
const pair = require('pull-pair/duplex')

const Muxer = require('../src/muxer')

describe('multiplex-muxer', () => {
  let muxer
  let multiplex

  it('can be created', () => {
    const p = pair()
    multiplex = new EventEmitter()
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

  it('can get destroyed', (done) => {
    let destroyed = false
    multiplex.destroy = () => {
      destroyed = true
      setImmediate(() => multiplex.emit('close'))
    }

    muxer.end((err) => {
      expect(err).to.not.exist()
      expect(destroyed).to.be.true()
      done()
    })
  })
})
