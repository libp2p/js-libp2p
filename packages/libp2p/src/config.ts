import { FaultTolerance, InvalidParametersError } from '@libp2p/interface'
import { isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import { array, boolean, custom, getDotPath, gtValue, looseObject, minValue, number, optional, picklist, pipe, safeParse, string } from 'valibot'
import type { Libp2pInit } from './index.ts'
import type { ServiceMap } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * A Multiaddr instance, or a string that parses as one
 */
const multiaddrInput = custom<Multiaddr | string>((value) => {
  if (isMultiaddr(value)) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  try {
    multiaddr(value)
    return true
  } catch {
    return false
  }
}, (issue) => `is not a valid multiaddr: ${String(issue.input)}`)

const addressList = optional(array(multiaddrInput))
const nonNegative = optional(pipe(number(), minValue(0, 'must be greater than or equal to 0')))

/**
 * Validates the parts of the config that this module consumes directly.
 * Unknown keys are allowed so that services and other modules can carry their
 * own options.
 */
const configSchema = looseObject({
  addresses: optional(looseObject({
    listen: addressList,
    announce: addressList,
    noAnnounce: addressList,
    appendAnnounce: addressList,
    maxObservedAddresses: nonNegative,
    addressVerificationTTL: nonNegative,
    addressVerificationRetry: nonNegative
  })),
  connectionManager: optional(looseObject({
    maxConnections: optional(pipe(number(), gtValue(0, 'must be greater than 0'))),
    maxParallelDials: nonNegative,
    maxDialQueueLength: nonNegative,
    maxPeerAddrsToDial: nonNegative,
    dialTimeout: nonNegative,
    addressDialTimeout: nonNegative,
    connectionCloseTimeout: nonNegative,
    inboundUpgradeTimeout: nonNegative,
    outboundStreamProtocolNegotiationTimeout: nonNegative,
    inboundStreamProtocolNegotiationTimeout: nonNegative,
    inboundConnectionThreshold: nonNegative,
    maxIncomingPendingConnections: nonNegative,
    reconnectRetries: nonNegative,
    reconnectRetryInterval: nonNegative,
    reconnectBackoffFactor: nonNegative,
    maxParallelReconnects: nonNegative,
    allow: addressList,
    deny: addressList
  })),
  connectionMonitor: optional(looseObject({
    enabled: optional(boolean()),
    pingInterval: nonNegative,
    abortConnectionOnPingFailure: optional(boolean()),
    protocolPrefix: optional(string())
  })),
  transportManager: optional(looseObject({
    faultTolerance: optional(picklist([FaultTolerance.FATAL_ALL, FaultTolerance.NO_FATAL], 'must be FaultTolerance.FATAL_ALL or FaultTolerance.NO_FATAL'))
  }))
})

export async function validateConfig <T extends ServiceMap = Record<string, unknown>> (opts: Libp2pInit<T>): Promise<Libp2pInit<T>> {
  const result = safeParse(configSchema, opts)

  if (!result.success) {
    const issue = result.issues[0]
    throw new InvalidParametersError(`Invalid libp2p config: ${getDotPath(issue) ?? 'options'} ${issue.message}`)
  }

  if (opts.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) {
    throw new InvalidParametersError('Private network is enforced, but no protector was provided')
  }

  return opts
}
