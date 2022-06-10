/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PreSharedKeyConnectionProtector, generateKey } from '../../src/pnet/index.js'
import { INVALID_PSK } from '../../src/pnet/errors.js'
import { mockMultiaddrConnPair } from '@libp2p/interface-compliance-tests/mocks'
import { Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

const swarmKeyBuffer = new Uint8Array(95)
const wrongSwarmKeyBuffer = new Uint8Array(95)

// Write new psk files to the buffers
generateKey(swarmKeyBuffer)
generateKey(wrongSwarmKeyBuffer)

describe('private network', () => {
  it('should accept a valid psk buffer', () => {
    const protector = new PreSharedKeyConnectionProtector({
      psk: swarmKeyBuffer
    })

    expect(protector.tag).to.equal('/key/swarm/psk/1.0.0/')
  })

  it('should protect a simple connection', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({
      addrs: [
        new Multiaddr('/ip4/127.0.0.1/tcp/1234'),
        new Multiaddr('/ip4/127.0.0.1/tcp/1235')
      ],
      remotePeer: await createEd25519PeerId()
    })
    const protector = new PreSharedKeyConnectionProtector({
      psk: swarmKeyBuffer
    })

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protector.protect(outbound)
    ])

    void pipe(
      [uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')],
      aToB
    )

    const output = await pipe(
      bToA,
      async function * (source) {
        for await (const chunk of source) {
          yield chunk.slice()
        }
      },
      async (source) => await all(source)
    )

    expect(output).to.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  it('should not be able to share correct data with different keys', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({
      addrs: [
        new Multiaddr('/ip4/127.0.0.1/tcp/1234'),
        new Multiaddr('/ip4/127.0.0.1/tcp/1235')
      ],
      remotePeer: await createEd25519PeerId()
    })
    const protector = new PreSharedKeyConnectionProtector({
      psk: swarmKeyBuffer
    })
    const protectorB = new PreSharedKeyConnectionProtector({
      enabled: true,
      psk: wrongSwarmKeyBuffer
    })

    const [aToB, bToA] = await Promise.all([
      protector.protect(inbound),
      protectorB.protect(outbound)
    ])

    void pipe(
      [uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')],
      aToB
    )

    const output = await pipe(
      bToA,
      async (source) => await all(source)
    )

    expect(output).to.not.eql([uint8ArrayFromString('hello world'), uint8ArrayFromString('doo dah')])
  })

  describe('invalid psks', () => {
    it('should not accept a bad psk', () => {
      expect(() => {
        return new PreSharedKeyConnectionProtector({
          psk: uint8ArrayFromString('not-a-key')
        })
      }).to.throw(INVALID_PSK)
    })

    it('should not accept a psk of incorrect length', () => {
      expect(() => {
        return new PreSharedKeyConnectionProtector({
          psk: uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\ndffb7e')
        })
      }).to.throw(INVALID_PSK)
    })
  })
})
