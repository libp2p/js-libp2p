import { multiaddr } from '@multiformats/multiaddr'
import { mockRegistrar, mockUpgrader } from '@libp2p/interface-mocks'
import { pipe }from 'it-pipe'
import { EventEmitter } from '@libp2p/interfaces/events'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    async before () {
      const { webSockets } = await import('./dist/src/index.js')

      const protocol = '/echo/1.0.0'
      const registrar = mockRegistrar()
      registrar.handle(protocol, ({ stream }) => {
        void pipe(
          stream,
          stream
        )
      })
      const upgrader = mockUpgrader({
        registrar,
        events: new EventEmitter()
      })

      const ws = webSockets()()
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
      const listener = ws.createListener({
        upgrader
      })
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
  },
  build: {
    bundlesizeMax: '18kB'
  }
}
