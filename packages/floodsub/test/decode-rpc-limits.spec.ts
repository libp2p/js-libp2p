import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import * as lp from 'it-length-prefixed'
import pWaitFor from 'p-wait-for'
import { MaxLengthError } from 'protons-runtime'
import { stubInterface } from 'sinon-ts'
import { createRPCDecodeLimits } from '../src/decodeRpc.ts'
import { FloodSub } from '../src/floodsub.ts'
import { StrictNoSign } from '../src/index.ts'
import { RPC } from '../src/message/rpc.ts'
import { PeerStreams } from '../src/peer-streams.ts'
import type { PubSubRPC } from '../src/floodsub.ts'
import type { Connection, PeerId, Stream } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

// small limits so the crafted frames stay tiny. the two caps use distinct
// values so a transposed subscriptions/messages mapping cannot pass the tests
const limits = createRPCDecodeLimits({
  maxSubscriptions: 4,
  maxMessages: 2
})

function subscriptions (n: number): RPC {
  return {
    subscriptions: Array.from({ length: n }, (_, i) => ({ subscribe: true, topic: `t${i}` })),
    messages: []
  }
}

function messages (n: number): RPC {
  return {
    subscriptions: [],
    messages: Array.from({ length: n }, () => ({ data: new Uint8Array(0) }))
  }
}

describe('decode rpc limits', () => {
  describe('enforcement', () => {
    it('rejects an RPC with more subscriptions than the limit', () => {
      expect(() => RPC.decode(RPC.encode(subscriptions(5)), { limits })).to.throw(MaxLengthError)
    })

    it('rejects an RPC with more messages than the limit', () => {
      expect(() => RPC.decode(RPC.encode(messages(3)), { limits })).to.throw(MaxLengthError)
    })

    it('accepts subscriptions at the limit', () => {
      expect(() => RPC.decode(RPC.encode(subscriptions(4)), { limits })).to.not.throw()
    })

    it('accepts messages at the limit', () => {
      expect(() => RPC.decode(RPC.encode(messages(2)), { limits })).to.not.throw()
    })

    it('skips an unknown control block (field 3) instead of decoding it', () => {
      // floodsub no longer defines field 3 (gossipsub's ControlMessage), so a
      // frame carrying one must be skipped as an unknown field, not decoded
      const base = RPC.encode({ subscriptions: [{ subscribe: true, topic: 'a' }], messages: [] })
      // field 3, wire type 2 (length-delimited), 5-byte payload
      const controlField = Uint8Array.from([0x1a, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00])
      const frame = new Uint8Array(base.length + controlField.length)
      frame.set(base)
      frame.set(controlField, base.length)

      const decoded = RPC.decode(frame)
      expect(decoded.subscriptions).to.have.lengthOf(1)
      expect(decoded).to.not.have.property('control')
    })
  })

  describe('inbound stream wiring', () => {
    let remotePeerId: PeerId

    beforeEach(async () => {
      remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    })

    async function receive (rpc: RPC): Promise<PubSubRPC[]> {
      const [outbound, inbound] = await streamPair()
      const peer = new PeerStreams(remotePeerId)
      const received: PubSubRPC[] = []

      peer.addEventListener('message', (evt) => {
        received.push(evt.detail)
      })
      peer.attachInboundStream(inbound, undefined, limits)

      outbound.send(lp.encode.single(RPC.encode(rpc)))
      await outbound.close()

      return received
    }

    it('does not dispatch an oversized frame - limits are applied on read', async () => {
      const received = await receive(subscriptions(5))

      // decode throws, the read loop aborts the stream, nothing is dispatched
      await delay(200)
      expect(received).to.have.lengthOf(0)
    })

    it('dispatches a frame that is within the limits', async () => {
      const received = await receive(subscriptions(4))

      await pWaitFor(() => received.length === 1)
      expect(received).to.have.lengthOf(1)
    })
  })
})

describe('floodsub decode-limits integration', () => {
  let pubsub: FloodSub
  let registrar: StubbedInstance<Registrar>

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    registrar = stubInterface()

    // no decodeRpcLimits passed, so FloodSub must wire up the defaults itself
    pubsub = new FloodSub({
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      registrar,
      logger: defaultLogger()
    }, {
      globalSignaturePolicy: StrictNoSign
    })

    await start(pubsub)
  })

  afterEach(async () => {
    await stop(pubsub)
  })

  it('applies default limits and drops a peer that sends an over-limit frame', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [outbound, inbound] = await streamPair()

    // subscription-change is the honest signal that the frame was decoded: it
    // fires from processRpc, and unlike pubsub.topics it survives _removePeer's
    // topic cleanup, so it still reads as non-zero after the peer is torn down
    let subChanges = 0
    pubsub.addEventListener('subscription-change', () => { subChanges++ })

    const connection = stubInterface<Connection>({ remotePeer })
    ;(pubsub as unknown as { _onIncomingStream(stream: Stream, connection: Connection): void })
      ._onIncomingStream(inbound, connection)
    expect(pubsub.getPeers().some(p => p.equals(remotePeer)), 'peer was not added').to.be.true()

    // exceed the default maxSubscriptions (5000)
    const oversized: RPC = {
      subscriptions: Array.from({ length: 5001 }, (_, i) => ({ subscribe: true, topic: `t${i}` })),
      messages: []
    }
    // the outbound stream is intentionally left open: the only thing that can
    // tear the peer down here is the decode limit firing, not an EOF from close
    outbound.send(lp.encode.single(RPC.encode(oversized)))

    // the over-limit frame is rejected at decode and the peer is torn down,
    // not left half-open with a dead inbound stream
    await pWaitFor(() => !pubsub.getPeers().some(p => p.equals(remotePeer)))
    // decode threw before processRpc ran, so none of the 5001 subscriptions
    // were processed
    expect(subChanges, 'over-limit frame was decoded and its subscriptions processed').to.equal(0)
  })
})
