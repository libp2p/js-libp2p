import sinon from 'sinon'
import tests from '@libp2p/interface-transport-compliance-tests'
import { multiaddr } from '@multiformats/multiaddr'
import net from 'net'
import { tcp } from '../src/index.js'

describe('interface-transport compliance', () => {
  tests({
    async setup () {
      const transport = tcp()()
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091'),
        multiaddr('/ip4/127.0.0.1/tcp/9092'),
        multiaddr('/ip4/127.0.0.1/tcp/9093'),
        multiaddr('/ip6/::/tcp/9094')
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (delayMs: number) {
          const netConnect = net.connect
          sinon.replace(net, 'connect', (opts: any) => {
            const socket = netConnect(opts)
            const socketEmit = socket.emit.bind(socket)
            sinon.replace(socket, 'emit', (...args: [string]) => {
              const time = args[0] === 'connect' ? delayMs : 0
              setTimeout(() => socketEmit(...args), time)
              return true
            })
            return socket
          })
        },
        restore () {
          sinon.restore()
        }
      }

      return { transport, addrs, connector }
    },
    async teardown () {}
  })
})
