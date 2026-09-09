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
import type { Upgrader } from '@libp2p/interface'

/**
 * Enough of an RTCPeerConnection for the v2 client path to create and set an
 * offer carrying `pwd` as its ICE password, then block on the handshake
 * channel until the test aborts
 */
function fakePeerConnection (pwd: string): any {
  const sdp = `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=ice-ufrag:aBcD\r\na=ice-pwd:${pwd}\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=sctp-port:5000\r\n`
  const pc: any = new EventTarget()
  pc.connectionState = 'new'
  pc.localDescription = null
  pc.createOffer = async () => ({ type: 'offer', sdp })
  pc.setLocalDescription = async (desc: RTCSessionDescriptionInit) => { pc.localDescription = desc }
  pc.setRemoteDescription = Sinon.stub().resolves()
  pc.createDataChannel = () => Object.assign(new EventTarget(), { readyState: 'connecting', close: () => {} })
  pc.close = () => {}

  return pc
}

async function dialV2 (pwd: string): Promise<{ pc: any, err: any }> {
  const pc = fakePeerConnection(pwd)
  const privateKey = await generateKeyPair('Ed25519')

  const err = await connect(pc, new DataChannelMuxerFactory({ peerConnection: pc }), genUfrag(32, ''), {
    role: 'client',
    version: 'v2',
    log: defaultLogger().forComponent('test'),
    logger: defaultLogger(),
    remoteAddr: multiaddr('/ip4/127.0.0.1/udp/1234/webrtc-direct/certhash/uEiC5P6FL6EZzCG9zUT4nnVa3KWdMSriNIe-_5roWN7psKg'),
    upgrader: stubInterface<Upgrader>(),
    peerId: peerIdFromPrivateKey(privateKey),
    privateKey,
    signal: AbortSignal.timeout(100)
  }).then(
    () => { throw new Error('connect should not have completed') },
    (err: unknown) => err
  )

  return { pc, err }
}

describe('webrtc-direct v2 dial', () => {
  it('encodes the local ICE password in the server ufrag', async () => {
    const { pc, err } = await dialV2('runtimeGeneratedPassword')

    expect(err).to.not.have.property('name', 'WebRTCTransportError')
    expect(pc.setRemoteDescription.firstCall.args[0].sdp).to.include('a=ice-ufrag:libp2p+webrtc+v2/runtimeGeneratedPassword\n')
  })

  it('rejects a local ICE password that is not a valid credential', async () => {
    const { pc, err } = await dialV2('short')

    expect(err).to.have.property('name', 'WebRTCTransportError')
    expect(pc.setRemoteDescription.called).to.be.false()
  })

  it('rejects a local ICE password that does not fit in the server ufrag', async () => {
    // valid on its own but over the 256 character ufrag limit once prefixed
    const { pc, err } = await dialV2('a'.repeat(240))

    expect(err).to.have.property('name', 'WebRTCTransportError')
    expect(pc.setRemoteDescription.called).to.be.false()
  })
})
