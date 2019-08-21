/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
const expect = chai.expect
const parallel = require('async/parallel')
const PeerId = require('peer-id')
const Connection = require('interface-connection').Connection
const pair = require('pull-pair/duplex')
const pull = require('pull-stream')

const Protector = require('../../src/pnet')
const Errors = Protector.errors
const generate = Protector.generate

const swarmKeyBuffer = Buffer.alloc(95)
const wrongSwarmKeyBuffer = Buffer.alloc(95)

// Write new psk files to the buffers
generate(swarmKeyBuffer)
generate(wrongSwarmKeyBuffer)

describe('private network', () => {
  before((done) => {
    parallel([
      (cb) => PeerId.createFromJSON(require('./fixtures/peer-a'), cb),
      (cb) => PeerId.createFromJSON(require('./fixtures/peer-b'), cb)
    ], (err) => {
      expect(err).to.not.exist()
      done()
    })
  })

  it('should accept a valid psk buffer', () => {
    const protector = new Protector(swarmKeyBuffer)

    expect(protector.tag).to.equal('/key/swarm/psk/1.0.0/')
    expect(protector.psk.byteLength).to.equal(32)
  })

  it('should protect a simple connection', (done) => {
    const p = pair()
    const protector = new Protector(swarmKeyBuffer)

    const aToB = protector.protect(new Connection(p[0]), (err) => {
      expect(err).to.not.exist()
    })
    const bToA = protector.protect(new Connection(p[1]), (err) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values([Buffer.from('hello world'), Buffer.from('doo dah')]),
      aToB
    )

    pull(
      bToA,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist()
        expect(chunks).to.eql([Buffer.from('hello world'), Buffer.from('doo dah')])
        done()
      })
    )
  })

  it('should not connect to a peer with a different key', (done) => {
    const p = pair()
    const protector = new Protector(swarmKeyBuffer)
    const protectorB = new Protector(wrongSwarmKeyBuffer)

    const aToB = protector.protect(new Connection(p[0]), () => { })
    const bToA = protectorB.protect(new Connection(p[1]), () => { })

    pull(
      pull.values([Buffer.from('hello world'), Buffer.from('doo dah')]),
      aToB
    )

    pull(
      bToA,
      pull.collect((values) => {
        expect(values).to.equal(null)
        done()
      })
    )
  })

  describe('invalid psks', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return new Protector(Buffer.from('not-a-key'))
      }).to.throw(Errors.INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return new Protector(Buffer.from('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e'))
      }).to.throw(Errors.INVALID_PSK)
    })
  })
})
