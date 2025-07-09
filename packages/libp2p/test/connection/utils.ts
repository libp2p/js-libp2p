import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { encode } from 'it-length-prefixed'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Registrar } from '../../src/registrar.ts'
import type { ConnectionComponents, ConnectionInit } from '../../src/connection.js'
import type { PeerStore, PeerId, StreamMuxerFactory, MultiaddrConnection, StreamMuxer, Stream } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export const ECHO_PROTOCOL = '/echo/0.0.1'

const registrar = stubInterface<Registrar>({
  getProtocols: () => [
    ECHO_PROTOCOL
  ],
  getHandler: (proto) => {
    expect(proto).to.equal(ECHO_PROTOCOL)

    return {
      handler: ({ stream }) => {
        void pipe(stream, stream)
      },
      options: {

      }
    }
  }
})

export function defaultConnectionComponents (): ConnectionComponents {
  return {
    peerStore: stubInterface<PeerStore>(),
    registrar
  }
}

interface DefaultConnectionInit {
  remotePeer?: PeerId
  remoteAddr?: Multiaddr
}

export async function defaultConnectionInit (init: DefaultConnectionInit = {}): Promise<ConnectionInit> {
  const remotePeer = init.remotePeer ?? peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  const log = defaultLogger().forComponent('connection')
  const streams: Stream[] = []

  return {
    remotePeer,
    maConn: stubInterface<MultiaddrConnection>({
      log,
      remoteAddr: multiaddr('/ip4/123.123.123.123/tcp/1234'),
      sink: async (source) => {
        await drain(source)
      },
      source: (async function * () {})()
    }),
    direction: 'outbound',
    encryption: '/secio/1.0.0',
    muxerFactory: stubInterface<StreamMuxerFactory>({
      createStreamMuxer: () => stubInterface<StreamMuxer>({
        sink: async (source) => {
          await drain(source)
        },
        source: (async function * () {})(),
        streams,
        newStream: () => {
          const stream = stubInterface<Stream>({
            log,
            sink: async (source) => {
              await drain(source)
            },
            source: map((async function * () {
              yield '/multistream/1.0.0\n'
              yield `${ECHO_PROTOCOL}\n`
              yield 'hello'
            })(), str => encode.single(uint8ArrayFromString(str))),
            close: async () => {
              for (let i = 0; i < streams.length; i++) {
                if (streams[i] === stream) {
                  streams.splice(i, 1)
                  i--
                }
              }
            }
          })

          streams.push(stream)

          return stream
        }
      })
    })
  }
}
