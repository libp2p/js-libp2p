import { expect } from 'aegir/chai'
import { RPC } from '../../src/message/rpc.js'

describe('partial messages - protobuf round-trip', () => {
  it('should encode and decode SubOpts with only requestsPartial set', () => {
    const subOpts: RPC.SubOpts = {
      subscribe: true,
      topic: 'test-topic',
      requestsPartial: true
    }

    const encoded = RPC.SubOpts.encode(subOpts)
    const decoded = RPC.SubOpts.decode(encoded)

    expect(decoded.subscribe).to.equal(true)
    expect(decoded.topic).to.equal('test-topic')
    expect(decoded.requestsPartial).to.equal(true)
    expect(decoded.supportsSendingPartial).to.be.undefined()
  })

  it('should encode and decode SubOpts with only supportsSendingPartial set', () => {
    const subOpts: RPC.SubOpts = {
      subscribe: true,
      topic: 'test-topic',
      supportsSendingPartial: true
    }

    const encoded = RPC.SubOpts.encode(subOpts)
    const decoded = RPC.SubOpts.decode(encoded)

    expect(decoded.subscribe).to.equal(true)
    expect(decoded.topic).to.equal('test-topic')
    expect(decoded.requestsPartial).to.be.undefined()
    expect(decoded.supportsSendingPartial).to.equal(true)
  })

  it('should encode and decode SubOpts with partial fields', () => {
    const subOpts: RPC.SubOpts = {
      subscribe: true,
      topic: 'test-topic',
      requestsPartial: true,
      supportsSendingPartial: false
    }

    const encoded = RPC.SubOpts.encode(subOpts)
    const decoded = RPC.SubOpts.decode(encoded)

    expect(decoded.subscribe).to.equal(true)
    expect(decoded.topic).to.equal('test-topic')
    expect(decoded.requestsPartial).to.equal(true)
    expect(decoded.supportsSendingPartial).to.equal(false)
  })

  it('should encode and decode ControlExtensions', () => {
    const extensions: RPC.ControlExtensions = {
      partialMessages: true
    }

    const encoded = RPC.ControlExtensions.encode(extensions)
    const decoded = RPC.ControlExtensions.decode(encoded)

    expect(decoded.partialMessages).to.equal(true)
  })

  it('should encode and decode PartialMessagesExtension', () => {
    const partial: RPC.PartialMessagesExtension = {
      topicID: new Uint8Array([1, 2, 3]),
      groupID: new Uint8Array([4, 5, 6]),
      partialMessage: new Uint8Array([7, 8, 9]),
      partsMetadata: new Uint8Array([10, 11, 12])
    }

    const encoded = RPC.PartialMessagesExtension.encode(partial)
    const decoded = RPC.PartialMessagesExtension.decode(encoded)

    expect(decoded.topicID).to.deep.equal(new Uint8Array([1, 2, 3]))
    expect(decoded.groupID).to.deep.equal(new Uint8Array([4, 5, 6]))
    expect(decoded.partialMessage).to.deep.equal(new Uint8Array([7, 8, 9]))
    expect(decoded.partsMetadata).to.deep.equal(new Uint8Array([10, 11, 12]))
  })

  it('should encode and decode RPC with partial field', () => {
    const rpc: RPC = {
      subscriptions: [{
        subscribe: true,
        topic: 'test',
        requestsPartial: true,
        supportsSendingPartial: true
      }],
      messages: [],
      control: {
        ihave: [],
        iwant: [],
        graft: [],
        prune: [],
        idontwant: [],
        extensions: { partialMessages: true }
      },
      partial: {
        topicID: new Uint8Array([1]),
        groupID: new Uint8Array([2]),
        partsMetadata: new Uint8Array([3])
      }
    }

    const encoded = RPC.encode(rpc)
    const decoded = RPC.decode(encoded)

    expect(decoded.subscriptions[0].requestsPartial).to.equal(true)
    expect(decoded.subscriptions[0].supportsSendingPartial).to.equal(true)
    expect(decoded.control?.extensions?.partialMessages).to.equal(true)
    expect(decoded.partial?.topicID).to.deep.equal(new Uint8Array([1]))
    expect(decoded.partial?.groupID).to.deep.equal(new Uint8Array([2]))
    expect(decoded.partial?.partsMetadata).to.deep.equal(new Uint8Array([3]))
  })

  it('should encode and decode PartialMessagesExtension without partialMessage', () => {
    const partial: RPC.PartialMessagesExtension = {
      topicID: new Uint8Array([1, 2, 3]),
      groupID: new Uint8Array([4, 5, 6]),
      partsMetadata: new Uint8Array([10, 11, 12])
    }

    const encoded = RPC.PartialMessagesExtension.encode(partial)
    const decoded = RPC.PartialMessagesExtension.decode(encoded)

    expect(decoded.topicID).to.deep.equal(new Uint8Array([1, 2, 3]))
    expect(decoded.groupID).to.deep.equal(new Uint8Array([4, 5, 6]))
    expect(decoded.partialMessage).to.be.undefined()
    expect(decoded.partsMetadata).to.deep.equal(new Uint8Array([10, 11, 12]))
  })

  it('should encode and decode PartialMessagesExtension without partsMetadata', () => {
    const partial: RPC.PartialMessagesExtension = {
      topicID: new Uint8Array([1, 2, 3]),
      groupID: new Uint8Array([4, 5, 6])
    }

    const encoded = RPC.PartialMessagesExtension.encode(partial)
    const decoded = RPC.PartialMessagesExtension.decode(encoded)

    expect(decoded.topicID).to.deep.equal(new Uint8Array([1, 2, 3]))
    expect(decoded.groupID).to.deep.equal(new Uint8Array([4, 5, 6]))
    expect(decoded.partsMetadata).to.be.undefined()
  })

  it('should be backward compatible - old format decodes without partial fields', () => {
    const rpc: RPC = {
      subscriptions: [{ subscribe: true, topic: 'test' }],
      messages: []
    }

    const encoded = RPC.encode(rpc)
    const decoded = RPC.decode(encoded)

    expect(decoded.subscriptions[0].requestsPartial).to.be.undefined()
    expect(decoded.subscriptions[0].supportsSendingPartial).to.be.undefined()
    expect(decoded.control).to.be.undefined()
    expect(decoded.partial).to.be.undefined()
  })
})
