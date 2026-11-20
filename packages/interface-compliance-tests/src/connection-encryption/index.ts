import { generateKeyPair } from '@libp2p/crypto'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { multiaddrConnectionPair, echo } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import all from 'it-all'
import toBuffer from 'it-to-buffer'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { TestSetup } from '../index.ts'
import type { ConnectionEncrypter, PeerId, PrivateKey } from '@libp2p/interface'

export interface ConnectionEncrypterSetupArgs {
  privateKey: PrivateKey
}

export default (common: TestSetup<ConnectionEncrypter, ConnectionEncrypterSetupArgs>): void => {
  describe('interface-connection-encrypter compliance tests', () => {
    let crypto: ConnectionEncrypter
    let cryptoRemote: ConnectionEncrypter
    let localPeer: PeerId
    let remotePeer: PeerId
    let mitmPeer: PeerId

    before(async () => {
      const localKey = await generateKeyPair('Ed25519')
      localPeer = peerIdFromPrivateKey(localKey)
      const remoteKey = await generateKeyPair('Ed25519')
      remotePeer = peerIdFromPrivateKey(remoteKey)

      crypto = await common.setup({
        privateKey: localKey
      })
      cryptoRemote = await common.setup({
        privateKey: remoteKey
      })

      mitmPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    })

    after(async () => {
      await common.teardown()
    })

    it('has a protocol string', () => {
      expect(crypto.protocol).to.exist()
      expect(crypto.protocol).to.be.a('string')
    })

    it('it wraps the provided duplex connection', async () => {
      const [localConn, remoteConn] = multiaddrConnectionPair()

      const [
        inboundResult,
        outboundResult
      ] = await Promise.all([
        cryptoRemote.secureInbound(remoteConn),
        crypto.secureOutbound(localConn, {
          remotePeer
        })
      ])

      // Echo server
      echo(inboundResult.connection).catch(() => {})

      const input: Uint8Array[] = []

      for (let i = 0; i < 10_000; i++) {
        input.push(uint8ArrayFromString(`data to encrypt, chunk ${i}`))
      }

      // Send some data and collect the result
      const [output] = await Promise.all([
        all(outboundResult.connection),
        Promise.resolve().then(async () => {
          for (const buf of input) {
            if (!outboundResult.connection.send(buf)) {
              await pEvent(outboundResult.connection, 'drain')
            }
          }

          await outboundResult.connection.close()
        })
      ])

      expect(toBuffer(output.map(b => b.subarray()))).to.equalBytes(toBuffer(input))
    })

    it('should return the remote peer id', async () => {
      const [remoteConn, localConn] = multiaddrConnectionPair()

      const [
        inboundResult,
        outboundResult
      ] = await Promise.all([
        cryptoRemote.secureInbound(localConn),
        crypto.secureOutbound(remoteConn, {
          remotePeer
        })
      ])

      // Inbound should return the initiator (local) peer
      expect(inboundResult.remotePeer.toString()).to.equal(localPeer.toString())
      // Outbound should return the receiver (remote) peer
      expect(outboundResult.remotePeer.toString()).to.equal(remotePeer.toString())
    })

    it('inbound connections should verify peer integrity if known', async () => {
      const [remoteConn, localConn] = multiaddrConnectionPair()

      await Promise.all([
        cryptoRemote.secureInbound(localConn, {
          remotePeer: mitmPeer
        }),
        crypto.secureOutbound(remoteConn, {
          remotePeer
        })
      ]).then(() => expect.fail(), (err) => {
        expect(err).to.exist()
        expect(err).to.have.property('name', 'UnexpectedPeerError')
      })
    })

    describe('remote peer id parsed from a string', () => {
      let rsaKey: PrivateKey
      let rsaPeer: PeerId
      let cryptoRsa: ConnectionEncrypter

      before(async () => {
        rsaKey = await generateKeyPair('RSA', { bits: 512 })
        rsaPeer = peerIdFromPrivateKey(rsaKey)
        cryptoRsa = await common.setup({
          privateKey: rsaKey
        })
      })

      interface SecureOptions {
        initiator: ConnectionEncrypter
        responder: ConnectionEncrypter
        expectedByInitiator?: PeerId
        expectedByResponder?: PeerId
      }

      async function secure (opts: SecureOptions): Promise<{ inbound: PeerId, outbound: PeerId }> {
        const [remoteConn, localConn] = multiaddrConnectionPair()

        try {
          const [inboundResult, outboundResult] = await Promise.all([
            opts.responder.secureInbound(localConn, {
              remotePeer: opts.expectedByResponder
            }),
            opts.initiator.secureOutbound(remoteConn, {
              remotePeer: opts.expectedByInitiator
            })
          ])

          return { inbound: inboundResult.remotePeer, outbound: outboundResult.remotePeer }
        } finally {
          localConn.abort(new Error('test finished'))
          remoteConn.abort(new Error('test finished'))
        }
      }

      function parse (peerId: PeerId): PeerId {
        return peerIdFromString(peerId.toString())
      }

      it('should match an RSA peer id on outbound connections', async () => {
        const expected = parse(rsaPeer)
        expect(expected.publicKey).to.be.undefined()

        const { outbound } = await secure({ initiator: crypto, responder: cryptoRsa, expectedByInitiator: expected })
        expect(outbound.equals(rsaPeer)).to.be.true()
        expect(outbound.publicKey).to.equalBytes(rsaKey.publicKey.toProtobuf())
      })

      it('should not match an RSA peer id against a different key on outbound connections', async () => {
        const expected = parse(rsaPeer)
        expect(expected.publicKey).to.be.undefined()

        await expect(secure({ initiator: crypto, responder: cryptoRemote, expectedByInitiator: expected })).to.eventually.be.rejected
          .with.property('name', 'UnexpectedPeerError')
      })

      it('should match an RSA peer id on inbound connections', async () => {
        const expected = parse(rsaPeer)
        expect(expected.publicKey).to.be.undefined()

        const { inbound } = await secure({ initiator: cryptoRsa, responder: cryptoRemote, expectedByResponder: expected })
        expect(inbound.equals(rsaPeer)).to.be.true()
        expect(inbound.publicKey).to.equalBytes(rsaKey.publicKey.toProtobuf())
      })

      it('should return the key of an RSA peer on inbound connections without an expected peer', async () => {
        const { inbound } = await secure({ initiator: cryptoRsa, responder: cryptoRemote })
        expect(inbound.equals(rsaPeer)).to.be.true()
        expect(inbound.publicKey).to.equalBytes(rsaKey.publicKey.toProtobuf())
      })

      it('should not match an RSA peer id against a different key on inbound connections', async () => {
        const expected = parse(rsaPeer)
        expect(expected.publicKey).to.be.undefined()

        await expect(secure({ initiator: crypto, responder: cryptoRemote, expectedByResponder: expected })).to.eventually.be.rejected
          .with.property('name', 'UnexpectedPeerError')
      })

      it('should match an Ed25519 peer id', async () => {
        const { outbound } = await secure({ initiator: crypto, responder: cryptoRemote, expectedByInitiator: parse(remotePeer) })
        expect(outbound.equals(remotePeer)).to.be.true()
      })

      it('should not match a different Ed25519 peer id', async () => {
        await expect(secure({ initiator: crypto, responder: cryptoRemote, expectedByInitiator: parse(mitmPeer) })).to.eventually.be.rejected
          .with.property('name', 'UnexpectedPeerError')
      })
    })
  })
}
