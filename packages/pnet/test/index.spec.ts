/* eslint-env mocha */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { mockMultiaddrConnPair } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pipe } from 'it-pipe'
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
    const { inbound, outbound } = mockMultiaddrConnPair({
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234'),
        multiaddr('/ip4/127.0.0.1/tcp/1235')
      ],
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    })
    const protector = preSharedKey({
      psk: swarmKeyBuffer
    })({
      logger: defaultLogger()
    })

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protector.protect(outbound)
    ])

    void pipe(
      async function * () {
        yield uint8ArrayFromString('hello world')
        yield uint8ArrayFromString('doo dah')
      },
      aToB
    )

    const output = await pipe(
      bToA,
      async function * (source) {
        for await (const chunk of source) {
          yield chunk.slice()
        }
      },
      async (source) => all(source)
    )

    expect(output).to.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should not be able to share correct data with different keys', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234'),
        multiaddr('/ip4/127.0.0.1/tcp/1235')
      ],
      remotePeer: peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    })
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

    void pipe(
      async function * () {
        yield uint8ArrayFromString('hello world')
        yield uint8ArrayFromString('doo dah')
      },
      aToB
    )

    const output = await pipe(
      bToA,
      async (source) => all(source)
    )

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
