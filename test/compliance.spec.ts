import sinon from 'sinon'
import tests from '@libp2p/interface-compliance-tests/transport'
import { Multiaddr } from '@multiformats/multiaddr'
import net from 'net'
import { TCP } from '../src/index.js'

describe('interface-transport compliance', () => {
  tests({
    async setup (args) {
      if (args == null) {
        throw new Error('No args')
      }

      const { upgrader } = args

      const tcp = new TCP({ upgrader })
      const addrs = [
        new Multiaddr('/ip4/127.0.0.1/tcp/9091'),
        new Multiaddr('/ip4/127.0.0.1/tcp/9092'),
        new Multiaddr('/ip4/127.0.0.1/tcp/9093')
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

      return { transport: tcp, addrs, connector }
    },
    async teardown () {}
  })
})
