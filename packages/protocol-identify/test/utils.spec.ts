import { defaultLogger } from '@libp2p/logger'
import { streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { Identify as IdentifyMessage } from '../src/pb/message.ts'
import { mergeIdentifyMessages, readIdentifyMessages } from '../src/utils.ts'

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

describe('readIdentifyMessages', () => {
  const log = defaultLogger().forComponent('test')

  function encodeAll (msgs: IdentifyMessage[]): Uint8Array {
    const parts = msgs.map(m => lp.encode.single(IdentifyMessage.encode(m)).subarray())
    const total = parts.reduce((n, p) => n + p.byteLength, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const p of parts) { out.set(p, off); off += p.byteLength }
    return out
  }

  it('returns all messages sent before clean EOF', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const msgs: IdentifyMessage[] = [
      { listenAddrs: [], protocols: ['/a/1.0'] },
      { listenAddrs: [], protocols: ['/b/1.0'] }
    ]
    incomingStream.send(encodeAll(msgs))
    void incomingStream.close()

    const result = await readIdentifyMessages(outgoingStream, 8192, {}, log)
    expect(result).to.have.lengthOf(2)
    expect(result[0].protocols).to.deep.equal(['/a/1.0'])
    expect(result[1].protocols).to.deep.equal(['/b/1.0'])
  })

  it('throws when stream closes without any messages', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    void incomingStream.close()

    await expect(readIdentifyMessages(outgoingStream, 8192, {}, log))
      .to.eventually.be.rejected()
      .with.property('name', 'UnexpectedEOFError')
  })

  it('stops at MAX_IDENTIFY_MESSAGES even if more were sent', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const msgs: IdentifyMessage[] = []
    for (let i = 0; i < 11; i++) {
      msgs.push({ listenAddrs: [], protocols: [`/test/${i}/1.0`] })
    }
    incomingStream.send(encodeAll(msgs))
    void incomingStream.close()

    const result = await readIdentifyMessages(outgoingStream, 8192, {}, log)
    expect(result).to.have.lengthOf(10)
    expect(result.map(m => m.protocols[0])).to.not.include('/test/10/1.0')
  })

  it('returns partial data when a read fails after at least one success', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const valid: IdentifyMessage = { listenAddrs: [], protocols: ['/foo/1.0'] }
    const encodedValid = lp.encode.single(IdentifyMessage.encode(valid)).subarray()
    // varint length prefix that promises far more bytes than provided — pb.read on
    // iteration 2 will block until the abort signal fires.
    const garbage = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x07])
    const combined = new Uint8Array(encodedValid.byteLength + garbage.byteLength)
    combined.set(encodedValid)
    combined.set(garbage, encodedValid.byteLength)
    incomingStream.send(combined)

    const result = await readIdentifyMessages(outgoingStream, 8192, { signal: AbortSignal.timeout(500) }, log)
    expect(result).to.have.lengthOf(1)
    expect(result[0].protocols).to.deep.equal(['/foo/1.0'])
  })

  it('preserves messages and aborts the stream when close() throws', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const msg: IdentifyMessage = { listenAddrs: [], protocols: ['/foo/1.0'] }
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(msg)).subarray())
    void incomingStream.close()

    let aborted = false
    const originalAbort = outgoingStream.abort.bind(outgoingStream)
    outgoingStream.abort = (err: Error) => {
      aborted = true
      originalAbort(err)
    }

    const originalClose = outgoingStream.close.bind(outgoingStream)
    outgoingStream.close = async (...args: any[]) => {
      await originalClose(...args)
      throw Object.assign(new Error('simulated close failure'), { name: 'StreamStateError' })
    }

    const result = await readIdentifyMessages(outgoingStream, 8192, {}, log)
    expect(result).to.have.lengthOf(1)
    expect(result[0].protocols).to.deep.equal(['/foo/1.0'])
    expect(aborted).to.be.true()
  })
})
