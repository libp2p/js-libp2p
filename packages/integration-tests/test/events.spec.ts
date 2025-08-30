import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import { createPeers } from './fixtures/create-peers.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p } from 'libp2p'

describe('events', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('should emit connection events', async () => {
    ({ dialer, listener } = await createPeers({
      logger: prefixLogger('dialer')
    }, {
      logger: prefixLogger('listener')
    }))

    const localConnectionOpenEventReceived = Promise.withResolvers<void>()
    const localConnectionCloseEventReceived = Promise.withResolvers<void>()
    const localPeerConnectEventReceived = Promise.withResolvers<void>()
    const localPeerDisconnectEventReceived = Promise.withResolvers<void>()
    const remoteConnectionOpenEventReceived = Promise.withResolvers<void>()
    const remoteConnectionCloseEventReceived = Promise.withResolvers<void>()
    const remotePeerConnectEventReceived = Promise.withResolvers<void>()
    const remotePeerDisconnectEventReceived = Promise.withResolvers<void>()

    dialer.addEventListener('connection:open', (event) => {
      expect(event.detail.remotePeer.equals(listener.peerId)).to.be.true()
      localConnectionOpenEventReceived.resolve()
    })
    dialer.addEventListener('connection:close', (event) => {
      expect(event.detail.remotePeer.equals(listener.peerId)).to.be.true()
      localConnectionCloseEventReceived.resolve()
    })
    dialer.addEventListener('peer:connect', (event) => {
      expect(event.detail.equals(listener.peerId)).to.be.true()
      localPeerConnectEventReceived.resolve()
    })
    dialer.addEventListener('peer:disconnect', (event) => {
      expect(event.detail.equals(listener.peerId)).to.be.true()
      localPeerDisconnectEventReceived.resolve()
    })

    listener.addEventListener('connection:open', (event) => {
      expect(event.detail.remotePeer.equals(dialer.peerId)).to.be.true()
      remoteConnectionOpenEventReceived.resolve()
    })
    listener.addEventListener('connection:close', (event) => {
      expect(event.detail.remotePeer.equals(dialer.peerId)).to.be.true()
      remoteConnectionCloseEventReceived.resolve()
    })
    listener.addEventListener('peer:connect', (event) => {
      expect(event.detail.equals(dialer.peerId)).to.be.true()
      remotePeerConnectEventReceived.resolve()
    })
    listener.addEventListener('peer:disconnect', (event) => {
      expect(event.detail.equals(dialer.peerId)).to.be.true()
      remotePeerDisconnectEventReceived.resolve()
    })

    await dialer.dial(listener.getMultiaddrs())

    // Verify onConnection is called with the connection
    const connections = await Promise.all([
      ...dialer.getConnections(listener.peerId),
      ...listener.getConnections(dialer.peerId)
    ])
    expect(connections).to.have.lengthOf(2)

    await Promise.all([
      localConnectionOpenEventReceived.promise,
      localPeerConnectEventReceived.promise,
      remoteConnectionOpenEventReceived.promise,
      remotePeerConnectEventReceived.promise
    ])

    // Verify onConnectionEnd is called with the connection
    await Promise.all(connections.map(async conn => { await conn.close() }))

    await Promise.all([
      localConnectionCloseEventReceived.promise,
      localPeerDisconnectEventReceived.promise,
      remoteConnectionCloseEventReceived.promise,
      remotePeerDisconnectEventReceived.promise
    ])
  })

  it('should run identify automatically after connecting', async () => {
    ({ dialer, listener } = await createPeers({
      logger: prefixLogger('dialer'),
      services: {
        identify: identify()
      }
    }, {
      logger: prefixLogger('listener'),
      services: {
        identify: identify()
      }
    }))

    await Promise.all([
      pEvent(listener, 'peer:identify'),
      pEvent(dialer, 'peer:identify'),
      dialer.dial(listener.getMultiaddrs())
    ])
  })

  it('should not run identify automatically after connecting when configured not to', async () => {
    ({ dialer, listener } = await createPeers({
      services: {
        identify: identify({
          runOnConnectionOpen: false
        })
      }
    }, {
      services: {
        identify: identify({
          runOnConnectionOpen: false
        })
      }
    }))

    await Promise.all([
      await Promise.any([
        pEvent(listener, 'peer:identify').then(() => {
          throw new Error('Listener should not have run identify')
        }),
        pEvent(dialer, 'peer:identify').then(() => {
          throw new Error('Dialer should not have run identify')
        }),
        delay(1000)
      ]),
      dialer.dial(listener.getMultiaddrs())
    ])
  })
})
