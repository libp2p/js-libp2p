import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { RPC } from '../../src/message/rpc.js'

/**
 * Wire-format fixtures pinned against the canonical protobuf registry at
 * `libp2p/specs@master:pubsub/gossipsub/extensions/extensions.proto`.
 *
 * These assert exact bytes rather than round-tripping through our own codec.
 * A round-trip test passes even if every field number drifts, because encode
 * and decode drift together. Only a fixture catches a field-number change,
 * which is the failure mode that silently breaks interop with go-libp2p-pubsub
 * and rust-libp2p.
 *
 * Protobuf tag byte = (field_number << 3) | wire_type
 * (wire_type 0 = varint, 2 = length-delimited)
 */
describe('partial messages - wire format', () => {
  const hex = (bytes: Uint8Array): string => uint8ArrayToString(bytes, 'base16')

  describe('field numbers match the spec registry', () => {
    it('SubOpts.requestsPartial is field 3, supportsSendingPartial is field 4', () => {
      const encoded = RPC.SubOpts.encode({
        subscribe: true,
        topic: 'a',
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // 08 01 | subscribe=true      field 1, varint -> (1<<3)|0 = 0x08
      // 12 01 61 | topic="a"        field 2, len=1  -> (2<<3)|2 = 0x12
      // 18 01 | requestsPartial     field 3, varint -> (3<<3)|0 = 0x18
      // 20 01 | supportsSending...  field 4, varint -> (4<<3)|0 = 0x20
      expect(hex(encoded)).to.equal('080112016118012001')
    })

    it('ControlExtensions.partialMessages is field 10', () => {
      const encoded = RPC.ControlExtensions.encode({ partialMessages: true })

      // 50 01 | partialMessages     field 10, varint -> (10<<3)|0 = 0x50
      expect(hex(encoded)).to.equal('5001')
    })

    it('ControlMessage.extensions is field 6', () => {
      const encoded = RPC.encode({
        subscriptions: [],
        messages: [],
        control: {
          ihave: [],
          iwant: [],
          graft: [],
          prune: [],
          idontwant: [],
          extensions: { partialMessages: true }
        }
      })

      // 1a 04 | control             field 3, len=4  -> (3<<3)|2 = 0x1a
      //   32 02 | extensions        field 6, len=2  -> (6<<3)|2 = 0x32
      //     50 01 | partialMessages field 10, varint
      expect(hex(encoded)).to.equal('1a0432025001')
    })

    it('RPC.partial is field 10', () => {
      const encoded = RPC.encode({
        subscriptions: [],
        messages: [],
        partial: { topicID: Uint8Array.from([1]) }
      })

      // 52 03 | partial             field 10, len=3 -> (10<<3)|2 = 0x52
      //   0a 01 01 | topicID        field 1, len=1
      expect(hex(encoded)).to.equal('52030a0101')
    })

    it('PartialMessagesExtension fields are 1..4 in registry order', () => {
      const encoded = RPC.PartialMessagesExtension.encode({
        topicID: Uint8Array.from([1]),
        groupID: Uint8Array.from([2]),
        partialMessage: Uint8Array.from([3]),
        partsMetadata: Uint8Array.from([4])
      })

      // 0a 01 01 | topicID          field 1, len=1 -> (1<<3)|2 = 0x0a
      // 12 01 02 | groupID          field 2, len=1 -> (2<<3)|2 = 0x12
      // 1a 01 03 | partialMessage   field 3, len=1 -> (3<<3)|2 = 0x1a
      // 22 01 04 | partsMetadata    field 4, len=1 -> (4<<3)|2 = 0x22
      expect(hex(encoded)).to.equal('0a01011201021a0103220104')
    })
  })

  describe('interop decoding', () => {
    it('decodes a partial RPC produced without an extensions handshake', () => {
      // A peer that never advertised ControlExtensions can still send partial
      // data — the two are independent fields on the wire.
      const decoded = RPC.decode(uint8ArrayFromString('52030a0101', 'base16'))

      expect(decoded.control).to.be.undefined()
      expect(decoded.partial?.topicID).to.deep.equal(Uint8Array.from([1]))
    })

    it('decodes an extensions handshake carrying no partial payload', () => {
      const decoded = RPC.decode(uint8ArrayFromString('1a0432025001', 'base16'))

      expect(decoded.partial).to.be.undefined()
      expect(decoded.control?.extensions?.partialMessages).to.equal(true)
    })

    it('skips unknown extension field numbers without failing', () => {
      // The registry reserves field numbers > 0x200000 for experimental
      // extensions. gossipsub v1.3: "Peers MUST ignore unknown extensions."
      // 0xd2958f03 is the tag for field 6492434, wire type 2 (testExtension).
      const withUnknownExtension = uint8ArrayFromString('52030a0101d2958f03020801', 'base16')

      const decoded = RPC.decode(withUnknownExtension)
      expect(decoded.partial?.topicID).to.deep.equal(Uint8Array.from([1]))
    })
  })
})
