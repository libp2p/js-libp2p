export interface DecodeRPCLimits {
  maxSubscriptions: number
  maxMessages: number
  maxIhaveMessageIDs: number
  maxIwantMessageIDs: number
  maxIdontwantMessageIDs: number
  maxControlMessages: number
  maxPeerInfos: number
  maxPartialMessageSize: number
}

export const defaultDecodeRpcLimits: DecodeRPCLimits = {
  maxSubscriptions: Infinity,
  maxMessages: Infinity,
  maxIhaveMessageIDs: Infinity,
  maxIwantMessageIDs: Infinity,
  maxIdontwantMessageIDs: Infinity,
  maxControlMessages: Infinity,
  maxPeerInfos: Infinity,
  // Unlike the limits above, which cap repeated-field counts at decode time,
  // this one is enforced after decode in handleReceivedPartial: protobuf
  // `bytes` fields have no length limit in the codec, so there is nothing to
  // pass through to RPC.decode. The decode-time backstop for an oversized
  // payload is `maxInboundDataLength`, which bounds the whole RPC frame.
  //
  // Finite by default so a peer cannot push unbounded partial payloads at a
  // node that never configured a limit. 1 MiB is far above the ~2 KiB cells
  // the extension exists to carry, while still bounding the damage.
  maxPartialMessageSize: 1024 * 1024
}
