'use strict'

/** @type {import('aegir').PartialOptions} */
module.exports = {
  test: {
    async before () {
      const { Multiaddr } = await import('@multiformats/multiaddr')
      const { mockUpgrader } = await import('@libp2p/interface-compliance-tests/transport/utils')
      const { WebSockets } = await import('./dist/src/index.js')
      const { pipe } = await import('it-pipe')

      const ws = new WebSockets({ upgrader: mockUpgrader() })
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
      const listener = ws.createListener(conn => pipe(conn, conn))
      await listener.listen(ma)
      listener.addEventListener('error', (evt) => {
        console.error(evt.detail)
      })

      return {
        listener
      }
    },
    async after (_, before) {
      await before.listener.close()
    }
  }
}
