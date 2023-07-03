import { setMaxListeners } from 'events'
import { logger } from '@libp2p/logger'
import { type AbortOptions, multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { type ClearableSignal, anySignal } from 'any-signal'
import { type ObjectSchema, array, number, object, string } from 'yup'
import { validateMultiaddr } from '../config/helpers.js'
import { AUTO_DIAL_CONCURRENCY, AUTO_DIAL_INTERVAL, AUTO_DIAL_PRIORITY, DIAL_TIMEOUT, INBOUND_CONNECTION_THRESHOLD, INBOUND_UPGRADE_TIMEOUT, MAX_CONNECTIONS, MAX_INCOMING_PENDING_CONNECTIONS, MAX_PARALLEL_DIALS, MAX_PARALLEL_DIALS_PER_PEER, MAX_PEER_ADDRS_TO_DIAL, MIN_CONNECTIONS } from './constants.js'
import type { ConnectionManagerInit } from '.'

const log = logger('libp2p:connection-manager:utils')

/**
 * Resolve multiaddr recursively
 */
export async function resolveMultiaddrs (ma: Multiaddr, options: AbortOptions): Promise<Multiaddr[]> {
  // TODO: recursive logic should live in multiaddr once dns4/dns6 support is in place
  // Now only supporting resolve for dnsaddr
  const resolvableProto = ma.protoNames().includes('dnsaddr')

  // Multiaddr is not resolvable? End recursion!
  if (!resolvableProto) {
    return [ma]
  }

  const resolvedMultiaddrs = await resolveRecord(ma, options)
  const recursiveMultiaddrs = await Promise.all(resolvedMultiaddrs.map(async (nm) => {
    return resolveMultiaddrs(nm, options)
  }))

  const addrs = recursiveMultiaddrs.flat()
  const output = addrs.reduce<Multiaddr[]>((array, newM) => {
    if (array.find(m => m.equals(newM)) == null) {
      array.push(newM)
    }
    return array
  }, ([]))

  log('resolved %s to', ma, output.map(ma => ma.toString()))

  return output
}

/**
 * Resolve a given multiaddr. If this fails, an empty array will be returned
 */
async function resolveRecord (ma: Multiaddr, options: AbortOptions): Promise<Multiaddr[]> {
  try {
    ma = multiaddr(ma.toString()) // Use current multiaddr module
    const multiaddrs = await ma.resolve(options)
    return multiaddrs
  } catch (err) {
    log.error(`multiaddr ${ma.toString()} could not be resolved`, err)
    return []
  }
}

export function combineSignals (...signals: Array<AbortSignal | undefined>): ClearableSignal {
  const sigs: AbortSignal[] = []

  for (const sig of signals) {
    if (sig != null) {
      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, sig)
      } catch { }
      sigs.push(sig)
    }
  }

  // let any signal abort the dial
  const signal = anySignal(sigs)

  try {
    // fails on node < 15.4
    setMaxListeners?.(Infinity, signal)
  } catch {}

  return signal
}

export const validateConnectionManagerConfig = (opts: ConnectionManagerInit): ObjectSchema<Record<string, unknown>> => {
  return object({
    maxConnections: number().min(opts?.minConnections ?? MIN_CONNECTIONS, `maxConnections must be greater than the min connections limit: ${opts?.minConnections}`).integer().default(MAX_CONNECTIONS),
    minConnections: number().min(0).integer().max(opts?.maxConnections ?? MAX_CONNECTIONS, `minConnections must be less than the max connections limit: ${opts?.maxConnections}`).default(MIN_CONNECTIONS),
    autoDialInterval: number().min(0).integer().default(AUTO_DIAL_INTERVAL),
    autoDialConcurrency: number().min(0).integer().default(AUTO_DIAL_CONCURRENCY),
    autoDialPriority: number().min(0).integer().default(AUTO_DIAL_PRIORITY),
    maxParallelDials: number().min(0).integer().default(MAX_PARALLEL_DIALS),
    maxParallelDialsPerPeer: number().max(opts?.autoDialConcurrency ?? AUTO_DIAL_CONCURRENCY, `maxParallelDialsPerPeer must be less than the min auto dial conccurency limit: ${opts?.autoDialConcurrency}`).default(MAX_PARALLEL_DIALS_PER_PEER),
    maxPeerAddrsToDialed: number().min(0).integer().default(MAX_PEER_ADDRS_TO_DIAL),
    dialTimeout: number().min(0).integer().default(DIAL_TIMEOUT),
    inboundUpgradeTimeout: number().integer().default(INBOUND_UPGRADE_TIMEOUT),
    allow: array().of(string()).test('is multiaddr', validateMultiaddr).optional(),
    deny: array().of(string()).test('is multiaddr', validateMultiaddr).optional(),
    inboundConnectionThreshold: number().max(opts?.maxConnections ?? MAX_CONNECTIONS, `inboundConnectionThreshold must be less than the max connections limit: ${opts?.maxConnections}`).integer().default(INBOUND_CONNECTION_THRESHOLD),
    maxIncomingPendingConnections: number().integer().max(opts?.maxConnections ?? MAX_CONNECTIONS, `maxIncomingPendingConnections must be less than the max connections limit: ${opts?.maxConnections}`).default(MAX_INCOMING_PENDING_CONNECTIONS),
  })
}
