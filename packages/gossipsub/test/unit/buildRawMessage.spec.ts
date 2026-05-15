import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { StrictSign } from '../../src/index.ts'
import { buildRawMessage } from '../../src/utils/buildRawMessage.ts'
import { getPublishConfigFromPeerId } from '../../src/utils/publishConfig.ts'

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
})
