import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { StrictSign } from '../../src/index.ts'
import { RPC } from '../../src/message/rpc.ts'
import { ValidateError } from '../../src/types.ts'
import { buildRawMessage, SignPrefix, validateToRawMessage } from '../../src/utils/buildRawMessage.ts'
import { getPublishConfigFromPeerId } from '../../src/utils/publishConfig.ts'

function seqno (n: bigint): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, n, false)
  return out
}

describe('buildRawMessage', () => {
  describe('Signing seqno', () => {
    it('produces strictly increasing big-endian uint64 seqnos', async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)
      const publishConfig = getPublishConfigFromPeerId(StrictSign, peerId, privateKey)
      const topic = 'test-topic'
      const data = uint8ArrayFromString('hello')

      const seqnos: bigint[] = []
      for (let i = 0; i < 100; i++) {
        const { raw } = await buildRawMessage(publishConfig, topic, data, data)
        expect(raw.seqno).to.be.an.instanceOf(Uint8Array)
        expect(raw.seqno).to.have.lengthOf(8)
        seqnos.push(new DataView(raw.seqno!.buffer, raw.seqno!.byteOffset, 8).getBigUint64(0, false))
      }

      for (let i = 1; i < seqnos.length; i++) {
        expect(seqnos[i] > seqnos[i - 1], `seqno ${seqnos[i]} should be > previous ${seqnos[i - 1]} (index ${i})`).to.equal(true)
      }
    })
  })

  describe('validation', () => {
    it('rejects a supplied public key that does not match the from peer id', async () => {
      const attackerKey = await generateKeyPair('Ed25519')
      const victimKey = await generateKeyPair('RSA', 512)
      const victim = peerIdFromPrivateKey(victimKey)

      const msg: RPC.Message = {
        from: victim.toMultihash().bytes,
        data: uint8ArrayFromString('forged message'),
        seqno: seqno(1n),
        topic: 'test-topic',
        signature: undefined,
        key: undefined
      }

      msg.signature = await attackerKey.sign(uint8ArrayConcat([SignPrefix, RPC.Message.encode(msg)]))
      msg.key = publicKeyToProtobuf(attackerKey.publicKey)

      await expect(validateToRawMessage(StrictSign, msg)).to.eventually.deep.equal({
        valid: false,
        error: ValidateError.InvalidPeerId
      })
    })
  })
})
