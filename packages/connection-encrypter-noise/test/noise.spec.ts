import { Buffer } from 'buffer'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { lpStream, byteStream, multiaddrConnectionPair } from '@libp2p/utils'
import { assert, expect } from 'aegir/chai'
import { randomBytes } from 'iso-random-stream'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { pureJsCrypto } from '../src/crypto/js.ts'
import { Noise } from '../src/noise.ts'
import { createPeerIdsFromFixtures } from './fixtures/peer.ts'
import type { StreamMuxerFactory, PeerId, PrivateKey, Upgrader } from '@libp2p/interface'

describe('Noise', () => {
  let remotePeer: { peerId: PeerId, privateKey: PrivateKey }
  let localPeer: { peerId: PeerId, privateKey: PrivateKey }
  const sandbox = sinon.createSandbox()

  before(async () => {
    [localPeer, remotePeer] = await createPeerIdsFromFixtures(2)
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should communicate through encrypted streams without noise pipes', async () => {
    try {
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined, extensions: undefined })
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined, extensions: undefined })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection, {
          remotePeer: localPeer.peerId
        })
      ])

      expect(inbound).to.not.have.property('streamMuxer', 'inbound connection selected early muxer')
      expect(outbound).to.not.have.property('streamMuxer', 'outbound connection selected early muxer')

      const wrappedInbound = lpStream(inbound.connection)
      const wrappedOutbound = lpStream(outbound.connection)

      await wrappedOutbound.write(Buffer.from('test'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test')
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should test large payloads', async function () {
    this.timeout(10000)
    try {
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined })
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection, {
          remotePeer: localPeer.peerId
        })
      ])
      const wrappedInbound = byteStream(inbound.connection)
      const wrappedOutbound = lpStream(outbound.connection)

      const largePlaintext = randomBytes(60000)
      await wrappedOutbound.write(Buffer.from(largePlaintext))
      const response = await wrappedInbound.read({
        bytes: 60000
      })

      expect(response.length).equals(largePlaintext.length)
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should working without remote peer provided in incoming connection', async () => {
    try {
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: staticKeysInitiator.privateKey })
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: staticKeysResponder.privateKey })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection)
      ])
      const wrappedInbound = lpStream(inbound.connection)
      const wrappedOutbound = lpStream(outbound.connection)

      await wrappedOutbound.write(Buffer.from('test v2'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test v2')

      if (inbound.remotePeer.publicKey == null || localPeer.peerId.publicKey == null ||
        outbound.remotePeer.publicKey == null || remotePeer.peerId.publicKey == null) {
        throw new Error('Public key missing from PeerId')
      }

      expect(inbound.remotePeer.publicKey?.raw).to.equalBytes(localPeer.peerId.publicKey.raw)
      expect(outbound.remotePeer.publicKey?.raw).to.equalBytes(remotePeer.peerId.publicKey.raw)
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should accept and return Noise extension from remote peer', async () => {
    try {
      const certhashInit = Buffer.from('certhash data from init')
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: staticKeysInitiator.privateKey, extensions: { webtransportCerthashes: [certhashInit] } })
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()
      const certhashResp = Buffer.from('certhash data from response')
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: staticKeysResponder.privateKey, extensions: { webtransportCerthashes: [certhashResp] } })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection)
      ])

      assert(uint8ArrayEquals(inbound.remoteExtensions?.webtransportCerthashes[0] ?? new Uint8Array(), certhashInit))
      assert(uint8ArrayEquals(outbound.remoteExtensions?.webtransportCerthashes[0] ?? new Uint8Array(), certhashResp))
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should accept and return early muxer from remote peer', async () => {
    try {
      const streamMuxerProtocol = '/my-early-muxer'
      const streamMuxer = stubInterface<StreamMuxerFactory>({
        protocol: streamMuxerProtocol
      })
      const staticKeysInitiator = pureJsCrypto.generateX25519KeyPair()
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map([[streamMuxerProtocol, streamMuxer]])
        })
      }, { staticNoiseKey: staticKeysInitiator.privateKey })
      const staticKeysResponder = pureJsCrypto.generateX25519KeyPair()
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map([[streamMuxerProtocol, streamMuxer]])
        })
      }, { staticNoiseKey: staticKeysResponder.privateKey })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection)
      ])

      expect(inbound).to.have.nested.property('streamMuxer.protocol', streamMuxerProtocol, 'inbound connection did not select early muxer')
      expect(outbound).to.have.nested.property('streamMuxer.protocol', streamMuxerProtocol, 'outbound connection did not select early muxer')
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should accept a prologue', async () => {
    try {
      const noiseInit = new Noise({
        ...localPeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined, crypto: pureJsCrypto, prologueBytes: Buffer.from('Some prologue') })
      const noiseResp = new Noise({
        ...remotePeer,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers: () => new Map()
        })
      }, { staticNoiseKey: undefined, crypto: pureJsCrypto, prologueBytes: Buffer.from('Some prologue') })

      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
      const [outbound, inbound] = await Promise.all([
        noiseInit.secureOutbound(outboundConnection, {
          remotePeer: remotePeer.peerId
        }),
        noiseResp.secureInbound(inboundConnection, {
          remotePeer: localPeer.peerId
        })
      ])
      const wrappedInbound = lpStream(inbound.connection)
      const wrappedOutbound = lpStream(outbound.connection)

      await wrappedOutbound.write(Buffer.from('test'))
      const response = await wrappedInbound.read()
      expect(uint8ArrayToString(response.slice())).equal('test')
    } catch (e) {
      const err = e as Error
      assert(false, err.message)
    }
  })

  it('should abort noise handshake', async () => {
    const abortController = new AbortController()
    abortController.abort()

    const noiseInit = new Noise({
      ...localPeer,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
    }, { staticNoiseKey: undefined, extensions: undefined })
    const noiseResp = new Noise({
      ...remotePeer,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
    }, { staticNoiseKey: undefined, extensions: undefined })

    const [inboundConnection, outboundConnection] = multiaddrConnectionPair()

    await expect(Promise.all([
      noiseInit.secureOutbound(outboundConnection, {
        remotePeer: remotePeer.peerId,
        signal: abortController.signal
      }),
      noiseResp.secureInbound(inboundConnection, {
        remotePeer: localPeer.peerId
      })
    ])).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })

  describe('remote peer id', () => {
    let rsaPeer: { peerId: PeerId, privateKey: PrivateKey }
    let otherRsaPeer: PeerId

    before(async () => {
      const privateKey = await generateKeyPair('RSA', 512)
      rsaPeer = { peerId: peerIdFromPrivateKey(privateKey), privateKey }
      otherRsaPeer = peerIdFromPrivateKey(await generateKeyPair('RSA', 512))
    })

    async function dial (responder: { peerId: PeerId, privateKey: PrivateKey }, expected: PeerId): Promise<PeerId> {
      const upgrader = stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
      const noiseInit = new Noise({ ...localPeer, logger: defaultLogger(), upgrader })
      const noiseResp = new Noise({ ...responder, logger: defaultLogger(), upgrader })
      const [inboundConnection, outboundConnection] = multiaddrConnectionPair()

      const inbound = noiseResp.secureInbound(inboundConnection)
      inbound.catch(() => {})

      try {
        const outbound = await noiseInit.secureOutbound(outboundConnection, {
          remotePeer: expected
        })
        await inbound

        return outbound.remotePeer
      } finally {
        inboundConnection.abort(new Error('test finished'))
        outboundConnection.abort(new Error('test finished'))
      }
    }

    it('should not match a different RSA peer id', async () => {
      const expected = peerIdFromString(otherRsaPeer.toString())
      expect(expected.publicKey).to.be.undefined()

      await expect(dial(rsaPeer, expected)).to.eventually.be.rejectedWith(/does not match expected remote peer id/)
        .with.property('name', 'UnexpectedPeerError')
    })

    it('should not match an RSA peer id against an Ed25519 key', async () => {
      const expected = peerIdFromString(rsaPeer.peerId.toString())
      expect(expected.publicKey).to.be.undefined()

      await expect(dial(remotePeer, expected)).to.eventually.be.rejectedWith(/does not match expected remote peer id/)
        .with.property('name', 'UnexpectedPeerError')
    })

    it('should match an RSA peer id parsed from a string', async () => {
      const expected = peerIdFromString(rsaPeer.peerId.toString())
      expect(expected.publicKey).to.be.undefined()

      const remote = await dial(rsaPeer, expected)
      expect(remote.equals(rsaPeer.peerId)).to.be.true()
    })

    it('should not match a different Ed25519 peer id', async () => {
      await expect(dial(remotePeer, localPeer.peerId)).to.eventually.be.rejectedWith(/does not match expected remote peer id/)
        .with.property('name', 'UnexpectedPeerError')
    })

    it('should match an Ed25519 peer id parsed from a string', async () => {
      const remote = await dial(remotePeer, peerIdFromString(remotePeer.peerId.toString()))
      expect(remote.equals(remotePeer.peerId)).to.be.true()
    })
  })
})
