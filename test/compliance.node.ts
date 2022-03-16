/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { Multiaddr } from '@multiformats/multiaddr'
import http from 'http'
import { WebSockets } from '../src/index.js'
import * as filters from '../src/filters.js'
import type { WebSocketListenerInit } from '../src/listener.js'

describe('interface-transport compliance', () => {
  tests({
    async setup () {
      const ws = new WebSockets({ filter: filters.all })
      const addrs = [
        new Multiaddr('/ip4/127.0.0.1/tcp/9091/ws'),
        new Multiaddr('/ip4/127.0.0.1/tcp/9092/ws'),
        new Multiaddr('/dns4/ipfs.io/tcp/9092/ws'),
        new Multiaddr('/dns4/ipfs.io/tcp/9092/wss')
      ]

      let delayMs = 0
      const delayedCreateListener = (options: WebSocketListenerInit) => {
        // A server that will delay the upgrade event by delayMs
        options.server = new Proxy(http.createServer(), {
          get (server, prop) {
            if (prop === 'on') {
              return (event: string, handler: (...args: any[]) => void) => {
                server.on(event, (...args) => {
                  if (event !== 'upgrade' || delayMs === 0) {
                    return handler(...args)
                  }
                  setTimeout(() => handler(...args), delayMs)
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

      return { transport: wsProxy, addrs, connector }
    },
    async teardown () {}
  })
})
