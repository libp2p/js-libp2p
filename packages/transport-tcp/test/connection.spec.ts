import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.js'
import type { Connection, Transport, Upgrader } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('valid localAddr and remoteAddr', () => {
  let transport: Transport
  let upgrader: StubbedInstance<Upgrader>

  beforeEach(() => {
    transport = tcp()({
      logger: defaultLogger()
    })
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
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

    // Dial to that address
    await transport.dial(localAddrs[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })

    // Wait for the incoming dial to be handled
    await pWaitFor(() => {
      return upgrader.upgradeInbound.callCount === 1
    })

    // Close the listener
    await listener.close()
  })

  it('should handle multiple simultaneous closes', async () => {
    // Create a listener
    const listener = transport.createListener({
      upgrader
    })

    // Listen on the multi-address
    await listener.listen(ma)

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // Dial to that address
    const dialerConn = await transport.dial(localAddrs[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })

    // Wait for the incoming dial to be handled
    await pWaitFor(() => {
      return upgrader.upgradeInbound.callCount === 1
    })

    // Close the dialer with two simultaneous calls to `close`
    await Promise.race([
      new Promise((resolve, reject) => setTimeout(() => { reject(new Error('Timed out waiting for connection close')) }, 500)),
      Promise.all([
        dialerConn.close(),
        dialerConn.close()
      ])
    ])

    await listener.close()
  })
})
