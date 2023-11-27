import { logger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { duplexPair } from 'it-pair/duplex'
import type { MultiaddrConnection } from '@libp2p/interface/connection'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export function createMaConnPair (): [MultiaddrConnection, MultiaddrConnection] {
  const [local, remote] = duplexPair<Uint8Array | Uint8ArrayList>()

  function duplexToMaConn (duplex: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array | Uint8ArrayList>, Promise<void>>): MultiaddrConnection {
    const output: MultiaddrConnection = {
      ...duplex,
      close: async () => {},
      abort: () => {},
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
      timeline: {
        open: Date.now()
      },
      log: logger('duplex-maconn')
    }

    return output
  }

  return [duplexToMaConn(local), duplexToMaConn(remote)]
}
