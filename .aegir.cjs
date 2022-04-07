'use strict'

/** @type {import('aegir').PartialOptions} */
module.exports = {
  build: {
    bundlesizeMax: '253kB'
  },
  test: {
    before: async () => {
      const { createLibp2p } = await import('./dist/src/index.js')
      const { MULTIADDRS_WEBSOCKETS } = await import('./dist/test/fixtures/browser.js')
      const { default: Peers } = await import('./dist/test/fixtures/peers.js')
      const { WebSockets } = await import('@libp2p/websockets')
      const { Mplex } = await import('@libp2p/mplex')
      const { NOISE } = await import('@chainsafe/libp2p-noise')
      const { Plaintext } = await import('./dist/src/insecure/index.js')
      const { pipe } = await import('it-pipe')
      const { createFromJSON } = await import('@libp2p/peer-id-factory')

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
