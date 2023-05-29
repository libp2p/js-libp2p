import { setMaxListeners } from 'events'
import { logger } from '@libp2p/logger'
import { type AbortOptions, multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { type ClearableSignal, anySignal } from 'any-signal'
import { array, number, object, string } from 'yup'

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

export const validateConnectionManagerConfig = (opts: any): any => {
  const validateMultiaddr = (value: Array<string | undefined> | undefined): boolean => {
    value?.forEach((addr) => {
      try {
        multiaddr(addr)
      } catch (err) {
        throw new Error(`invalid multiaddr: ${addr}`)
      }
    })
    return true
  }

  return object({
    maxConnections: number().min(opts.minConnections).integer().default(300).optional(),
    minConnections: number().min(0).integer().default(50).optional().max(opts.maxConnections),
    autoDialInterval: number().min(0).integer().optional(),
    autoDialConcurrency: number().min(0).integer().optional(),
    autoDialPriority: number().min(0).integer().optional(),
    maxParallelDials: number().min(0).integer().optional(),
    maxParallelDialsPerPeer: number().min(opts.autoDialConcurrency).optional(),
    maxPeerAddrsToDialed: number().min(0).integer().optional(),
    dialTimeout: number().min(0).integer().optional(),
    inboundUpgradeTimeout: number().integer().optional(),
    allow: array().of(string()).test('is multiaddr', validateMultiaddr).optional(),
    deny: array().of(string()).test('is multiaddr', validateMultiaddr).optional(),
    inboundConnectionThreshold: number().default(5).max(opts.maxConnections).integer().optional(),
    maxIncomingPendingConnections: number().integer().max(opts.maxConnections).optional()
  })
}
