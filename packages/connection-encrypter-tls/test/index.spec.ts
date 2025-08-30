/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tls } from '../src/index.js'
import type { StreamMuxerFactory, ConnectionEncrypter, PeerId, Upgrader } from '@libp2p/interface'

describe('tls', () => {
  let localPeer: PeerId
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let localEncrypter: ConnectionEncrypter
  let remoteEncrypter: ConnectionEncrypter

  beforeEach(async () => {
    wrongPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const localKeyPair = await generateKeyPair('Ed25519')
    localPeer = peerIdFromPrivateKey(localKeyPair)

    localEncrypter = tls()({
      privateKey: localKeyPair,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers () {
          return new Map([['/test/muxer', stubInterface<StreamMuxerFactory>({
            protocol: '/test/muxer'
          })]])
        }
      })
    })

    const remoteKeyPair = await generateKeyPair('Ed25519')
    remotePeer = peerIdFromPrivateKey(remoteKeyPair)

    remoteEncrypter = tls()({
      privateKey: remoteKeyPair,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers () {
          return new Map([['/test/muxer', stubInterface<StreamMuxerFactory>({
            protocol: '/test/muxer'
          })]])
        }
      })
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const [outboundErr] = await Promise.all([
      localEncrypter.secureOutbound(outbound, {
        remotePeer: wrongPeer
      })
        .catch(err => err),
      remoteEncrypter.secureInbound(inbound, {
        remotePeer: localPeer
      })
        .catch(err => err)
    ])

    expect(outboundErr).to.have.property('name', 'UnexpectedPeerError')
  })

  it('should fail if the peer does not provide its public key', async () => {
    const keyPair = await generateKeyPair('RSA', 512)
    const peer = peerIdFromPrivateKey(keyPair)
    remotePeer = peerIdFromMultihash(peer.toMultihash())

    localEncrypter = tls()({
      privateKey: keyPair,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers () {
          return new Map([['/test/muxer', stubInterface<StreamMuxerFactory>()]])
        }
      })
    })

    const [inbound, outbound] = await streamPair()

    const [inboundErr, outboundErr] = await Promise.all([
      localEncrypter.secureInbound(inbound, {
        remotePeer
      })
        .catch(err => err),
      remoteEncrypter.secureOutbound(outbound, {
        remotePeer: localPeer
      })
        .catch(err => err)
    ])

    expect(inboundErr).to.have.property('name', 'StreamResetError')
    expect(outboundErr).to.have.property('name', 'UnexpectedPeerError')
  })

  it('should select an early muxer', async () => {
    const [outbound, inbound] = await streamPair()

    const result = await Promise.all([
      localEncrypter.secureOutbound(outbound, {
        remotePeer
      }),
      remoteEncrypter.secureInbound(inbound, {
        remotePeer: localPeer
      })
    ])

    expect(result).to.have.nested.property('[0].streamMuxer.protocol', '/test/muxer')
    expect(result).to.have.nested.property('[1].streamMuxer.protocol', '/test/muxer')
  })

  it('should not select an early muxer when it is skipped', async () => {
    const [outbound, inbound] = await streamPair()

    const result = await Promise.all([
      localEncrypter.secureOutbound(outbound, {
        remotePeer,
        skipStreamMuxerNegotiation: true
      }),
      remoteEncrypter.secureInbound(inbound, {
        remotePeer: localPeer,
        skipStreamMuxerNegotiation: true
      })
    ])

    expect(result).to.have.nested.property('[0].streamMuxer', undefined)
    expect(result).to.have.nested.property('[1].streamMuxer', undefined)
  })
})
