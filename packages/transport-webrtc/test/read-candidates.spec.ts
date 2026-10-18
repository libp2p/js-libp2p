import { ConnectionFailedError } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { pbStream, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { Message } from '../src/private-to-private/pb/message.ts'
import { readCandidatesUntilConnected } from '../src/private-to-private/util.ts'
import type { Stream } from '@libp2p/interface'

interface StubPeerConnection {
  connectionState: RTCPeerConnectionState
  onconnectionstatechange: ((evt: Event) => void) | null
}

function createPeerConnection (connectionState: RTCPeerConnectionState): StubPeerConnection {
  return {
    connectionState,
    onconnectionstatechange: null
  }
}

function setState (pc: StubPeerConnection, connectionState: RTCPeerConnectionState, ms: number): void {
  setTimeout(() => {
    pc.connectionState = connectionState
    pc.onconnectionstatechange?.(new Event('connectionstatechange'))
  }, ms)
}

async function readCandidates (pc: StubPeerConnection, stream: Stream, signal: AbortSignal = AbortSignal.timeout(1_000)): Promise<void> {
  await readCandidatesUntilConnected(pc as any, pbStream(stream).pb(Message), {
    direction: 'initiator',
    signal,
    log: defaultLogger().forComponent('test:webrtc')
  })
}

describe('readCandidatesUntilConnected', () => {
  let localStream: Stream
  let remoteStream: Stream

  beforeEach(async () => {
    [localStream, remoteStream] = await streamPair()
  })

  afterEach(() => {
    localStream.abort(new Error('test finished'))
    remoteStream.abort(new Error('test finished'))
  })

  it('should resolve when the peer connection connects', async () => {
    const pc = createPeerConnection('connecting')
    setState(pc, 'connected', 50)

    await expect(readCandidates(pc, localStream)).to.eventually.be.undefined()
  })

  it('should resolve when the signaling stream ends before the peer connection connects', async () => {
    const pc = createPeerConnection('connecting')
    await remoteStream.close()
    setState(pc, 'connected', 50)

    await expect(readCandidates(pc, localStream)).to.eventually.be.undefined()
    expect(pc.connectionState).to.equal('connected')
  })

  it('should ignore a transient disconnected state', async () => {
    const pc = createPeerConnection('connecting')
    setState(pc, 'disconnected', 30)
    setState(pc, 'connected', 60)

    await expect(readCandidates(pc, localStream)).to.eventually.be.undefined()
  })

  it('should reject when the peer connection fails', async () => {
    const pc = createPeerConnection('connecting')
    setState(pc, 'failed', 50)

    await expect(readCandidates(pc, localStream)).to.eventually.be.rejectedWith(ConnectionFailedError)
  })

  it('should reject when the peer connection closes', async () => {
    const pc = createPeerConnection('connecting')
    setState(pc, 'closed', 50)

    await expect(readCandidates(pc, localStream)).to.eventually.be.rejectedWith(ConnectionFailedError)
  })

  it('should reject when the peer connection has already failed', async () => {
    const pc = createPeerConnection('failed')

    await expect(readCandidates(pc, localStream)).to.eventually.be.rejectedWith(ConnectionFailedError)
  })

  it('should reject when the signaling stream ends and the peer connection fails', async () => {
    const pc = createPeerConnection('connecting')
    await remoteStream.close()
    setState(pc, 'failed', 50)

    await expect(readCandidates(pc, localStream)).to.eventually.be.rejected()
  })

  it('should reject with the abort reason when aborted while the peer connection is connecting', async () => {
    const pc = createPeerConnection('connecting')
    const controller = new AbortController()
    const reason = new Error('dial cancelled')
    setTimeout(() => { controller.abort(reason) }, 50)

    await expect(readCandidates(pc, localStream, controller.signal)).to.eventually.be.rejectedWith(reason)
  })

  it('should reject with the abort reason when aborted after the signaling stream ends', async () => {
    const pc = createPeerConnection('connecting')
    await remoteStream.close()
    const controller = new AbortController()
    const reason = new Error('dial cancelled')
    setTimeout(() => { controller.abort(reason) }, 50)

    await expect(readCandidates(pc, localStream, controller.signal)).to.eventually.be.rejectedWith(reason)
  })
})
