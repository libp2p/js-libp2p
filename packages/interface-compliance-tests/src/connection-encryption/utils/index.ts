import { multiaddr } from '@multiformats/multiaddr'
import { duplexPair } from 'it-pair/duplex'
import type { MultiaddrConnection } from '@libp2p/interface/connection'
import type { Duplex, Source } from 'it-stream-types'

export function createMaConnPair (): [MultiaddrConnection, MultiaddrConnection] {
  const [local, remote] = duplexPair<Uint8Array>()

  function duplexToMaConn (duplex: Duplex<AsyncGenerator<Uint8Array>, Source<Uint8Array>, Promise<void>>): MultiaddrConnection {
    const output: MultiaddrConnection = {
      ...duplex,
      close: async () => {},
      abort: () => {},
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
      timeline: {
        open: Date.now()
      }
    }

    return output
  }

  return [duplexToMaConn(local), duplexToMaConn(remote)]
}
