/* eslint-env mocha */

import http from 'http'
import tests from '@libp2p/interface-compliance-tests/transport'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import * as filters from '../src/filters.js'
import { webSockets } from '../src/index.js'
import type { WebSocketListenerInit } from '../src/listener.js'
import type { Listener } from '@libp2p/interface'

describe('interface-transport compliance', () => {
  tests({
    async setup () {
      const ws = webSockets({ filter: filters.all })({
        logger: defaultLogger()
      })
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9096/ws'),
        multiaddr('/ip4/127.0.0.1/tcp/9097/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9097/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9097/wss')
      ]

      let delayMs = 0
      const delayedCreateListener = (options: WebSocketListenerInit): Listener => {
        // A server that will delay the upgrade event by delayMs
        options.server = new Proxy(http.createServer(), {
          get (server, prop) {
            if (prop === 'on') {
              return (event: string, handler: (...args: any[]) => void) => {
                server.on(event, (...args) => {
                  if (event !== 'upgrade' || delayMs === 0) {
                    handler(...args); return
                  }
                  setTimeout(() => { handler(...args) }, delayMs)
                })
              }
            }
            // @ts-expect-error cannot access props with a string
            return server[prop]
          }
        })

        return ws.createListener(options)
      }

      const wsProxy = new Proxy(ws, {
        // @ts-expect-error cannot access props with a string
        get: (_, prop) => prop === 'createListener' ? delayedCreateListener : ws[prop]
      })

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (ms: number) { delayMs = ms },
        restore () { delayMs = 0 }
      }

      return { transport: wsProxy, listenAddrs: addrs, dialAddrs: addrs, connector }
    },
    async teardown () {}
  })
})
