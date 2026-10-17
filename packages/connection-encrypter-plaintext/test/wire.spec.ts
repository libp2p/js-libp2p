import { generateKeyPair } from '@libp2p/crypto'
import { PublicKeyMessage } from '@libp2p/crypto/pb'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { lpStream, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import * as varint from 'uint8-varint'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { plaintext } from '../src/index.ts'
import type { PrivateKey } from '@libp2p/interface'

// a length-delimited protobuf field
function field (num: number, value: Uint8Array): Uint8Array {
  return uint8ArrayConcat([Uint8Array.from([(num << 3) | 2]), varint.encode(value.byteLength), value])
}

// an Exchange message encoded by hand with the key as an embedded
// `PublicKey { Type, Data }` message, the format other implementations use
function exchange (key: PrivateKey, type: number): Uint8Array {
  const publicKey = uint8ArrayConcat([Uint8Array.from([0x08, type]), field(2, PublicKeyMessage.decode(key.publicKey.toProtobuf()).Data ?? new Uint8Array())])

  return uint8ArrayConcat([field(1, key.publicKey.toMultihash().bytes), field(2, publicKey)])
}

describe('plaintext wire format', () => {
  for (const [name, type, bits] of [['Ed25519', 1], ['RSA', 0, 512]] as const) {
    describe(name, () => {
      let localKey: PrivateKey
      let remoteKey: PrivateKey

      before(async () => {
        localKey = await generateKeyPair(name, { bits })
        remoteKey = await generateKeyPair(name, { bits })
      })

      it('writes and reads an Exchange with an embedded PublicKey message', async () => {
        const encrypter = plaintext()({ privateKey: localKey, logger: defaultLogger() })
        const [inbound, outbound] = await streamPair()
        const remote = lpStream(inbound)

        const result = encrypter.secureOutbound(outbound)

        const written = await remote.read()
        expect(written.subarray()).to.equalBytes(exchange(localKey, type))

        await remote.write(exchange(remoteKey, type))

        const { remotePeer } = await result
        expect(remotePeer.equals(peerIdFromPrivateKey(remoteKey))).to.be.true()
        expect(remotePeer.publicKey).to.equalBytes(remoteKey.publicKey.toProtobuf())
      })
    })
  }
})
