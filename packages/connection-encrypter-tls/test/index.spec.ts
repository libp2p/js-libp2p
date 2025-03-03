/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { duplexPair } from 'it-pair/duplex'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tls } from '../src/index.js'
import type { StreamMuxerFactory, ConnectionEncrypter, PeerId, Upgrader, MultiaddrConnection } from '@libp2p/interface'

describe('tls', () => {
  let localPeer: PeerId
  let remotePeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter

  beforeEach(async () => {
    [remotePeer, wrongPeer] = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])

    const localKeyPair = await generateKeyPair('Ed25519')
    localPeer = peerIdFromPrivateKey(localKeyPair)

    encrypter = tls()({
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
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should verify the public key and id match', async () => {
    const [inbound, outbound] = duplexPair<any>()

    await Promise.all([
      encrypter.secureInbound(stubInterface<MultiaddrConnection>({
        ...inbound
      }), {
        remotePeer
      }),
      encrypter.secureOutbound(stubInterface<MultiaddrConnection>({
        ...outbound
      }), {
        remotePeer: wrongPeer
      })
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })

  it('should fail if the peer does not provide its public key', async () => {
    const keyPair = await generateKeyPair('RSA', 512)
    const peer = peerIdFromPrivateKey(keyPair)
    remotePeer = peerIdFromMultihash(peer.toMultihash())

    encrypter = tls()({
      privateKey: keyPair,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers () {
          return new Map([['/test/muxer', stubInterface<StreamMuxerFactory>()]])
        }
      })
    })

    const [inbound, outbound] = duplexPair<any>()

    await expect(Promise.all([
      encrypter.secureInbound(stubInterface<MultiaddrConnection>({
        ...inbound
      }), {
        remotePeer
      }),
      encrypter.secureOutbound(stubInterface<MultiaddrConnection>({
        ...outbound
      }), {
        remotePeer: localPeer
      })
    ]))
      .to.eventually.be.rejected.with.property('name', 'UnexpectedPeerError')
  })

  it('should select an early muxer', async () => {
    const [inbound, outbound] = duplexPair<any>()

    const result = await Promise.all([
      encrypter.secureInbound(stubInterface<MultiaddrConnection>({
        ...inbound
      }), {
        remotePeer: localPeer
      }),
      encrypter.secureOutbound(stubInterface<MultiaddrConnection>({
        ...outbound
      }), {
        remotePeer: localPeer
      })
    ])

    expect(result).to.have.nested.property('[0].streamMuxer.protocol', '/test/muxer')
    expect(result).to.have.nested.property('[1].streamMuxer.protocol', '/test/muxer')
  })
})
