import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { StrictSign } from '../../src/index.ts'
import { ValidateError } from '../../src/types.ts'
import { buildRawMessage, validateToRawMessage } from '../../src/utils/buildRawMessage.ts'
import { getPublishConfigFromPeerId } from '../../src/utils/publishConfig.ts'
import type { PrivateKey } from '@libp2p/interface'

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

  describe('RSA author key binding', () => {
    const topic = 'test-topic'
    const data = uint8ArrayFromString('hello')
    let victimKey: PrivateKey

    before(async function () {
      // RSA key generation is slow
      this.timeout(30_000)
      victimKey = await generateKeyPair('RSA', 2048)
    })

    it('accepts a message signed by the genuine RSA author', async () => {
      const victim = peerIdFromPrivateKey(victimKey)
      const config = getPublishConfigFromPeerId(StrictSign, victim, victimKey)
      const { raw } = await buildRawMessage(config, topic, data, data)

      const result = await validateToRawMessage(StrictSign, raw)
      expect(result.valid).to.equal(true)
    })

    it('rejects a message whose signing key does not derive to the RSA author', async () => {
      const victim = peerIdFromPrivateKey(victimKey)
      const attackerKey = await generateKeyPair('Ed25519')

      // claim the victim RSA peer id as author but sign with the attacker's key.
      // getPublishConfigFromPeerId does not check that the peer id matches the
      // private key, so `from` is the victim while the signature and `key` field
      // are the attacker's
      const forgedConfig = getPublishConfigFromPeerId(StrictSign, victim, attackerKey)
      const { raw } = await buildRawMessage(forgedConfig, topic, data, data)

      expect(raw.from).to.deep.equal(victim.toMultihash().bytes)

      const result = await validateToRawMessage(StrictSign, raw)
      expect(result).to.deep.equal({ valid: false, error: ValidateError.InvalidPeerId })
    })
  })
})
