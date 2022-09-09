import { WebSockets } from '@libp2p/websockets'
import { Mplex } from '@libp2p/mplex'
import { Yamux } from '@chainsafe/libp2p-yamux'
import { Noise } from '@chainsafe/libp2p-noise'
import { pipe } from 'it-pipe'
import { createFromJSON } from '@libp2p/peer-id-factory'

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '147kB'
  },
  test: {
    before: async () => {
      // use dynamic import because we only want to reference these files during the test run, e.g. after building
      const { createLibp2p } = await import('./dist/src/index.js')
      const { MULTIADDRS_WEBSOCKETS } = await import('./dist/test/fixtures/browser.js')
      const { Plaintext } = await import('./dist/src/insecure/index.js')
      const { default: Peers } = await import('./dist/test/fixtures/peers.js')

      // Use the last peer
      const peerId = await createFromJSON(Peers[Peers.length - 1])
      const libp2p = await createLibp2p({
        addresses: {
          listen: [MULTIADDRS_WEBSOCKETS[0]]
        },
        peerId,
        transports: [
          new WebSockets()
        ],
        streamMuxers: [
          new Yamux(),
          new Mplex()
        ],
        connectionEncryption: [
          new Noise(),
          new Plaintext()
        ],
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: false
          }
        },
        nat: {
          enabled: false
        }
      })
      // Add the echo protocol
      await libp2p.handle('/echo/1.0.0', ({ stream }) => {
        pipe(stream, stream)
          .catch() // sometimes connections are closed before multistream-select finishes which causes an error
      })
      await libp2p.start()

      return {
        libp2p
      }
    },
    after: async (_, before) => {
      await before.libp2p.stop()
    }
  }
}
