import { generateKeyPair } from '@libp2p/crypto/keys'
import tests from '@libp2p/interface-compliance-tests/transport'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { connections } from '../src/connections.js'
import { memory } from '../src/index.js'
import type { MemoryTransportListener } from '../src/listener.js'
import type { Listener } from '@libp2p/interface'

describe('transport compliance tests', () => {
  tests({
    async setup () {
      const privateKey = await generateKeyPair('Ed25519')

      const transport = memory()({
        logger: defaultLogger(),
        peerId: peerIdFromPrivateKey(privateKey)
      })
      const addrs = [
        multiaddr('/memory/addr-1'),
        multiaddr('/memory/addr-2'),
        multiaddr('/memory/addr-3'),
        multiaddr('/memory/addr-4')
      ]

      let delayMs = 0
      const delayedCreateListener = (options: any): Listener => {
        const listener = transport.createListener(options) as unknown as MemoryTransportListener

        const onConnection = listener.onConnection.bind(listener)

        listener.onConnection = (maConn: any) => {
          setTimeout(() => {
            onConnection(maConn)
          }, delayMs)
        }

        return listener
      }

      const transportProxy = new Proxy(transport, {
        // @ts-expect-error cannot access props with a string
        get: (_, prop) => prop === 'createListener' ? delayedCreateListener : transport[prop]
      })

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (ms: number) {
          delayMs = ms
          connections.get('/memory/addr-1')?.setLatency(ms)
          connections.get('/memory/addr-2')?.setLatency(ms)
          connections.get('/memory/addr-3')?.setLatency(ms)
          connections.get('/memory/addr-4')?.setLatency(ms)
        },
        restore () {
          delayMs = 0
          connections.get('/memory/addr-1')?.setLatency(0)
          connections.get('/memory/addr-2')?.setLatency(0)
          connections.get('/memory/addr-3')?.setLatency(0)
          connections.get('/memory/addr-4')?.setLatency(0)
        }
      }

      return { dialer: transportProxy, listener: transportProxy, listenAddrs: addrs, dialAddrs: addrs, connector }
    },
    async teardown () {}
  })
})
