import { mockConnection, mockMultiaddrConnection, mockRegistrar, mockStream, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { detect } from 'detect-browser'
import { pair } from 'it-pair'
import { duplexPair } from 'it-pair/duplex'
import { pbStream } from 'it-protobuf-stream'
import Sinon from 'sinon'
import { initiateConnection, handleIncomingStream } from '../src/private-to-private/handler.js'
import { Message } from '../src/private-to-private/pb/message.js'
import { WebRTCTransport, splitAddr } from '../src/private-to-private/transport.js'
import { RTCPeerConnection, RTCSessionDescription } from '../src/webrtc/index.js'

const browser = detect()

describe('webrtc basic', () => {
  const isFirefox = ((browser != null) && browser.name === 'firefox')

  it('should connect', async () => {
    const [receiver, initiator] = duplexPair<any>()
    const dstPeerId = await createEd25519PeerId()
    const connection = mockConnection(
      mockMultiaddrConnection(pair<any>(), dstPeerId)
    )
    const controller = new AbortController()
    const initiatorPeerConnectionPromise = initiateConnection({ stream: mockStream(initiator), signal: controller.signal })
    const receiverPeerConnectionPromise = handleIncomingStream({ stream: mockStream(receiver), connection })
    await expect(initiatorPeerConnectionPromise).to.be.fulfilled()
    await expect(receiverPeerConnectionPromise).to.be.fulfilled()
    const [{ pc: pc0 }, { pc: pc1 }] = await Promise.all([initiatorPeerConnectionPromise, receiverPeerConnectionPromise])
    if (isFirefox) {
      expect(pc0.iceConnectionState).eq('connected')
      expect(pc1.iceConnectionState).eq('connected')
      return
    }
    expect(pc0.connectionState).eq('connected')
    expect(pc1.connectionState).eq('connected')

    pc0.close()
    pc1.close()
  })
})

describe('webrtc receiver', () => {
  it('should fail receiving on invalid sdp offer', async () => {
    const [receiver, initiator] = duplexPair<any>()
    const dstPeerId = await createEd25519PeerId()
    const connection = mockConnection(
      mockMultiaddrConnection(pair<any>(), dstPeerId)
    )
    const receiverPeerConnectionPromise = handleIncomingStream({ stream: mockStream(receiver), connection })
    const stream = pbStream(initiator).pb(Message)

    await stream.write({ type: Message.Type.SDP_OFFER, data: 'bad' })
    await expect(receiverPeerConnectionPromise).to.be.rejectedWith(/Failed to set remoteDescription/)
  })
})

describe('webrtc dialer', () => {
  it('should fail receiving on invalid sdp answer', async () => {
    const [receiver, initiator] = duplexPair<any>()
    const controller = new AbortController()
    const initiatorPeerConnectionPromise = initiateConnection({ signal: controller.signal, stream: mockStream(initiator) })
    const stream = pbStream(receiver).pb(Message)

    const offerMessage = await stream.read()
    expect(offerMessage.type).to.eq(Message.Type.SDP_OFFER)

    await stream.write({ type: Message.Type.SDP_ANSWER, data: 'bad' })
    await expect(initiatorPeerConnectionPromise).to.be.rejectedWith(/Failed to set remoteDescription/)
  })

  it('should fail on receiving a candidate before an answer', async () => {
    const [receiver, initiator] = duplexPair<any>()
    const controller = new AbortController()
    const initiatorPeerConnectionPromise = initiateConnection({ signal: controller.signal, stream: mockStream(initiator) })
    const stream = pbStream(receiver).pb(Message)

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

    await expect(initiatorPeerConnectionPromise).to.be.rejectedWith(/remote should send an SDP answer/)

    pc.close()
  })
})

describe('webrtc filter', () => {
  it('can filter multiaddrs to dial', async () => {
    const transport = new WebRTCTransport({
      transportManager: Sinon.stub() as any,
      peerId: Sinon.stub() as any,
      registrar: mockRegistrar(),
      upgrader: mockUpgrader({})
    }, {})

    const valid = [
      multiaddr('/ip4/127.0.0.1/tcp/1234/ws/p2p-circuit/webrtc')
    ]

    expect(transport.filter(valid)).length(1)
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
