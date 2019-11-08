/* eslint-env mocha */
'use strict'

const sinon = require('sinon')
const tests = require('libp2p-interfaces/src/transport/tests')
const multiaddr = require('multiaddr')
const Circuit = require('../../src/circuit')

describe.skip('interface-transport compliance', () => {
  tests({
    setup ({ upgrader }) {
      // TODO:
      // - Listening
      //  - Create a Relay listening on a TCP address
      //  - Create our listener and connect it to the relay

      const circuit = new Circuit({ upgrader })
      const addrs = [
        multiaddr('/ip4/127.0.0.1/tcp/9091'),
        multiaddr('/ip4/127.0.0.1/tcp/9092'),
        multiaddr('/ip4/127.0.0.1/tcp/9093')
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (delayMs) {
          console.log('Delay', delayMs)
          // const netConnect = net.connect
          // sinon.replace(net, 'connect', (opts) => {
          //   const socket = netConnect(opts)
          //   const socketEmit = socket.emit.bind(socket)
          //   sinon.replace(socket, 'emit', (...args) => {
          //     const time = args[0] === 'connect' ? delayMs : 0
          //     setTimeout(() => socketEmit(...args), time)
          //   })
          //   return socket
          // })
        },
        restore () {
          sinon.restore()
        }
      }

      return { transport: circuit, addrs, connector }
    }
  })
})