import type { IRPC, RPC } from './rpc.js'
import protobuf from 'protobufjs/minimal.js'

export type DecodeRPCLimits = {
  maxSubscriptions: number
  maxMessages: number
  maxIhaveMessageIDs: number
  maxIwantMessageIDs: number
  maxControlMessages: number
  maxPeerInfos: number
}

export const defaultDecodeRpcLimits: DecodeRPCLimits = {
  maxSubscriptions: Infinity,
  maxMessages: Infinity,
  maxIhaveMessageIDs: Infinity,
  maxIwantMessageIDs: Infinity,
  maxControlMessages: Infinity,
  maxPeerInfos: Infinity
}

/**
 * Copied code from src/message/rpc.cjs but with decode limits to prevent OOM attacks
 */
export function decodeRpc(bytes: Uint8Array, opts: DecodeRPCLimits): IRPC {
  // Mutate to use the option as stateful counter. Must limit the total count of messageIDs across all IWANT, IHAVE
  // else one count put 100 messageIDs into each 100 IWANT and "get around" the limit
  opts = { ...opts }

  const r = protobuf.Reader.create(bytes)
  const l = bytes.length

  const c = l === undefined ? r.len : r.pos + l
  const m: IRPC = {}
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        if (!(m.subscriptions && m.subscriptions.length)) m.subscriptions = []
        if (m.subscriptions.length < opts.maxSubscriptions) m.subscriptions.push(decodeSubOpts(r, r.uint32()))
        else r.skipType(t & 7)
        break
      case 2:
        if (!(m.messages && m.messages.length)) m.messages = []
        if (m.messages.length < opts.maxMessages) m.messages.push(decodeMessage(r, r.uint32()))
        else r.skipType(t & 7)
        break
      case 3:
        m.control = decodeControlMessage(r, r.uint32(), opts)
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeSubOpts(r: protobuf.Reader, l: number) {
  const c = l === undefined ? r.len : r.pos + l
  const m: RPC.ISubOpts = {}
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.subscribe = r.bool()
        break
      case 2:
        m.topic = r.string()
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeMessage(r: protobuf.Reader, l: number) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IMessage
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.from = r.bytes()
        break
      case 2:
        m.data = r.bytes()
        break
      case 3:
        m.seqno = r.bytes()
        break
      case 4:
        m.topic = r.string()
        break
      case 5:
        m.signature = r.bytes()
        break
      case 6:
        m.key = r.bytes()
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  if (!m.topic) throw Error("missing required 'topic'")
  return m
}

function decodeControlMessage(r: protobuf.Reader, l: number, opts: DecodeRPCLimits) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IControlMessage
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        if (!(m.ihave && m.ihave.length)) m.ihave = []
        if (m.ihave.length < opts.maxControlMessages) m.ihave.push(decodeControlIHave(r, r.uint32(), opts))
        else r.skipType(t & 7)
        break
      case 2:
        if (!(m.iwant && m.iwant.length)) m.iwant = []
        if (m.iwant.length < opts.maxControlMessages) m.iwant.push(decodeControlIWant(r, r.uint32(), opts))
        else r.skipType(t & 7)
        break
      case 3:
        if (!(m.graft && m.graft.length)) m.graft = []
        if (m.graft.length < opts.maxControlMessages) m.graft.push(decodeControlGraft(r, r.uint32()))
        else r.skipType(t & 7)
        break
      case 4:
        if (!(m.prune && m.prune.length)) m.prune = []
        if (m.prune.length < opts.maxControlMessages) m.prune.push(decodeControlPrune(r, r.uint32(), opts))
        else r.skipType(t & 7)
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeControlIHave(r: protobuf.Reader, l: number, opts: DecodeRPCLimits) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IControlIHave
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.topicID = r.string()
        break
      case 2:
        if (!(m.messageIDs && m.messageIDs.length)) m.messageIDs = []
        if (opts.maxIhaveMessageIDs-- > 0) m.messageIDs.push(r.bytes())
        else r.skipType(t & 7)
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeControlIWant(r: protobuf.Reader, l: number, opts: DecodeRPCLimits) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IControlIWant
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        if (!(m.messageIDs && m.messageIDs.length)) m.messageIDs = []
        if (opts.maxIwantMessageIDs-- > 0) m.messageIDs.push(r.bytes())
        else r.skipType(t & 7)
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeControlGraft(r: protobuf.Reader, l: number) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IControlGraft
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.topicID = r.string()
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodeControlPrune(r: protobuf.Reader, l: number, opts: DecodeRPCLimits) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IControlPrune
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.topicID = r.string()
        break
      case 2:
        if (!(m.peers && m.peers.length)) m.peers = []
        if (opts.maxPeerInfos-- > 0) m.peers.push(decodePeerInfo(r, r.uint32()))
        else r.skipType(t & 7)
        break
      case 3:
        m.backoff = r.uint64() as unknown as number
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}

function decodePeerInfo(r: protobuf.Reader, l: number) {
  const c = l === undefined ? r.len : r.pos + l
  const m = {} as RPC.IPeerInfo
  while (r.pos < c) {
    const t = r.uint32()
    switch (t >>> 3) {
      case 1:
        m.peerID = r.bytes()
        break
      case 2:
        m.signedPeerRecord = r.bytes()
        break
      default:
        r.skipType(t & 7)
        break
    }
  }
  return m
}
