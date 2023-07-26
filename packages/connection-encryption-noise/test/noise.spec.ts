import { Buffer } from 'buffer'
import { assert, expect } from 'aegir/chai'
import { randomBytes } from 'iso-random-stream'
import { byteStream } from 'it-byte-stream'
import { lpStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import sinon from 'sinon'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { NOISE_MSG_MAX_LENGTH_BYTES } from '../src/constants.js'
import { pureJsCrypto } from '../src/crypto/js.js'
import { decode0, decode2, encode1, uint16BEDecode, uint16BEEncode } from '../src/encoder.js'
import { XXHandshake } from '../src/handshake-xx.js'
import { XX } from '../src/handshakes/xx.js'
import { Noise } from '../src/noise.js'
import { createHandshakePayload, getHandshakePayload, getPayload, signPayload } from '../src/utils.js'
import { createPeerIdsFromFixtures } from './fixtures/peer.js'
import { getKeyPairFromPeerId } from './utils.js'
import type { PeerId } from '@libp2p/interface/peer-id'

describe('Noise', () => {
  let remotePeer: PeerId, localPeer: PeerId
  const sandbox = sinon.createSandbox()

  before(async () => {
    [localPeer, remotePeer] = await createPeerIdsFromFixtures(2)
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should communicate through encrypted streams without noise pipes', async () => {
    try {
      const noiseInit = new Noise({ staticNoiseKey: undefined, extensions: undefined })
      const noiseResp = new Noise({ staticNoiseKey: undefined, extensions: undefined })

      const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
        noiseResp.secureInbound(remotePeer, inboundConnection, localPeer)
      ])
      const wrappedInbound = lpStream(inbound.conn)
      const wrappedOutbound = lpStream(outbound.conn)

      await wrappedOutbound.write(Buffer.from('test'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test')
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should test that secureOutbound is spec compliant', async () => {
    const noiseInit = new Noise({ staticNoiseKey: undefined })
    const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()

    const [outbound, { wrapped, handshake }] = await Promise.all([
      noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
      (async () => {
        const wrapped = lpStream(
          inboundConnection,
          {
            lengthEncoder: uint16BEEncode,
            lengthDecoder: uint16BEDecode,
            maxDataLength: NOISE_MSG_MAX_LENGTH_BYTES
          }
        )
        const prologue = Buffer.alloc(0)
        const staticKeys = pureJsCrypto.generateX25519KeyPair()
        const xx = new XX(pureJsCrypto)

        const payload = await getPayload(remotePeer, staticKeys.publicKey)
        const handshake = new XXHandshake(false, payload, prologue, pureJsCrypto, staticKeys, wrapped, localPeer, xx)

        let receivedMessageBuffer = decode0((await wrapped.read()).slice())
        // The first handshake message contains the initiator's ephemeral public key
        expect(receivedMessageBuffer.ne.length).equal(32)
        xx.recvMessage(handshake.session, receivedMessageBuffer)

        // Stage 1
        const { publicKey: libp2pPubKey } = getKeyPairFromPeerId(remotePeer)
        const signedPayload = await signPayload(remotePeer, getHandshakePayload(staticKeys.publicKey))
        const handshakePayload = createHandshakePayload(libp2pPubKey, signedPayload)

        const messageBuffer = xx.sendMessage(handshake.session, handshakePayload)
        await wrapped.write(encode1(messageBuffer))

        // Stage 2 - finish handshake
        receivedMessageBuffer = decode2((await wrapped.read()).slice())
        xx.recvMessage(handshake.session, receivedMessageBuffer)
        return { wrapped, handshake }
      })()
    ])

    const wrappedOutbound = byteStream(outbound.conn)
    await wrappedOutbound.write(uint8ArrayFromString('test'))

    // Check that noise message is prefixed with 16-bit big-endian unsigned integer
    const data = (await wrapped.read()).slice()
    const { plaintext: decrypted, valid } = handshake.decrypt(data, handshake.session)
    // Decrypted data should match
    expect(uint8ArrayEquals(decrypted, uint8ArrayFromString('test'))).to.be.true()
    expect(valid).to.be.true()
  })

  it('should test large payloads', async function () {
    this.timeout(10000)
    try {
      const noiseInit = new Noise({ staticNoiseKey: undefined })
      const noiseResp = new Noise({ staticNoiseKey: undefined })

      const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
        noiseResp.secureInbound(remotePeer, inboundConnection, localPeer)
      ])
      const wrappedInbound = byteStream(inbound.conn)
      const wrappedOutbound = lpStream(outbound.conn)

      const largePlaintext = randomBytes(60000)
      await wrappedOutbound.write(Buffer.from(largePlaintext))
      const response = await wrappedInbound.read(60000)

      expect(response.length).equals(largePlaintext.length)
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should working without remote peer provided in incoming connection', async () => {
    try {
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const noiseInit = new Noise({ staticNoiseKey: staticKeysInitiator.privateKey })
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()
      const noiseResp = new Noise({ staticNoiseKey: staticKeysResponder.privateKey })

      const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
        noiseResp.secureInbound(remotePeer, inboundConnection)
      ])
      const wrappedInbound = lpStream(inbound.conn)
      const wrappedOutbound = lpStream(outbound.conn)

      await wrappedOutbound.write(Buffer.from('test v2'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test v2')

      if (inbound.remotePeer.publicKey == null || localPeer.publicKey == null ||
        outbound.remotePeer.publicKey == null || remotePeer.publicKey == null) {
        throw new Error('Public key missing from PeerId')
      }

      assert(uint8ArrayEquals(inbound.remotePeer.publicKey, localPeer.publicKey))
      assert(uint8ArrayEquals(outbound.remotePeer.publicKey, remotePeer.publicKey))
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should accept and return Noise extension from remote peer', async () => {
    try {
      const certhashInit = Buffer.from('certhash data from init')
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const noiseInit = new Noise({ staticNoiseKey: staticKeysInitiator.privateKey, extensions: { webtransportCerthashes: [certhashInit] } })
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()
      const certhashResp = Buffer.from('certhash data from respon')
      const noiseResp = new Noise({ staticNoiseKey: staticKeysResponder.privateKey, extensions: { webtransportCerthashes: [certhashResp] } })

      const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
        noiseResp.secureInbound(remotePeer, inboundConnection)
      ])

      assert(uint8ArrayEquals(inbound.remoteExtensions?.webtransportCerthashes[0] ?? new Uint8Array(), certhashInit))
      assert(uint8ArrayEquals(outbound.remoteExtensions?.webtransportCerthashes[0] ?? new Uint8Array(), certhashResp))
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should accept a prologue', async () => {
    try {
      const noiseInit = new Noise({ staticNoiseKey: undefined, crypto: pureJsCrypto, prologueBytes: Buffer.from('Some prologue') })
      const noiseResp = new Noise({ staticNoiseKey: undefined, crypto: pureJsCrypto, prologueBytes: Buffer.from('Some prologue') })

      const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
        noiseResp.secureInbound(remotePeer, inboundConnection, localPeer)
      ])
      const wrappedInbound = lpStream(inbound.conn)
      const wrappedOutbound = lpStream(outbound.conn)

      await wrappedOutbound.write(Buffer.from('test'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test')
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })
})
