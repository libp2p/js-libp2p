'use strict'

/** @type {import('aegir').PartialOptions} */
module.exports = {
  test: {
    async before () {
      const { Multiaddr } = await import('@multiformats/multiaddr')
      const { mockRegistrar, mockUpgrader } = await import('@libp2p/interface-compliance-tests/mocks')
      const { WebSockets } = await import('./dist/src/index.js')
      const { pipe } = await import('it-pipe')

      const protocol = '/echo/1.0.0'
      const registrar = mockRegistrar()
      registrar.handle(protocol, (evt) => {
        void pipe(
          evt.detail.stream,
          evt.detail.stream
        )
      })
      const upgrader = mockUpgrader({
        registrar
      })

      const ws = new WebSockets({ upgrader })
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
      const listener = ws.createListener()
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
