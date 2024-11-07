import { echo } from '@libp2p/echo'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import { raceSignal } from 'race-signal'
import { isValidTick } from '../is-valid-tick.js'
import { createPeer, getTransportManager, getUpgrader, slowNetwork } from './utils.js'
import type { TestSetup } from '../index.js'
import type { Echo } from '@libp2p/echo'
import type { Connection, Libp2p, Stream, Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface TransportTestFixtures {
  /**
   * Addresses that will be used to dial listeners from `listenAddrs`
   */
  dialAddrs: [Multiaddr, Multiaddr]

  /**
   * Addresses that will be used to create listeners to dial
   */
  listenAddrs?: [Multiaddr, Multiaddr]

  /**
   * Only run the dial portion of the tests, do not try to create listeners
   */
  dialOnly?: boolean

  transport(components: any): Transport
}

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('interface-transport', () => {
    let dialAddrs: Multiaddr[]
    let listenAddrs: Multiaddr[]
    let transport: (components: any) => Transport
    let dialer: Libp2p<{ echo: Echo }>
    let listener: Libp2p<{ echo: Echo }> | undefined
    let dialOnly: boolean

    beforeEach(async () => {
      ({ dialAddrs, listenAddrs = dialAddrs, transport, dialOnly = false } = await common.setup())
    })

    afterEach(async () => {
      await stop(dialer, listener)
      await common.teardown()
    })

    it('simple', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const input = Uint8Array.from([0, 1, 2, 3, 4])
      const output = await dialer.services.echo.echo(dialAddrs[0], input, {
        signal: AbortSignal.timeout(5000)
      })

      expect(output).to.equalBytes(input)
    })

    it('should listen on multiple addresses', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [
              listenAddrs[0].toString(),
              listenAddrs[1].toString()
            ]
          },
          transports: [
            transport
          ]
        })
      }

      const input = Uint8Array.from([0, 1, 2, 3, 4])

      await expect(dialer.services.echo.echo(dialAddrs[0], input, {
        signal: AbortSignal.timeout(5000)
      })).to.eventually.deep.equal(input)

      await expect(dialer.services.echo.echo(dialAddrs[1], input, {
        signal: AbortSignal.timeout(5000)
      })).to.eventually.deep.equal(input)
    })

    it('can close connections', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const conn = await dialer.dial(dialAddrs[0], {
        signal: AbortSignal.timeout(5000)
      })

      await conn.close()
      expect(isValidTick(conn.timeline.close)).to.equal(true)
    })

    it('abort before dialing throws AbortError', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const controller = new AbortController()
      controller.abort()

      await expect(dialer.dial(dialAddrs[0], {
        signal: controller.signal
      })).to.eventually.be.rejected()
        .with.property('name', 'AbortError')
    })

    it('abort while dialing throws AbortError', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }
      slowNetwork(dialer, 100)

      const controller = new AbortController()
      setTimeout(() => { controller.abort() }, 50)

      await expect(dialer.dial(dialAddrs[0], {
        signal: controller.signal
      })).to.eventually.be.rejected()
        .with.property('name', 'AbortError')
    })

    it('should close all streams when the connection closes', async () => {
      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ],
          services: {
            echo: echo({
              maxInboundStreams: 5
            })
          }
        })
      }

      const connection = await dialer.dial(listenAddrs[0])
      let remoteConn: Connection | undefined

      if (listener != null) {
        const remoteConnections = listener.getConnections(dialer.peerId)
        expect(remoteConnections).to.have.lengthOf(1)
        remoteConn = remoteConnections[0]
      }

      const streams: Stream[] = []

      for (let i = 0; i < 5; i++) {
        streams.push(await connection.newStream('/echo/1.0.0', {
          maxOutboundStreams: 5
        }))
      }

      // Close the connection and verify all streams have been closed
      await connection.close()
      await pWaitFor(() => connection.streams.length === 0)

      if (remoteConn != null) {
        await pWaitFor(() => remoteConn.streams.length === 0)
      }

      expect(streams.find(stream => stream.status !== 'closed')).to.be.undefined()
    })

    it('should not handle connection if upgradeInbound rejects', async function () {
      if (dialOnly) {
        return this.skip()
      }

      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const upgrader = getUpgrader(listener)
      upgrader.upgradeInbound = async () => {
        await delay(100)
        throw new Error('Oh noes!')
      }

      await expect(dialer.dial(listenAddrs[0])).to.eventually.be.rejected
        .with.property('name', 'EncryptionFailedError')

      expect(dialer.getConnections()).to.have.lengthOf(0)

      if (listener != null) {
        expect(listener.getConnections()).to.have.lengthOf(0)
      }
    })
  })

  describe('events', () => {
    let listenAddrs: Multiaddr[]
    let dialAddrs: Multiaddr[]
    let transport: (components: any) => Transport
    let dialer: Libp2p<{ echo: Echo }>
    let listener: Libp2p<{ echo: Echo }> | undefined
    let dialOnly: boolean

    beforeEach(async () => {
      ({ dialAddrs, listenAddrs = dialAddrs, transport, dialOnly = false } = await common.setup())
    })

    afterEach(async () => {
      await stop(dialer, listener)
      await common.teardown()
    })

    it('emits connection', async function () {
      if (dialOnly) {
        return this.skip()
      }

      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const transportManager = getTransportManager(listener)
      const transportListener = transportManager.getListeners()[0]

      const p = pEvent(transportListener, 'connection')

      await expect(dialer.dial(dialAddrs[0])).to.eventually.be.ok()

      await raceSignal(p, AbortSignal.timeout(1000), {
        errorMessage: 'Did not emit connection event'
      })
    })

    it('emits listening', async function () {
      if (dialOnly) {
        return this.skip()
      }

      dialer = await createPeer({
        transports: [
          transport
        ]
      })

      if (!dialOnly) {
        listener = await createPeer({
          addresses: {
            listen: [listenAddrs[0].toString()]
          },
          transports: [
            transport
          ]
        })
      }

      const transportManager = getTransportManager(listener)
      const t = transportManager.dialTransportForMultiaddr(dialAddrs[0])

      if (t == null) {
        throw new Error(`No transport configured for dial address ${dialAddrs[0]}`)
      }

      let p: Promise<unknown> | undefined
      const originalCreateListener = t.createListener.bind(t)

      t.createListener = (opts) => {
        const listener = originalCreateListener(opts)
        p = pEvent(listener, 'listening')

        return listener
      }

      await transportManager.listen([
        listenAddrs[1]
      ])

      if (p == null) {
        throw new Error('Listener was not created')
      }

      await raceSignal(p, AbortSignal.timeout(1000), {
        errorMessage: 'Did not emit connection event'
      })
    })

    it('emits close', async function () {
      if (dialOnly) {
        return this.skip()
      }

      dialer = await createPeer({
        transports: [
          transport
        ]
      })
      listener = await createPeer({
        addresses: {
          listen: [listenAddrs[0].toString()]
        },
        transports: [
          transport
        ]
      })

      const transportManager = getTransportManager(listener)
      const transportListener = transportManager.getListeners()[0]

      const p = pEvent(transportListener, 'close')

      await listener.stop()

      await raceSignal(p, AbortSignal.timeout(1000), {
        errorMessage: 'Did not emit close event'
      })
    })
  })
}
