export interface DecodeRPCLimits {
  maxSubscriptions: number
  maxMessages: number
  maxIhaveMessageIDs: number
  maxIwantMessageIDs: number
  maxIdontwantMessageIDs: number
  maxControlMessages: number
  maxPeerInfos: number
}

export const defaultDecodeRpcLimits: DecodeRPCLimits = {
  maxSubscriptions: Infinity,
  maxMessages: Infinity,
  maxIhaveMessageIDs: Infinity,
  maxIwantMessageIDs: Infinity,
  maxIdontwantMessageIDs: Infinity,
  maxControlMessages: Infinity,
  maxPeerInfos: Infinity
}
