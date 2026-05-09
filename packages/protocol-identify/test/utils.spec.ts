import { Buffer } from 'node:buffer'
import { UnexpectedEOFError } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import { isEofLike, mergeIdentifyMessages } from '../src/utils.js'
import type { Stream } from '@libp2p/interface'

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

  it('deduplicates listenAddrs across messages', () => {
    const addr1 = multiaddr('/ip4/1.2.3.4/tcp/4001').bytes
    const addr2 = multiaddr('/ip4/5.6.7.8/tcp/4001').bytes

    const merged = mergeIdentifyMessages([
      {
        listenAddrs: [addr1, addr2],
        protocols: []
      },
      {
        listenAddrs: [addr1, addr1, addr2],
        protocols: []
      }
    ])

    expect(merged.listenAddrs).to.have.lengthOf(2)
    const hex = merged.listenAddrs.map(b => Buffer.from(b).toString('hex'))
    expect(new Set(hex).size).to.equal(2)
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

describe('isEofLike', () => {
  it('returns true for UnexpectedEOFError', () => {
    const err = new UnexpectedEOFError('eof')
    const stream = { remoteWriteStatus: 'writable' } as any as Stream
    expect(isEofLike(err, stream)).to.be.true()
  })

  it('returns true when remote write side is no longer writable', () => {
    const err = new Error('reset')
    const stream = { remoteWriteStatus: 'closed' } as any as Stream
    expect(isEofLike(err, stream)).to.be.true()
  })

  it('returns false for non-eof errors when stream is still writable', () => {
    const err = new Error('parse error')
    const stream = { remoteWriteStatus: 'writable' } as any as Stream
    expect(isEofLike(err, stream)).to.be.false()
  })
})
