import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddrConnectionPair, echo } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import all from 'it-all'
import toBuffer from 'it-to-buffer'
import { pEvent } from 'p-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { TestSetup } from '../index.js'
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

          await outboundResult.connection.closeWrite()
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
  })
}
