/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const duplexPair = require('it-pair/duplex')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const Protector = require('../../src/pnet')
const Errors = Protector.errors
const generate = Protector.generate

const swarmKeyBuffer = new Uint8Array(95)
const wrongSwarmKeyBuffer = new Uint8Array(95)

// Write new psk files to the buffers
generate(swarmKeyBuffer)
generate(wrongSwarmKeyBuffer)

describe('private network', () => {
  it('should accept a valid psk buffer', () => {
    const protector = new Protector(swarmKeyBuffer)

    expect(protector.tag).to.equal('/key/swarm/psk/1.0.0/')
    expect(protector.psk.byteLength).to.equal(32)
  })

  it('should protect a simple connection', async () => {
    const [inbound, outbound] = duplexPair()
    const protector = new Protector(swarmKeyBuffer)

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protector.protect(outbound)
    ])

    pipe(
      [uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')],
      aToB
    )

    const output = await pipe(
      bToA,
      source => (async function * () {
        for await (const chunk of source) {
          yield chunk.slice()
        }
      })(),
      collect
    )

    expect(output).to.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should not be able to share correct data with different keys', async () => {
    const [inbound, outbound] = duplexPair()
    const protector = new Protector(swarmKeyBuffer)
    const protectorB = new Protector(wrongSwarmKeyBuffer)

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protectorB.protect(outbound)
    ])

    pipe(
      [uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')],
      aToB
    )

    const output = await pipe(
      bToA,
      collect
    )

    expect(output).to.not.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  describe('invalid psks', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return new Protector(uint8ArrayFromString('not-a-key'))
      }).to.throw(Errors.INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return new Protector(uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e'))
      }).to.throw(Errors.INVALID_PSK)
    })
  })
})
