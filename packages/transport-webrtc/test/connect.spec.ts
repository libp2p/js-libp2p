import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DataChannelMuxerFactory } from '../src/muxer.ts'
import { connect } from '../src/private-to-public/utils/connect.ts'
import { genUfrag } from '../src/util.ts'
import type { ClientOptions } from '../src/private-to-public/utils/connect.ts'
import type { Upgrader } from '@libp2p/interface'

const RUNTIME_UFRAG = 'aBcD'
const RUNTIME_PWD = 'runtimeGeneratedPassword'

interface FakePeerConnectionInit {
  /**
   * What the runtime does with a munged offer: apply it, reject it in
   * setLocalDescription, or accept the call but keep its own credentials
   */
  munging?: 'allowed' | 'rejected' | 'ignored'
  pwd?: string
}

function offerSdp (pwd: string): string {
  return `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=ice-ufrag:${RUNTIME_UFRAG}\r\na=ice-pwd:${pwd}\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=sctp-port:5000\r\n`
}

/**
 * Enough of an RTCPeerConnection to create and set descriptions and to open a
 * handshake data channel that never connects, so connect() blocks until the
 * test aborts it
 */
function fakePeerConnection (init: FakePeerConnectionInit = {}): any {
  const munging = init.munging ?? 'allowed'
  const original = offerSdp(init.pwd ?? RUNTIME_PWD)
  const pc: any = new EventTarget()
  pc.connectionState = 'new'
  pc.localDescription = null
  pc.createOffer = async () => ({ type: 'offer', sdp: original })
  pc.setLocalDescription = Sinon.stub().callsFake(async (desc: RTCSessionDescriptionInit) => {
    const munged = desc.sdp !== original

    if (munged && munging === 'rejected') {
      throw new Error('The ICE ufrag and pwd cannot be modified')
    }

    pc.localDescription = { type: 'offer', sdp: munged && munging === 'ignored' ? original : desc.sdp }
  })
  pc.setRemoteDescription = Sinon.stub().resolves()
  pc.createDataChannel = () => Object.assign(new EventTarget(), { readyState: 'connecting', close: () => {} })
  pc.close = () => {}

  return pc
}

async function clientOptions (overrides: Partial<ClientOptions> = {}): Promise<ClientOptions> {
  const privateKey = await generateKeyPair('Ed25519')

  return {
    role: 'client',
    version: 1,
    log: defaultLogger().forComponent('test'),
    logger: defaultLogger(),
    remoteAddr: multiaddr('/ip4/127.0.0.1/udp/1234/webrtc-direct/certhash/uEiC5P6FL6EZzCG9zUT4nnVa3KWdMSriNIe-_5roWN7psKg'),
    upgrader: stubInterface<Upgrader>(),
    peerId: peerIdFromPrivateKey(privateKey),
    privateKey,
    signal: AbortSignal.timeout(100),
    ...overrides
  }
}

/**
 * Run the client side of connect() until it fails, returning the error
 */
async function dial (pc: any, ufrag: string, options: ClientOptions): Promise<any> {
  const muxerFactory = new DataChannelMuxerFactory({ peerConnection: pc })

  return connect(pc, muxerFactory, ufrag, options).then(
    () => { throw new Error('connect should not have completed') },
    (err: unknown) => err
  )
}

function remoteAnswerSdp (pc: any): string {
  expect(pc.setRemoteDescription.calledOnce).to.be.true()

  return pc.setRemoteDescription.firstCall.args[0].sdp
}

function expectV1 (pc: any, ufrag: string): void {
  expect(pc.localDescription.sdp).to.include(`a=ice-ufrag:${ufrag}\r\n`)
  expect(pc.localDescription.sdp).to.include(`a=ice-pwd:${ufrag}\r\n`)
  expect(remoteAnswerSdp(pc)).to.include(`a=ice-ufrag:${ufrag}\n`)
}

function expectV2 (pc: any): void {
  expect(pc.localDescription.sdp).to.include(`a=ice-ufrag:${RUNTIME_UFRAG}\r\n`)
  expect(pc.localDescription.sdp).to.include(`a=ice-pwd:${RUNTIME_PWD}\r\n`)
  expect(remoteAnswerSdp(pc)).to.include(`a=ice-ufrag:libp2p+webrtc+v2/${RUNTIME_PWD}\n`)
  expect(remoteAnswerSdp(pc)).to.include(`a=ice-pwd:libp2p+webrtc+v2/${RUNTIME_PWD}\n`)
}

describe('webrtc-direct client offer', () => {
  describe('with no dialer version configured', () => {
    it('dials v1 when the runtime applies the munged credentials', async () => {
      const pc = fakePeerConnection({ munging: 'allowed' })
      const ufrag = genUfrag()

      const err = await dial(pc, ufrag, await clientOptions({ version: 1, fallback: true }))

      expect(err).to.not.have.property('name', 'WebRTCTransportError')
      expect(pc.setLocalDescription.calledOnce).to.be.true()
      expectV1(pc, ufrag)
    })

    it('continues as v2 when the runtime rejects the munged offer', async () => {
      const pc = fakePeerConnection({ munging: 'rejected' })

      const err = await dial(pc, genUfrag(), await clientOptions({ version: 1, fallback: true }))

      expect(err).to.not.have.property('name', 'WebRTCTransportError')
      // the munged offer was rejected so the original one was set instead
      expect(pc.setLocalDescription.calledTwice).to.be.true()
      expectV2(pc)
    })

    it('continues as v2 when the runtime ignores the munged credentials', async () => {
      const pc = fakePeerConnection({ munging: 'ignored' })

      const err = await dial(pc, genUfrag(), await clientOptions({ version: 1, fallback: true }))

      expect(err).to.not.have.property('name', 'WebRTCTransportError')
      expect(pc.setLocalDescription.calledOnce).to.be.true()
      expectV2(pc)
    })
  })

  describe('with dialer version 1', () => {
    it('munges the offer', async () => {
      const pc = fakePeerConnection({ munging: 'allowed' })
      const ufrag = genUfrag()

      const err = await dial(pc, ufrag, await clientOptions({ version: 1 }))

      expect(err).to.not.have.property('name', 'WebRTCTransportError')
      expect(pc.setLocalDescription.calledOnce).to.be.true()
      expectV1(pc, ufrag)
    })

    it('fails when the runtime rejects the munged offer', async () => {
      const pc = fakePeerConnection({ munging: 'rejected' })

      const err = await dial(pc, genUfrag(), await clientOptions({ version: 1 }))

      expect(err).to.have.property('name', 'WebRTCTransportError')
      expect(pc.setLocalDescription.calledOnce).to.be.true()
      expect(pc.setRemoteDescription.called).to.be.false()
    })

    it('fails when the runtime ignores the munged credentials', async () => {
      const pc = fakePeerConnection({ munging: 'ignored' })

      const err = await dial(pc, genUfrag(), await clientOptions({ version: 1 }))

      expect(err).to.have.property('name', 'WebRTCTransportError')
      expect(pc.setRemoteDescription.called).to.be.false()
    })
  })

  describe('with dialer version 2', () => {
    it('never munges the offer', async () => {
      const pc = fakePeerConnection({ munging: 'rejected' })

      const err = await dial(pc, genUfrag(32, ''), await clientOptions({ version: 2 }))

      expect(err).to.not.have.property('name', 'WebRTCTransportError')
      expect(pc.setLocalDescription.calledOnce).to.be.true()
      expectV2(pc)
    })

    it('rejects a local ICE password that is not a valid credential', async () => {
      const pc = fakePeerConnection({ pwd: 'short' })

      const err = await dial(pc, genUfrag(32, ''), await clientOptions({ version: 2 }))

      expect(err).to.have.property('name', 'WebRTCTransportError')
      expect(pc.setRemoteDescription.called).to.be.false()
    })

    it('rejects a local ICE password that does not fit in the server ufrag', async () => {
      // valid on its own but over the 256 character ufrag limit once prefixed
      const pc = fakePeerConnection({ pwd: 'a'.repeat(240) })

      const err = await dial(pc, genUfrag(32, ''), await clientOptions({ version: 2 }))

      expect(err).to.have.property('name', 'WebRTCTransportError')
      expect(pc.setRemoteDescription.called).to.be.false()
    })
  })
})
