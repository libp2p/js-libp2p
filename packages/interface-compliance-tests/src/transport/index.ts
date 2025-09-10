import { stop, TimeoutError } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import { pushable } from 'it-pushable'
import { pEvent } from 'p-event'
import pRetry from 'p-retry'
import pWaitFor from 'p-wait-for'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { isValidTick } from '../is-valid-tick.js'
import { createPeer, getTransportManager, getUpgrader } from './utils.js'
import type { TestSetup } from '../index.js'
import type { Echo } from '@libp2p/echo'
import type { Connection, Libp2p, Stream, StreamHandler } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MultiaddrMatcher } from '@multiformats/multiaddr-matcher'
import type { Libp2pInit } from 'libp2p'

export interface TransportTestFixtures {
  /**
   * Addresses that will be used to dial listeners - both addresses must resolve
   * to the same node
   */
  dialAddrs?: [Multiaddr, Multiaddr]

  /**
   * Filter out any addresses that cannot be dialed by the transport
   */
  dialMultiaddrMatcher: MultiaddrMatcher

  /**
   * Filter out any addresses that cannot be listened on by the transport
   */
  listenMultiaddrMatcher: MultiaddrMatcher

  /**
   * Config that creates a libp2p node that can dial a listener
   */
  dialer: Libp2pInit

  /**
   * Config that creates a libp2p node that can accept dials
   */
  listener?: Libp2pInit
}

async function getSetup (common: TestSetup<TransportTestFixtures>): Promise<{ dialer: Libp2p<{ echo: Echo }>, listener?: Libp2p<{ echo: Echo }>, dialAddrs: Multiaddr[], dialMultiaddrMatcher: MultiaddrMatcher, listenMultiaddrMatcher: MultiaddrMatcher }> {
  const setup = await common.setup()
  const dialer = await createPeer({
    logger: prefixLogger('dialer'),
    ...setup.dialer
  })
  let listener

  if (setup.listener != null) {
    listener = await createPeer({
      logger: prefixLogger('listener'),
      ...setup.listener
    })
  }

  let dialAddrs = listener?.getMultiaddrs() ?? setup.dialAddrs

  if (dialAddrs == null) {
    throw new Error('Listener config or dial addresses must be specified')
  }

  dialAddrs = dialAddrs.filter(ma => setup.dialMultiaddrMatcher.exactMatch(ma))

  if (dialAddrs.length === 0) {
    throw new Error('Listener was not listening on any addresses that the dialMultiaddrMatcher matched')
  }

  return {
    dialer,
    listener,
    dialAddrs,
    dialMultiaddrMatcher: setup.dialMultiaddrMatcher,
    listenMultiaddrMatcher: setup.listenMultiaddrMatcher
  }
}

export default (common: TestSetup<TransportTestFixtures>): void => {
  describe('interface-transport', () => {
    let dialer: Libp2p<{ echo: Echo }>
    let listener: Libp2p<{ echo: Echo }> | undefined
    let dialAddrs: Multiaddr[]
    let dialMultiaddrMatcher: MultiaddrMatcher
    let listenMultiaddrMatcher: MultiaddrMatcher

    afterEach(async () => {
      await stop(dialer, listener)
      await common.teardown()
    })

    // eslint-disable-next-line no-only-tests/no-only-tests
    it('simple', async () => {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const input = Uint8Array.from([0, 1, 2, 3, 4])
      const output = await dialer.services.echo.echo(dialAddrs[0], input, {
        signal: AbortSignal.timeout(5000)
      })

      expect(output.subarray()).to.equalBytes(input)
    })

    it('should listen on multiple addresses', async () => {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const input = Uint8Array.from([0, 1, 2, 3, 4])

      const output1 = await dialer.services.echo.echo(dialAddrs[0], input, {
        signal: AbortSignal.timeout(5000)
      })
      expect(output1.subarray()).to.equalBytes(input)

      const output2 = await dialer.services.echo.echo(dialAddrs[1], input, {
        signal: AbortSignal.timeout(5000),
        force: true
      })
      expect(output2.subarray()).to.equalBytes(input)
    })

    it('can close connections', async () => {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const conn = await dialer.dial(dialAddrs[0], {
        signal: AbortSignal.timeout(5000)
      })

      await conn.close()
      expect(isValidTick(conn.timeline.close)).to.equal(true)
    })

    it('abort before dialing throws AbortError', async () => {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const controller = new AbortController()
      controller.abort()

      await expect(dialer.dial(dialAddrs[0], {
        signal: controller.signal
      })).to.eventually.be.rejected()
        .with.property('name', 'AbortError')
    })

    it('should close all streams when the connection closes', async () => {
      ({ dialer, listener, dialAddrs, listenMultiaddrMatcher } = await getSetup(common))

      let incomingConnectionPromise: PromiseWithResolvers<Connection> | undefined

      if (listener != null) {
        incomingConnectionPromise = Promise.withResolvers<Connection>()

        listener.addEventListener('connection:open', (event) => {
          const conn = event.detail

          if (!listenMultiaddrMatcher.matches(conn.remoteAddr)) {
            return
          }

          if (conn.remotePeer.equals(dialer.peerId)) {
            incomingConnectionPromise?.resolve(conn)
          }
        })
      }

      const connection = await dialer.dial(dialAddrs[0])
      let remoteConn: Connection | undefined

      if (incomingConnectionPromise != null) {
        remoteConn = await incomingConnectionPromise.promise
      }

      for (let i = 0; i < 5; i++) {
        await connection.newStream('/echo/1.0.0', {
          maxOutboundStreams: 5
        })
      }

      expect(connection).to.have.property('streams').that.has.lengthOf(5)

      if (remoteConn != null) {
        await pWaitFor(() => remoteConn.streams.length === 5, {
          timeout: 5000
        })
      }

      // Close the connection and verify all streams have been closed
      await Promise.all([
        pEvent(connection, 'close'),
        pEvent(remoteConn ?? connection, 'close'),
        connection.close()
      ])

      expect(connection).to.have.property('status', 'closed')
      expect(connection).to.have.property('streams').that.is.empty()

      if (remoteConn != null) {
        expect(remoteConn).to.have.property('status', 'closed')
        expect(remoteConn).to.have.property('streams').that.is.empty()
      }
    })

    it('should not handle connection if upgradeInbound rejects', async function () {
      ({ dialer, listener, dialAddrs, dialMultiaddrMatcher } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      const upgrader = getUpgrader(listener)
      upgrader.upgradeInbound = async () => {
        await delay(100)
        throw new Error('Oh noes!')
      }

      // transports with their own muxers/encryption will perform the upgrade
      // after the connection has been established (e.g. peer ids have been
      // exchanged) so perform the dial and wait for the remote to attempt the
      // upgrade - if it fails the listener should close the underlying
      // connection which should remove the it from the dialer's connection map
      await dialer.dial(dialAddrs[0]).catch(() => {})
      await delay(1000)

      expect(dialer.getConnections().filter(conn => {
        return dialMultiaddrMatcher.exactMatch(conn.remoteAddr)
      })).to.have.lengthOf(0)

      if (listener != null) {
        const remoteConnections = listener.getConnections(dialer.peerId)
          .filter(conn => dialMultiaddrMatcher.exactMatch(conn.remoteAddr))
        expect(remoteConnections).to.have.lengthOf(0)
      }
    })

    it('should omit peer id in listening addresses', async function () {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      const tm = getTransportManager(listener)
      const transportListeners = tm.getListeners()

      for (const transportListener of transportListeners) {
        for (const ma of transportListener.getAddrs()) {
          expect(ma.toString()).to.not.include(`/p2p/${listener.peerId}`)
        }
      }
    })

    it('should handle one small write', async function () {
      const timeout = 120_000
      this.timeout(timeout);
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const connection = await dialer.dial(dialAddrs[0])

      const input = new Uint8Array(1024).fill(5)
      const output = await dialer.services.echo.echo(connection.remotePeer, input, {
        signal: AbortSignal.timeout(timeout)
      })

      expect(output.subarray()).to.equalBytes(input)
      expect(connection.streams.filter(s => s.protocol === dialer.services.echo.protocol)).to.be.empty()
    })

    it('should handle one big write', async function () {
      const timeout = 540_000
      this.timeout(timeout);
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const connection = await dialer.dial(dialAddrs[0])

      const input = new Uint8Array(1024 * 1024 * 10).fill(5)
      const output = await dialer.services.echo.echo(connection.remotePeer, input, {
        signal: AbortSignal.timeout(timeout)
      })

      expect(output.subarray()).to.equalBytes(input)
      expect(connection.streams.filter(s => s.protocol === dialer.services.echo.protocol)).to.be.empty()
    })

    it('should handle many small writes', async function () {
      const timeout = 360_000
      this.timeout(timeout);
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      const connection = await dialer.dial(dialAddrs[0])
      const echoProtocol = dialer.services.echo.protocol

      for (let i = 0; i < 2000; i++) {
        const input = new Uint8Array(1024).fill(5)
        const output = await dialer.services.echo.echo(connection.remotePeer, input, {
          signal: AbortSignal.timeout(timeout)
        })

        expect(output.subarray()).to.equalBytes(input)
        expect(connection.streams.filter(s => s.protocol === echoProtocol)).to.be.empty()
      }
    })

    it('can close local stream while a remote stream is writing', async function () {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      // 1. remote stream close read
      // 2. local stream close write
      // 3. remote stream close write

      /**
       * NodeA             NodeB
       * |   <--- STOP_SENDING |
       * | FIN --->            |
       * |           <--- DATA |
       * |            <--- FIN |
       * | FIN_ACK --->        |
       * |        <--- FIN_ACK |
       */

      const getRemoteStream = Promise.withResolvers<Stream>()
      const protocol = '/close-local-while-remote-writes/1.0.0'

      const streamHandler: StreamHandler = (stream) => {
        getRemoteStream.resolve(stream)
      }

      await listener.handle(protocol, streamHandler, {
        runOnLimitedConnection: true
      })

      const connection = await dialer.dial(dialAddrs[0])

      const [
        localStream,
        remoteStream
      ] = await Promise.all([
        // open a stream on the echo protocol
        connection.newStream(protocol, {
          runOnLimitedConnection: true
        }),
        getRemoteStream.promise
      ])

      // ignore incoming data
      void drain(localStream)

      // close the remote readable end
      await remoteStream.closeRead()

      // send data from the remote to the local
      const remoteInputStream = pushable<Uint8Array>()
      Promise.resolve().then(async () => {
        for await (const buf of remoteInputStream) {
          const sendMore = remoteStream.send(buf)

          if (sendMore === false) {
            await pEvent(remoteStream, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        // close the remote writable end
        await remoteStream.close()
      })

      await Promise.all([
        // wait for remote to receive local FIN
        pEvent(remoteStream, 'remoteCloseWrite'),

        // wait to receive FIN_ACK
        localStream.close()
      ])

      // stop sending remote -> local
      remoteInputStream.end()

      // wait for remote to notice closure
      await pRetry(() => {
        if (remoteStream.status !== 'closed') {
          throw new Error('Remote stream not closed')
        }
      })

      // both ends should be closed
      assertStreamClosed(localStream)
      assertStreamClosed(remoteStream)
    })

    it('can close local stream for writing while a remote stream is reading', async function () {
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      /**
       * NodeA             NodeB
       * | DATA --->           |
       * | FIN --->            |
       * |            <--- FIN |
       * | FIN_ACK --->        |
       * |        <--- FIN_ACK |
       */

      const getRemoteStream = Promise.withResolvers<Stream>()
      const protocol = '/close-local-while-remote-reads/1.0.0'

      const streamHandler: StreamHandler = (stream) => {
        getRemoteStream.resolve(stream)
      }

      await listener.handle(protocol, streamHandler, {
        runOnLimitedConnection: true
      })

      const connection = await dialer.dial(dialAddrs[0])

      const [
        localStream,
        remoteStream
      ] = await Promise.all([
        // open a stream on the echo protocol
        connection.newStream(protocol, {
          runOnLimitedConnection: true
        }),
        getRemoteStream.promise
      ])

      // ignore incoming data
      void drain(remoteStream)

      // close the remote stream writable end when the local sends a FIN
      remoteStream.addEventListener('remoteCloseWrite', () => {
        remoteStream.close()
          .catch(err => {
            remoteStream.abort(err)
          })
      })

      // send data to the remote then close the stream
      const data = [
        Uint8Array.from([0, 1, 2, 3]),
        Uint8Array.from([4, 5, 6, 7]),
        Uint8Array.from([8, 9, 0, 1])
      ]

      const [
        remoteCloseEvent,
        localCloseEvent
      ] = await Promise.all([
        // wait for the remote to close
        pEvent(remoteStream, 'close'),
        pEvent(localStream, 'close'),
        (async () => {
          for (const buf of data) {
            if (!localStream.send(buf)) {
              await pEvent(localStream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }

          // close the local writable end
          await localStream.close()
        })()
      ])

      expect(remoteCloseEvent).to.not.have.property('error', 'remote stream did not close cleanly')
      expect(localCloseEvent).to.not.have.property('error', 'local stream did not close cleanly')

      // wait for remote to notice closure
      await pRetry(() => {
        if (remoteStream.status !== 'closed') {
          throw new Error('Remote stream not closed')
        }
      })

      // both ends should be closed
      assertStreamClosed(localStream)
      assertStreamClosed(remoteStream)
    })

    it('can close a stream for writing but receive a large amount of data', async function () {
      const timeout = 120_000
      this.timeout(timeout);
      ({ dialer, listener, dialAddrs } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      const protocol = '/receive-data/1.0.0'
      const chunkSize = 1024
      const bytes = chunkSize * 1024 * 10

      await listener.handle(protocol, async (stream) => {
        for (let i = 0; i < bytes; i += chunkSize) {
          const sendMore = stream.send(new Uint8Array(chunkSize))

          if (!sendMore) {
            await pEvent(stream, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        await stream.close()
      })

      const stream = await dialer.dialProtocol(dialAddrs[0], protocol)

      const [
        output
      ] = await Promise.all([
        all(stream),
        stream.close()
      ])

      expect(new Uint8ArrayList(...output).byteLength).to.equal(bytes)
    })
  })

  describe('transport events', () => {
    let dialer: Libp2p<{ echo: Echo }>
    let listener: Libp2p<{ echo: Echo }> | undefined
    let listenMultiaddrMatcher: MultiaddrMatcher

    afterEach(async () => {
      await stop(dialer, listener)
      await common.teardown()
    })

    it('emits listening', async function () {
      ({ dialer, listener, listenMultiaddrMatcher } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      await listener.stop()

      const transportListeningPromise = Promise.withResolvers<void>()

      listener.addEventListener('transport:listening', (event) => {
        const transportListener = event.detail

        if (transportListener.getAddrs().some(ma => listenMultiaddrMatcher.exactMatch(ma))) {
          transportListeningPromise.resolve()
        }
      })

      await listener.start()

      await raceSignal(transportListeningPromise.promise, AbortSignal.timeout(1000), {
        translateError: () => {
          return new TimeoutError('Did not emit listening event')
        }
      })
    })

    it('emits close', async function () {
      ({ dialer, listener } = await getSetup(common))

      if (listener == null) {
        return this.skip()
      }

      const transportManager = getTransportManager(listener)
      const transportListener = transportManager.getListeners()
        .filter(listener => listener.getAddrs().some(ma => listenMultiaddrMatcher.exactMatch(ma)))
        .pop()

      if (transportListener == null) {
        throw new Error('Could not find address listener')
      }

      const p = pEvent(transportListener, 'close')

      await listener.stop()

      await raceSignal(p, AbortSignal.timeout(1000), {
        translateError: () => {
          return new TimeoutError('Did not emit close event')
        }
      })
    })
  })
}

function assertStreamClosed (stream: Stream): void {
  expect(stream.status).to.equal('closed')
  expect(stream.readStatus).to.equal('closed')
  expect(stream.writeStatus).to.equal('closed')

  expect(stream.timeline.close).to.be.a('number')
}
