/* eslint-env mocha */
'use strict'

const tests = require('interface-transport')
const multiaddr = require('multiaddr')
const http = require('http')
const WS = require('../src')

describe('interface-transport compliance', () => {
  tests({
    async setup ({ upgrader }) { // eslint-disable-line require-await
      const ws = new WS({ upgrader })
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091/ws'),
        multiaddr('/ip4/127.0.0.1/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/ws'),
        multiaddr('/dns4/ipfs.io/tcp/9092/wss')
      ]

      let delayMs = 0
      const delayedCreateListener = (options, handler) => {
        if (typeof options === 'function') {
          handler = options
          options = {}
        }

        options = options || {}

        // A server that will delay the upgrade event by delayMs
        options.server = new Proxy(http.createServer(), {
          get (server, prop) {
            if (prop === 'on') {
              return (event, handler) => {
                server.on(event, (...args) => {
                  if (event !== 'upgrade' || !delayMs) {
                    return handler(...args)
                  }
                  setTimeout(() => handler(...args), delayMs)
                })
              }
            }
            return server[prop]
          }
        })

        return ws.createListener(options, handler)
      }

      const wsProxy = new Proxy(ws, {
        get: (_, prop) => prop === 'createListener' ? delayedCreateListener : ws[prop]
      })

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (ms) { delayMs = ms },
        restore () { delayMs = 0 }
      }

      return { transport: wsProxy, addrs, connector }
    },
    async teardown () {}
  })
})
