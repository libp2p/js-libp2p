import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pipe } from 'it-pipe'
import toBuffer from 'it-to-buffer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import peers from '../peers.js'
import { createMaConnPair } from './utils/index.js'
import type { TestSetup } from '../index.js'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

export interface ConnectionEncrypterSetupArgs {
  peerId: PeerId
}

export default (common: TestSetup<ConnectionEncrypter, ConnectionEncrypterSetupArgs>): void => {
  describe('interface-connection-encrypter compliance tests', () => {
    let crypto: ConnectionEncrypter
    let cryptoRemote: ConnectionEncrypter
    let localPeer: PeerId
    let remotePeer: PeerId
    let mitmPeer: PeerId

    before(async () => {
      [
        crypto,
        cryptoRemote,
        localPeer,
        remotePeer,
        mitmPeer
      ] = await Promise.all([
        common.setup({ peerId: await PeerIdFactory.createFromJSON(peers[0]) }),
        common.setup({ peerId: await PeerIdFactory.createFromJSON(peers[1]) }),
        PeerIdFactory.createFromJSON(peers[0]),
        PeerIdFactory.createFromJSON(peers[1]),
        PeerIdFactory.createFromJSON(peers[2])
      ])
    })

    after(async () => {
      await common.teardown()
    })

    it('has a protocol string', () => {
      expect(crypto.protocol).to.exist()
      expect(crypto.protocol).to.be.a('string')
    })

    it('it wraps the provided duplex connection', async () => {
      const [localConn, remoteConn] = createMaConnPair()

      const [
        inboundResult,
        outboundResult
      ] = await Promise.all([
        cryptoRemote.secureInbound(localConn),
        crypto.secureOutbound(remoteConn, remotePeer)
      ])

      // Echo server
      void pipe(inboundResult.conn, inboundResult.conn)

      const input = new Array(10_000).fill(0).map((val, index) => {
        return uint8ArrayFromString(`data to encrypt, chunk ${index}`)
      })

      // Send some data and collect the result
      const result = await pipe(
        async function * () {
          yield * input
        },
        outboundResult.conn,
        async (source) => all(source)
      )

      expect(toBuffer(result.map(b => b.subarray()))).to.equalBytes(toBuffer(input))
    })

    it('should return the remote peer id', async () => {
      const [localConn, remoteConn] = createMaConnPair()

      const [
        inboundResult,
        outboundResult
      ] = await Promise.all([
        cryptoRemote.secureInbound(localConn),
        crypto.secureOutbound(remoteConn, remotePeer)
      ])

      // Inbound should return the initiator (local) peer
      expect(inboundResult.remotePeer.toBytes()).to.equalBytes(localPeer.toBytes())
      // Outbound should return the receiver (remote) peer
      expect(outboundResult.remotePeer.toBytes()).to.equalBytes(remotePeer.toBytes())
    })

    it('inbound connections should verify peer integrity if known', async () => {
      const [localConn, remoteConn] = createMaConnPair()

      await Promise.all([
        cryptoRemote.secureInbound(localConn, mitmPeer),
        crypto.secureOutbound(remoteConn, remotePeer)
      ]).then(() => expect.fail(), (err) => {
        expect(err).to.exist()
        expect(err).to.have.property('name', 'UnexpectedPeerError')
      })
    })
  })
}
