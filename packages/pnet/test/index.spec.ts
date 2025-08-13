/* eslint-env mocha */

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
    })()

    expect(protector).to.have.property('tag', '/key/swarm/psk/1.0.0/')
  })

  it('should protect a simple connection', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })

    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protector.protect(inboundConnection)
    ])

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    await Promise.all([
      raceEvent(inbound, 'remoteCloseWrite'),
      outbound.closeWrite()
    ])

    expect(output).to.deep.equal([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should not be able to share correct data with different keys', async () => {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
      delay: 10
    })
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })()
    const protectorB = preSharedKey({
      psk: wrongSwarmKeyBuffer
    })()

    const [outbound, inbound] = await Promise.all([
      protector.protect(outboundConnection),
      protectorB.protect(inboundConnection)
    ])

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    const output: Uint8Array[] = []

    inbound.addEventListener('message', (evt) => {
      output.push(evt.data.subarray())
    })

    outbound.send(uint8ArrayFromString('hello world'))
    outbound.send(uint8ArrayFromString('doo dah'))

    await Promise.all([
      outbound.closeWrite(),
      inbound.closeWrite()
    ])

    expect(output).to.not.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  describe('invalid pre-shared keys', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('not-a-key')
        })()
      }).to.throw(INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return preSharedKey({
          psk: uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e')
        })()
      }).to.throw(INVALID_PSK)
    })
  })
})
