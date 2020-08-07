/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const TCP = require('../src')
const multiaddr = require('multiaddr')

describe('valid localAddr and remoteAddr', () => {
  let tcp

  const mockUpgrader = {
    upgradeInbound: maConn => maConn,
    upgradeOutbound: maConn => maConn
  }

  beforeEach(() => {
    tcp = new TCP({ upgrader: mockUpgrader })
  })

  const ma = multiaddr('/ip4/127.0.0.1/tcp/0')

  it('should resolve port 0', async () => {
    // Create a Promise that resolves when a connection is handled
    let handled
    const handlerPromise = new Promise(resolve => { handled = resolve })

    const handler = conn => handled(conn)

    // Create a listener with the handler
    const listener = tcp.createListener(handler)

    // Listen on the multi-address
    await listener.listen(ma)

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // Dial to that address
    const dialerConn = await tcp.dial(localAddrs[0])

    // Wait for the incoming dial to be handled
    const listenerConn = await handlerPromise

    // Close the listener
    await listener.close()

    expect(dialerConn.localAddr.toString())
      .to.equal(listenerConn.remoteAddr.toString())

    expect(dialerConn.remoteAddr.toString())
      .to.equal(listenerConn.localAddr.toString())
  })
})
