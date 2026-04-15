import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { FIRST_IDENTIFY_MESSAGE_MAX_SIZE, SUBSEQUENT_IDENTIFY_MESSAGE_MAX_SIZE } from '../src/consts.js'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import { buildIdentifyMessages, mergeIdentifyMessages } from '../src/utils.js'

// Enough private addresses to push a message well past the 2 KB threshold.
function manyPrivateAddrs (count: number): Uint8Array[] {
  return Array.from({ length: count }, (_, i) =>
    multiaddr(`/ip4/10.0.${Math.floor(i / 256)}.${i % 256}/tcp/1234`).bytes
  )
}

describe('buildIdentifyMessages', () => {
  it('returns a single message when content fits within 2 KB', () => {
    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      agentVersion: 'test/1.0',
      listenAddrs: [multiaddr('/ip4/1.2.3.4/tcp/1234').bytes],
      protocols: ['/foo/1.0']
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages).to.have.lengthOf(1)
    expect(messages[0].listenAddrs).to.have.lengthOf(1)
    expect(messages[0].protocols).to.deep.equal(['/foo/1.0'])
    expect(messages[0].protocolVersion).to.equal('1.0.0')
    expect(messages[0].agentVersion).to.equal('test/1.0')
  })

  it('splits into multiple messages when content exceeds 2 KB', () => {
    const listenAddrs = manyPrivateAddrs(300)

    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      listenAddrs,
      protocols: []
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages.length).to.be.greaterThan(1)

    // First message must fit within 2 KB
    expect(IdentifyMessage.encode(messages[0]).length)
      .to.be.lessThanOrEqual(FIRST_IDENTIFY_MESSAGE_MAX_SIZE)

    // Subsequent messages must fit within 4 KB
    for (const subsequent of messages.slice(1)) {
      expect(IdentifyMessage.encode(subsequent).length)
        .to.be.lessThanOrEqual(SUBSEQUENT_IDENTIFY_MESSAGE_MAX_SIZE)
    }

    // All addresses must be present across all messages
    const allAddrs = messages.flatMap(m => m.listenAddrs)
    expect(allAddrs).to.have.lengthOf(listenAddrs.length)
  })

  it('spans three or more messages when content exceeds 6 KB', () => {
    // First message holds ≤2 KB, each subsequent holds ≤4 KB.
    // 700 addresses × ~10 bytes each ≈ 7 KB — requires at least three messages.
    const listenAddrs = manyPrivateAddrs(700)

    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      agentVersion: 'test/1.0',
      listenAddrs,
      protocols: ['/foo/1.0', '/bar/1.0']
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages.length).to.be.greaterThan(2, 'expected at least three messages')

    expect(IdentifyMessage.encode(messages[0]).length)
      .to.be.lessThanOrEqual(FIRST_IDENTIFY_MESSAGE_MAX_SIZE)

    for (const subsequent of messages.slice(1)) {
      expect(IdentifyMessage.encode(subsequent).length)
        .to.be.lessThanOrEqual(SUBSEQUENT_IDENTIFY_MESSAGE_MAX_SIZE)
    }

    // Every address must appear in exactly one message
    const allAddrs = messages.flatMap(m => m.listenAddrs)
    expect(allAddrs).to.have.lengthOf(listenAddrs.length)

    // Scalar fields only in first message
    expect(messages[0].protocolVersion).to.equal('1.0.0')
    for (const subsequent of messages.slice(1)) {
      expect(subsequent.protocolVersion).to.be.undefined()
    }
  })

  it('returns a single message when signedPeerRecord and addresses together fit within 2 KB', () => {
    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      signedPeerRecord: new Uint8Array(100).fill(1),
      listenAddrs: [multiaddr('/ip4/1.2.3.4/tcp/1234').bytes],
      protocols: ['/foo/1.0']
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages).to.have.lengthOf(1)
    expect(messages[0].signedPeerRecord).to.deep.equal(msg.signedPeerRecord)
    expect(messages[0].listenAddrs).to.have.lengthOf(1)
  })

  it('includes at least one address in the first message even when signedPeerRecord is large', () => {
    // A signedPeerRecord large enough that scalar fields alone exceed 2 KB,
    // which would prevent any addresses from fitting without special handling.
    const largeSignedPeerRecord = new Uint8Array(2048).fill(1)

    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      agentVersion: 'test/1.0',
      signedPeerRecord: largeSignedPeerRecord,
      listenAddrs: [multiaddr('/ip4/1.2.3.4/tcp/1234').bytes, ...manyPrivateAddrs(10)],
      protocols: ['/foo/1.0']
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages[0].listenAddrs.length).to.be.greaterThan(0, 'first message must contain at least one address')

    const allAddrs = messages.flatMap(m => m.listenAddrs)
    expect(allAddrs).to.have.lengthOf(msg.listenAddrs.length)
  })

  it('places public addresses before private addresses', () => {
    const publicAddr = multiaddr('/ip4/1.2.3.4/tcp/1234').bytes
    // Put the public address at the end of a large list of private ones
    const listenAddrs = [...manyPrivateAddrs(300), publicAddr]

    const msg: IdentifyMessage = {
      listenAddrs,
      protocols: []
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages.length).to.be.greaterThan(1, 'expected message to be split')

    // Public address must appear in the first message
    const firstMessageAddrs = messages[0].listenAddrs.map(a => multiaddr(a).toString())
    expect(firstMessageAddrs).to.include('/ip4/1.2.3.4/tcp/1234', 'public address not in first message')
  })

  it('puts scalar fields only in the first message', () => {
    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      agentVersion: 'test/1.0',
      observedAddr: multiaddr('/ip4/5.6.7.8/tcp/9000').bytes,
      listenAddrs: manyPrivateAddrs(300),
      protocols: []
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages.length).to.be.greaterThan(1, 'expected message to be split')

    expect(messages[0].protocolVersion).to.equal('1.0.0')
    expect(messages[0].agentVersion).to.equal('test/1.0')
    expect(messages[0].observedAddr).to.deep.equal(multiaddr('/ip4/5.6.7.8/tcp/9000').bytes)

    for (const subsequent of messages.slice(1)) {
      expect(subsequent.protocolVersion).to.be.undefined()
      expect(subsequent.agentVersion).to.be.undefined()
      expect(subsequent.observedAddr).to.be.undefined()
    }
  })

  it('puts signedPeerRecord in the first message', () => {
    const signedPeerRecord = new Uint8Array(100).fill(1)

    const msg: IdentifyMessage = {
      signedPeerRecord,
      listenAddrs: manyPrivateAddrs(300),
      protocols: []
    }

    const messages = buildIdentifyMessages(msg)

    expect(messages.length).to.be.greaterThan(1, 'expected message to be split')
    expect(messages[0].signedPeerRecord).to.deep.equal(signedPeerRecord)

    for (const subsequent of messages.slice(1)) {
      expect(subsequent.signedPeerRecord).to.be.undefined()
    }
  })
})

describe('mergeIdentifyMessages', () => {
  it('returns a single message unchanged', () => {
    const msg: IdentifyMessage = {
      protocolVersion: '1.0.0',
      listenAddrs: [multiaddr('/ip4/1.2.3.4/tcp/1234').bytes],
      protocols: ['/foo/1.0']
    }

    const merged = mergeIdentifyMessages([msg])

    expect(merged.protocolVersion).to.equal('1.0.0')
    expect(merged.listenAddrs).to.have.lengthOf(1)
    expect(merged.protocols).to.deep.equal(['/foo/1.0'])
  })

  it('later scalar fields override earlier ones', () => {
    const first: IdentifyMessage = {
      listenAddrs: [],
      protocols: [],
      protocolVersion: 'old-proto',
      agentVersion: 'old-agent'
    }
    const second: IdentifyMessage = {
      listenAddrs: [],
      protocols: [],
      protocolVersion: 'new-proto',
      agentVersion: 'new-agent'
    }

    const merged = mergeIdentifyMessages([first, second])

    expect(merged.protocolVersion).to.equal('new-proto')
    expect(merged.agentVersion).to.equal('new-agent')
  })

  it('appends listenAddrs from subsequent messages', () => {
    const addr1 = multiaddr('/ip4/1.2.3.4/tcp/1234').bytes
    const addr2 = multiaddr('/ip4/5.6.7.8/tcp/5678').bytes
    const first: IdentifyMessage = { listenAddrs: [addr1], protocols: [] }
    const second: IdentifyMessage = { listenAddrs: [addr2], protocols: [] }

    const merged = mergeIdentifyMessages([first, second])

    expect(merged.listenAddrs).to.have.lengthOf(2)
  })

  it('deduplicates protocols across messages', () => {
    const first: IdentifyMessage = { listenAddrs: [], protocols: ['/foo/1.0', '/bar/1.0'] }
    const second: IdentifyMessage = { listenAddrs: [], protocols: ['/bar/1.0', '/baz/1.0'] }

    const merged = mergeIdentifyMessages([first, second])

    expect(merged.protocols).to.deep.equal(['/foo/1.0', '/bar/1.0', '/baz/1.0'])
  })

  it('later signedPeerRecord overrides earlier', () => {
    const record1 = new Uint8Array(10).fill(1)
    const record2 = new Uint8Array(10).fill(2)
    const first: IdentifyMessage = { listenAddrs: [], protocols: [], signedPeerRecord: record1 }
    const second: IdentifyMessage = { listenAddrs: [], protocols: [], signedPeerRecord: record2 }

    const merged = mergeIdentifyMessages([first, second])

    expect(merged.signedPeerRecord).to.deep.equal(record2)
  })

  it('missing scalar fields in later messages do not clear earlier values', () => {
    const first: IdentifyMessage = {
      listenAddrs: [],
      protocols: [],
      protocolVersion: '1.0.0',
      agentVersion: 'agent/1.0'
    }
    const second: IdentifyMessage = { listenAddrs: [], protocols: [] }

    const merged = mergeIdentifyMessages([first, second])

    expect(merged.protocolVersion).to.equal('1.0.0')
    expect(merged.agentVersion).to.equal('agent/1.0')
  })
})
