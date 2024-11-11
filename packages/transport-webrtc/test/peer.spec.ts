import { generateKeyPair } from '@libp2p/crypto/keys'
import { streamPair } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger, logger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { detect } from 'detect-browser'
import { duplexPair } from 'it-pair/duplex'
import { pbStream } from 'it-protobuf-stream'
import pRetry from 'p-retry'
import Sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { initiateConnection } from '../src/private-to-private/initiate-connection.js'
import { Message } from '../src/private-to-private/pb/message.js'
import { handleIncomingStream } from '../src/private-to-private/signaling-stream-handler.js'
import { SIGNALING_PROTO_ID, WebRTCTransport, splitAddr } from '../src/private-to-private/transport.js'
import { RTCPeerConnection, RTCSessionDescription } from '../src/webrtc/index.js'
import type { Logger, Connection, Stream, ComponentLogger, Upgrader } from '@libp2p/interface'
import type { ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'

const browser = detect()

interface Initiator {
  multiaddr: Multiaddr
  connectionManager: StubbedInstance<ConnectionManager>
  transportManager: StubbedInstance<TransportManager>
  connection: StubbedInstance<Connection>
  stream: Stream
  log: Logger
  logger: ComponentLogger
}

interface Recipient {
  peerConnection: RTCPeerConnection
  connection: StubbedInstance<Connection>
  abortController: AbortController
  signal: AbortSignal
  stream: Stream
  log: Logger
}

interface PrivateToPrivateComponents {
  initiator: Initiator
  recipient: Recipient
}

async function getComponents (): Promise<PrivateToPrivateComponents> {
  const relayPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  const initiatorPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  const receiverPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  const receiverMultiaddr = multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${relayPeerId}/p2p-circuit/webrtc/p2p/${receiverPeerId}`)
  const [initiatorToReceiver, receiverToInitiator] = duplexPair<any>()
  const [initiatorStream, receiverStream] = streamPair({
    duplex: initiatorToReceiver,
    init: {
      protocol: SIGNALING_PROTO_ID
    }
  }, {
    duplex: receiverToInitiator,
    init: {
      protocol: SIGNALING_PROTO_ID
    }
  })

  const recipientAbortController = new AbortController()

  return {
    initiator: {
      multiaddr: receiverMultiaddr,
      connectionManager: stubInterface<ConnectionManager>(),
      transportManager: stubInterface<TransportManager>(),
      connection: stubInterface<Connection>(),
      stream: initiatorStream,
      log: logger('test'),
      logger: defaultLogger()
    },
    recipient: {
      peerConnection: new RTCPeerConnection(),
      connection: stubInterface<Connection>({
        remoteAddr: multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${relayPeerId}/p2p-circuit/p2p/${initiatorPeerId}`)
      }),
      abortController: recipientAbortController,
      signal: recipientAbortController.signal,
      stream: receiverStream,
      log: logger('test')
    }
  }
}

describe('webrtc basic', () => {
  const isFirefox = ((browser != null) && browser.name === 'firefox')
  let initiator: Initiator
  let recipient: Recipient
  let initiatorPeerConnection: RTCPeerConnection

  afterEach(() => {
    initiatorPeerConnection?.close()
    recipient?.peerConnection?.close()
  })

  it('should connect', async () => {
    ({ initiator, recipient } = await getComponents())

    // no existing connection
    initiator.connectionManager.getConnections.returns([])

    // transport manager dials recipient
    initiator.transportManager.dial.resolves(initiator.connection)

    // signaling stream opens successfully
    initiator.connection.newStream.withArgs(SIGNALING_PROTO_ID).resolves(initiator.stream)

    ;[{ peerConnection: initiatorPeerConnection }] = await expect(
      Promise.all([
        initiateConnection(initiator),
        handleIncomingStream(recipient)
      ])
    ).to.eventually.be.fulfilled()

    await pRetry(async () => {
      if (isFirefox) {
        expect(initiatorPeerConnection.iceConnectionState).eq('connected')
        expect(recipient.peerConnection.iceConnectionState).eq('connected')
        return
      }
      expect(initiatorPeerConnection.connectionState).eq('connected')
      expect(recipient.peerConnection.connectionState).eq('connected')
    })
  })

  it('should survive aborting during connection', async () => {
    ({ initiator, recipient } = await getComponents())
    const abortController = new AbortController()

    // no existing connection
    initiator.connectionManager.getConnections.returns([])

    // transport manager dials recipient
    initiator.transportManager.dial.resolves(initiator.connection)

    initiator.connection.newStream.callsFake(async () => {
      // the operation is aborted
      abortController.abort(new Error('Oh noes!'))
      // opening the stream takes some time
      await delay(100)
      // signaling stream opens successfully
      return initiator.stream
    })

    await expect(Promise.all([
      initiateConnection({
        ...initiator,
        signal: abortController.signal
      }),
      handleIncomingStream(recipient)
    ]))
      .to.eventually.be.rejected.with.property('message', 'Oh noes!')
  })
})

describe('webrtc receiver', () => {
  let initiator: Initiator
  let recipient: Recipient
  let initiatorPeerConnection: RTCPeerConnection

  afterEach(() => {
    initiatorPeerConnection?.close()
    recipient?.peerConnection?.close()
  })

  it('should fail receiving on invalid sdp offer', async () => {
    ({ initiator, recipient } = await getComponents())
    const receiverPeerConnectionPromise = handleIncomingStream(recipient)
    const stream = pbStream(initiator.stream).pb(Message)

    await stream.write({ type: Message.Type.SDP_OFFER, data: 'bad' })
    await expect(receiverPeerConnectionPromise).to.be.rejectedWith(/Failed to set remoteDescription/)
  })
})

describe('webrtc dialer', () => {
  let initiator: Initiator
  let recipient: Recipient
  let initiatorPeerConnection: RTCPeerConnection

  afterEach(() => {
    initiatorPeerConnection?.close()
    recipient?.peerConnection?.close()
  })

  it('should fail receiving on invalid sdp answer', async () => {
    ({ initiator, recipient } = await getComponents())

    // existing connection already exists
    initiator.connectionManager.getConnections.returns([
      initiator.connection
    ])

    // signaling stream opens successfully
    initiator.connection.newStream.withArgs(SIGNALING_PROTO_ID).resolves(initiator.stream)

    const initiatorPeerConnectionPromise = initiateConnection(initiator)
    const stream = pbStream(recipient.stream).pb(Message)

    const offerMessage = await stream.read()
    expect(offerMessage.type).to.eq(Message.Type.SDP_OFFER)

    await stream.write({ type: Message.Type.SDP_ANSWER, data: 'bad' })
    await expect(initiatorPeerConnectionPromise).to.be.rejectedWith(/Failed to set remoteDescription/)
  })

  it('should fail on receiving a candidate before an answer', async () => {
    ({ initiator, recipient } = await getComponents())

    // existing connection already exists
    initiator.connectionManager.getConnections.returns([
      initiator.connection
    ])

    // signaling stream opens successfully
    initiator.connection.newStream.withArgs(SIGNALING_PROTO_ID).resolves(initiator.stream)

    const initiatorPeerConnectionPromise = initiateConnection(initiator)

    const stream = pbStream(recipient.stream).pb(Message)

    const pc = new RTCPeerConnection()
    pc.onicecandidate = ({ candidate }) => {
      void stream.write({ type: Message.Type.ICE_CANDIDATE, data: JSON.stringify(candidate?.toJSON()) })
    }

    const offerMessage = await stream.read()
    expect(offerMessage.type).to.eq(Message.Type.SDP_OFFER)
    const offer = new RTCSessionDescription({ type: 'offer', sdp: offerMessage.data })
    await pc.setRemoteDescription(offer)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await expect(initiatorPeerConnectionPromise).to.be.rejectedWith(/Remote should send an SDP answer/)

    pc.close()
  })
})

describe('webrtc filter', () => {
  it('can filter multiaddrs to dial', async () => {
    const transport = new WebRTCTransport({
      transportManager: stubInterface<TransportManager>(),
      connectionManager: stubInterface<ConnectionManager>(),
      peerId: Sinon.stub() as any,
      registrar: stubInterface<Registrar>(),
      upgrader: stubInterface<Upgrader>(),
      logger: defaultLogger()
    })

    const valid = [
      multiaddr('/ip4/127.0.0.1/tcp/1234/ws/p2p/12D3KooWFqpHsdZaL4NW6eVE3yjhoSDNv7HJehPZqj17kjKntAh2/p2p-circuit/webrtc/p2p/12D3KooWF2P1k8SVRL1cV1Z9aNM8EVRwbrMESyRf58ceQkaht4AF')
    ]

    expect(transport.dialFilter(valid)).length(1)
  })
})

describe('webrtc splitAddr', () => {
  it('can split a ws relay addr', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/49173/ws/p2p/12D3KooWFqpHsdZaL4NW6eVE3yjhoSDNv7HJehPZqj17kjKntAh2/p2p-circuit/webrtc/p2p/12D3KooWF2P1k8SVRL1cV1Z9aNM8EVRwbrMESyRf58ceQkaht4AF')

    const { baseAddr, peerId } = splitAddr(ma)

    expect(baseAddr.toString()).to.eq('/ip4/127.0.0.1/tcp/49173/ws/p2p/12D3KooWFqpHsdZaL4NW6eVE3yjhoSDNv7HJehPZqj17kjKntAh2/p2p-circuit/p2p/12D3KooWF2P1k8SVRL1cV1Z9aNM8EVRwbrMESyRf58ceQkaht4AF')
    expect(peerId.toString()).to.eq('12D3KooWF2P1k8SVRL1cV1Z9aNM8EVRwbrMESyRf58ceQkaht4AF')
  })

  it('can split a webrtc-direct relay addr', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/udp/9090/webrtc-direct/certhash/uEiBUr89tH2P9paTCPn-AcfVZcgvIvkwns96t4h55IpxFtA/p2p/12D3KooWB64sJqc3T3VCaubQCrfCvvfummrAA9z1vEXHJT77ZNJh/p2p-circuit/webrtc/p2p/12D3KooWFNBgv86tcpcYUHQz9FWGTrTmpMgr8feZwQXQySVTo3A7')

    const { baseAddr, peerId } = splitAddr(ma)

    expect(baseAddr.toString()).to.eq('/ip4/127.0.0.1/udp/9090/webrtc-direct/certhash/uEiBUr89tH2P9paTCPn-AcfVZcgvIvkwns96t4h55IpxFtA/p2p/12D3KooWB64sJqc3T3VCaubQCrfCvvfummrAA9z1vEXHJT77ZNJh/p2p-circuit/p2p/12D3KooWFNBgv86tcpcYUHQz9FWGTrTmpMgr8feZwQXQySVTo3A7')
    expect(peerId.toString()).to.eq('12D3KooWFNBgv86tcpcYUHQz9FWGTrTmpMgr8feZwQXQySVTo3A7')
  })
})
