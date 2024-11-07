import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.js'
import type { Connection, Transport, Upgrader } from '@libp2p/interface'

describe('valid localAddr and remoteAddr', () => {
  let transport: Transport
  let upgrader: Upgrader

  beforeEach(() => {
    transport = tcp()({
      logger: defaultLogger()
    })
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      },
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })
  })

  const ma = multiaddr('/ip4/127.0.0.1/tcp/0')

  it('should resolve port 0', async () => {
    // Create a listener
    const listener = transport.createListener({
      upgrader
    })

    // Listen on the multi-address
    await listener.listen(ma)

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    const p = pEvent(listener, 'connection')

    // Dial to that address
    await transport.dial(localAddrs[0], {
      upgrader
    })

    // Wait for the incoming dial to be handled
    await p

    // Close the listener
    await listener.close()
  })

  it('should handle multiple simultaneous closes', async () => {
    // Create a listener
    const listener = transport.createListener({
      upgrader
    })

    // Create a Promise that resolves when a connection is handled
    const p = pEvent(listener, 'connection')

    // Listen on the multi-address
    await listener.listen(ma)

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // Dial to that address
    const dialerConn = await transport.dial(localAddrs[0], {
      upgrader
    })

    // Wait for the incoming dial to be handled
    await p

    // Close the dialer with two simultaneous calls to `close`
    await Promise.race([
      new Promise((resolve, reject) => setTimeout(() => { reject(new Error('Timed out waiting for connection close')) }, 500)),
      await Promise.all([
        dialerConn.close(),
        dialerConn.close()
      ])
    ])

    await listener.close()
  })
})
