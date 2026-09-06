/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { plaintext } from '@libp2p/plaintext'
import { byteStream, echo } from '@libp2p/utils'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import { Circuit, WebRTC } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { createLibp2p } from 'libp2p'
import pWaitFor from 'p-wait-for'
import type { Identify } from '@libp2p/identify'
import type { Connection, Libp2p, Stream } from '@libp2p/interface'

const ECHO_PROTOCOL = '/test/webrtc-early-stream/1.0.0'
const STREAM_TIMEOUT = 5_000

/**
 * How long the recipient is held at the pre-muxer upgrade checkpoint (the
 * `denyInboundEncryptedConnection` gater runs before the muxer is created), to
 * deterministically widen the window in which the dialer's first stream arrives
 * before the recipient's muxer exists. Absent the early-channel buffer (see
 * `packages/transport-webrtc/src/muxer.ts`) those bytes would be dropped and
 * negotiation would stall; with it, the stream echoes within `STREAM_TIMEOUT`.
 */
const RECIPIENT_UPGRADE_DELAY = 500

describe('webrtc early stream race', () => {
  let initiator: Libp2p<{ identify: Identify }>
  let recipient: Libp2p<{ identify: Identify }>

  afterEach(async () => {
    await stop(initiator, recipient)
  })

  it('should support a stream opened as soon as the direct connection is available', async () => {
    ({ initiator, recipient } = await createPeers())

    const streamPromise = Promise.withResolvers<Stream>()

    // open a stream in the same event loop turn that publishes the direct
    // connection - the recipient's muxer does not exist yet, so the early bytes
    // must be buffered rather than dropped for this to succeed
    initiator.addEventListener('connection:open', (event) => {
      if (!WebRTC.exactMatch(event.detail.remoteAddr)) {
        return
      }

      void event.detail.newStream(ECHO_PROTOCOL, {
        signal: AbortSignal.timeout(STREAM_TIMEOUT)
      })
        .then(streamPromise.resolve, streamPromise.reject)
    })

    await connectViaWebRTC(initiator, recipient)
    await expectEcho(await streamPromise.promise)
  })

  it('control - should support a stream opened after the recipient has surfaced the connection', async () => {
    ({ initiator, recipient } = await createPeers())

    const streamPromise = Promise.withResolvers<Stream>()

    // same as above, except we wait until the recipient has upgraded the
    // connection - and so has created its muxer - before opening the stream.
    // the only difference to the test above is when `newStream` is called,
    // which brackets the race window
    initiator.addEventListener('connection:open', (event) => {
      if (!WebRTC.exactMatch(event.detail.remoteAddr)) {
        return
      }

      void Promise.resolve().then(async () => {
        await pWaitFor(() => recipient.getConnections(initiator.peerId).some(conn => WebRTC.exactMatch(conn.remoteAddr)), {
          timeout: STREAM_TIMEOUT
        })

        return event.detail.newStream(ECHO_PROTOCOL, {
          signal: AbortSignal.timeout(STREAM_TIMEOUT)
        })
      })
        .then(streamPromise.resolve, streamPromise.reject)
    })

    await connectViaWebRTC(initiator, recipient)
    await expectEcho(await streamPromise.promise)
  })
})

async function createPeers (): Promise<{
  initiator: Libp2p<{ identify: Identify }>
  recipient: Libp2p<{ identify: Identify }>
}> {
  const recipient = await createLibp2p({
    addresses: {
      listen: [
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`,
        '/webrtc'
      ]
    },
    transports: [
      circuitRelayTransport(),
      webSockets(),
      webRTC()
    ],
    streamMuxers: [
      yamux()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    connectionGater: {
      denyDialMultiaddr: () => false,
      // hold the incoming WebRTC connection at the pre-muxer upgrade
      // checkpoint - see RECIPIENT_UPGRADE_DELAY above
      denyInboundEncryptedConnection: async (peerId, maConn) => {
        if (WebRTC.exactMatch(maConn.remoteAddr)) {
          await delay(RECIPIENT_UPGRADE_DELAY)
        }

        return false
      }
    },
    services: {
      identify: identify({
        // keep the connection quiet so the only early stream is the test's
        runOnConnectionOpen: false
      })
    }
  })

  const initiator = await createLibp2p({
    transports: [
      circuitRelayTransport(),
      webSockets(),
      webRTC()
    ],
    streamMuxers: [
      yamux()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify({
        runOnConnectionOpen: false
      })
    }
  })

  await recipient.handle(ECHO_PROTOCOL, (stream) => {
    void echo(stream)
  })

  return {
    initiator,
    recipient
  }
}

async function connectViaWebRTC (
  initiator: Libp2p,
  recipient: Libp2p
): Promise<Connection> {
  const relayedAddress = recipient.getMultiaddrs().find(ma => Circuit.exactMatch(ma))
  const webRTCAddress = recipient.getMultiaddrs().find(ma => WebRTC.exactMatch(ma))

  if (relayedAddress == null || webRTCAddress == null) {
    throw new Error('Recipient did not have relay and WebRTC addresses')
  }

  // establish the relayed connection first, then upgrade to a direct WebRTC
  // connection - this mirrors how private-to-private WebRTC connections are
  // made in practice
  const relayedConnection = await initiator.dial(relayedAddress)
  expect(Circuit.exactMatch(relayedConnection.remoteAddr)).to.be.true()

  const connection = await initiator.dial(webRTCAddress)
  expect(connection).to.have.property('limits').that.is.not.ok()
  expect(WebRTC.exactMatch(connection.remoteAddr)).to.be.true()

  return connection
}

async function expectEcho (stream: Stream): Promise<void> {
  const payload = Uint8Array.from([0, 1, 2, 3])
  const bytes = byteStream(stream)
  const signal = AbortSignal.timeout(STREAM_TIMEOUT)

  await bytes.write(payload, { signal })
  const response = await bytes.read({
    bytes: payload.byteLength,
    signal
  })

  expect(response.subarray()).to.equalBytes(payload)
  await bytes.unwrap().close({ signal })
}
