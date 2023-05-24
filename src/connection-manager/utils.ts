import { setMaxListeners } from 'events'
import { logger } from '@libp2p/logger'
import { type AbortOptions, multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { type ClearableSignal, anySignal } from 'any-signal'
import { define, integer, max, min, number, object, type Struct } from 'superstruct'
import { type ConnectionManagerInit } from '.'

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

export const validateConnectionManagerConfig = (opts: ConnectionManagerInit): Struct<any, any> => {
  const minConnections = define('minConnections', (value: number) => {
    if (value < 0) {
      return false
    }

    if (value > opts.maxConnections) {
      return false
    }
    if (!Number.isInteger(value)) {
      return false
    }

    return true
  })

  const validateMultiaddr = define('allow', (value) => {
    value.forEach((addr) => {
      try {
        multiaddr(addr)
      } catch (err) {
        throw new Error(`invalid multiaddr: ${addr}`)
      }
    })
    return true
  })

  return object({
    maxConnections: min(integer(), opts.minConnections),
    minConnections,
    autoDialInterval: min(number(), 0),
    autoDialConcurrency: min(integer(), 0),
    autoDialPriority: min(integer(), 0),
    maxParallelDials: min(integer(), opts.autoDialConcurrency),
    maxParallelDialsPerPeer: min(integer(), opts.autoDialConcurrency),
    maxPeerAddrsToDialed: min(integer(), 0),
    dialTimeout: min(integer(), 0),
    inboundUpgradeTimeout: min(integer(), 0),
    allow: validateMultiaddr,
    deny: validateMultiaddr,
    inboundConnectionThreshold: max(integer(), opts.maxConnections),
    maxIncomingPendingConnections: max(integer(), opts.maxConnections)
  })
}
