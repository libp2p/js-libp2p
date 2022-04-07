import { createLibp2p } from './dist/src/index.js'
import { MULTIADDRS_WEBSOCKETS } from './dist/test/fixtures/browser.js'
import Peers from './dist/test/fixtures/peers.js'
import { WebSockets } from '@libp2p/websockets'
import { Mplex } from '@libp2p/mplex'
import { NOISE } from '@chainsafe/libp2p-noise'
import { Plaintext } from './dist/src/insecure/index.js'
import { pipe } from 'it-pipe'
import { createFromJSON } from '@libp2p/peer-id-factory'

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '146kB'
  },
  test: {
    before: async () => {


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
          new Mplex()
        ],
        connectionEncryption: [
          NOISE,
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
