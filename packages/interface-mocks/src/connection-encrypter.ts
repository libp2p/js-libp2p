import { UnexpectedPeerError } from '@libp2p/interface-connection-encrypter/errors'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { handshake } from 'it-handshake'
import map from 'it-map'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import type { ConnectionEncrypter } from '@libp2p/interface-connection-encrypter'
import type { Transform, Source } from 'it-stream-types'

// A basic transform that does nothing to the data
const transform = <T>(): Transform<Source<T>, AsyncGenerator<T>> => {
  return (source: Source<T>) => (async function * () {
    for await (const chunk of source) {
      yield chunk
    }
  })()
}

export function mockConnectionEncrypter (): ConnectionEncrypter {
  const encrypter: ConnectionEncrypter = {
    protocol: 'insecure',
    secureInbound: async (localPeer, duplex, expectedPeer) => {
      // 1. Perform a basic handshake.
      const shake = handshake<Uint8Array>(duplex)
      shake.write(localPeer.toBytes())
      const remoteId = await shake.read()

      if (remoteId == null) {
        throw new Error('Could not read remote ID')
      }

      const remotePeer = peerIdFromBytes(remoteId.slice())
      shake.rest()

      if (expectedPeer?.equals(remotePeer) === false) {
        throw new UnexpectedPeerError()
      }

      // 2. Create your encryption box/unbox wrapper
      const wrapper = duplexPair<Uint8Array>()
      const encrypt = transform<Uint8Array>() // Use transform iterables to modify data
      const decrypt = transform<Uint8Array>()

      void pipe(
        wrapper[0], // We write to wrapper
        encrypt, // The data is encrypted
        shake.stream, // It goes to the remote peer
        source => map(source, (list) => list.subarray()), // turn lists into arrays
        decrypt, // Decrypt the incoming data
        wrapper[0] // Pipe to the wrapper
      )

      return {
        conn: {
          ...wrapper[1],
          close: async () => { },
          localAddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
          remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
          timeline: {
            open: Date.now()
          },
          conn: true
        },
        remotePeer,
        remoteExtensions: {}
      }
    },
    secureOutbound: async (localPeer, duplex, remotePeer) => {
      // 1. Perform a basic handshake.
      const shake = handshake<Uint8Array>(duplex)
      shake.write(localPeer.toBytes())
      const remoteId = await shake.read()

      if (remoteId == null) {
        throw new Error('Could not read remote ID')
      }

      shake.rest()

      // 2. Create your encryption box/unbox wrapper
      const wrapper = duplexPair<Uint8Array>()
      const encrypt = transform<Uint8Array>()
      const decrypt = transform<Uint8Array>()

      void pipe(
        wrapper[0], // We write to wrapper
        encrypt, // The data is encrypted
        shake.stream, // It goes to the remote peer
        source => map(source, (list) => list.subarray()), // turn lists into arrays
        decrypt, // Decrypt the incoming data
        wrapper[0] // Pipe to the wrapper
      )

      return {
        conn: {
          ...wrapper[1],
          close: async () => { },
          localAddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
          remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
          timeline: {
            open: Date.now()
          },
          conn: true
        },
        remotePeer: peerIdFromBytes(remoteId.slice()),
        remoteExtensions: {}
      }
    }
  }

  return encrypter
}
