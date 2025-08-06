/* eslint-env mocha */
import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { raceEvent } from 'race-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { INVALID_PSK } from '../src/errors.js'
import { preSharedKey, generateKey } from '../src/index.js'

const swarmKeyBuffer = new Uint8Array(95)
const wrongSwarmKeyBuffer = new Uint8Array(95)

// Write new psk files to the buffers
generateKey(swarmKeyBuffer)
generateKey(wrongSwarmKeyBuffer)

describe('private network', () => {
  it('should accept a valid psk buffer', () => {
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })({
      logger: defaultLogger()
    })

    expect(protector).to.have.property('tag', '/key/swarm/psk/1.0.0/')
  })

  it('should protect a simple connection', async () => {
    const [inbound, outbound] = multiaddrConnectionPair()

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })({
      logger: defaultLogger()
    })

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protector.protect(outbound)
    ])

    const output: Uint8Array[] = []

    bToA.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    aToB.send(uint8ArrayFromString('hello world'))
    aToB.send(uint8ArrayFromString('doo dah'))
    await aToB.close()

    await raceEvent(bToA, 'close')

    expect(output).to.deep.equal([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should not be able to share correct data with different keys', async () => {
    const [inbound, outbound] = multiaddrConnectionPair()
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })({
      logger: defaultLogger()
    })
    const protectorB = preSharedKey({
      psk: wrongSwarmKeyBuffer
    })({
      logger: defaultLogger()
    })

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protectorB.protect(outbound)
    ])

    aToB.send(uint8ArrayFromString('hello world'))
    aToB.send(uint8ArrayFromString('doo dah'))

    const output: Uint8Array[] = []

    bToA.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    aToB.send(uint8ArrayFromString('hello world'))
    aToB.send(uint8ArrayFromString('doo dah'))

    await Promise.all([
      aToB.close(),
      bToA.close()
    ])

    expect(output).to.not.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  describe('invalid pre-shared keys', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('not-a-key')
        })({
          logger: defaultLogger()
        })
      }).to.throw(INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e')
        })({
          logger: defaultLogger()
        })
      }).to.throw(INVALID_PSK)
    })
  })
})
