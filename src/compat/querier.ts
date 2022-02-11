import { EventEmitter } from '@libp2p/interfaces'
import MDNS from 'multicast-dns'
import { Multiaddr } from '@multiformats/multiaddr'
import { PeerId } from '@libp2p/peer-id'
import { logger } from '@libp2p/logger'
import { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } from './constants.js'
import { base58btc } from 'multiformats/bases/base58'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interfaces/peer-discovery'
import type { ResponsePacket } from 'multicast-dns'
import type { RemoteInfo } from 'dgram'

const log = logger('libp2p:mdns:compat:querier')

export interface QuerierOptions {
  peerId: PeerId
  queryInterval?: number
  queryPeriod?: number
}

export interface Handle {
  stop: () => Promise<void>
}

export class Querier extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  private readonly _peerIdStr: string
  private readonly _options: Required<QuerierOptions>
  private _handle?: Handle

  constructor (options: QuerierOptions) {
    super()

    const { peerId, queryInterval, queryPeriod } = options

    if (peerId == null) {
      throw new Error('missing peerId parameter')
    }

    this._peerIdStr = peerId.toString(base58btc)
    this._options = {
      peerId,

      // Re-query in leu of network change detection (every 60s by default)
      queryInterval: queryInterval ?? 60000,
      // Time for which the MDNS server will stay alive waiting for responses
      // Must be less than options.queryInterval!
      queryPeriod: Math.min(
        queryInterval ?? 60000,
        queryPeriod ?? 5000
      )
    }
    this._onResponse = this._onResponse.bind(this)
  }

  isStarted () {
    return Boolean(this._handle)
  }

  start () {
    this._handle = periodically(() => {
      // Create a querier that queries multicast but gets responses unicast
      const mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

      mdns.on('response', this._onResponse)

      // @ts-expect-error @types/multicast-dns are wrong
      mdns.query({
        id: nextId(), // id > 0 for unicast response
        questions: [{
          name: SERVICE_TAG_LOCAL,
          type: 'PTR',
          class: 'IN'
        }]
      }, null, {
        address: MULTICAST_IP,
        port: MULTICAST_PORT
      })

      return {
        stop: async () => {
          mdns.removeListener('response', this._onResponse)
          return await new Promise(resolve => mdns.destroy(resolve))
        }
      }
    }, {
      period: this._options.queryPeriod,
      interval: this._options.queryInterval
    })
  }

  _onResponse (event: ResponsePacket, info: RemoteInfo) {
    const answers = event.answers ?? []
    const ptrRecord = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TAG_LOCAL)

    // Only deal with responses for our service tag
    if (ptrRecord == null) return

    log('got response', event, info)

    const txtRecord = answers.find(a => a.type === 'TXT')
    if (txtRecord == null || txtRecord.type !== 'TXT') {
      return log('missing TXT record in response')
    }

    let peerIdStr
    try {
      peerIdStr = txtRecord.data[0].toString()
    } catch (err) {
      return log('failed to extract peer ID from TXT record data', txtRecord, err)
    }

    if (this._peerIdStr === peerIdStr) {
      return log('ignoring reply to myself')
    }

    let peerId
    try {
      peerId = PeerId.fromString(peerIdStr)
    } catch (err) {
      return log('failed to create peer ID from TXT record data', peerIdStr, err)
    }

    const srvRecord = answers.find(a => a.type === 'SRV')
    if (srvRecord == null || srvRecord.type !== 'SRV') {
      return log('missing SRV record in response')
    }

    log('peer found', peerIdStr)

    const { port } = srvRecord.data ?? {}
    const protos = { A: 'ip4', AAAA: 'ip6' }

    const multiaddrs = answers
      .filter(a => ['A', 'AAAA'].includes(a.type))
      .reduce<Multiaddr[]>((addrs, a) => {
      if (a.type !== 'A' && a.type !== 'AAAA') {
        return addrs
      }

      const maStr = `/${protos[a.type]}/${a.data}/tcp/${port}`
      try {
        addrs.push(new Multiaddr(maStr))
        log(maStr)
      } catch (err) {
        log(`failed to create multiaddr from ${a.type} record data`, maStr, port, err)
      }
      return addrs
    }, [])

    this.dispatchEvent(new CustomEvent('peer', {
      detail: {
        id: peerId,
        multiaddrs,
        protcols: []
      }
    }))
  }

  async stop () {
    if (this._handle != null) {
      await this._handle.stop()
    }
  }
}

/**
 * Run `fn` for a certain period of time, and then wait for an interval before
 * running it again. `fn` must return an object with a stop function, which is
 * called when the period expires.
 */
function periodically (fn: () => Handle, options: { period: number, interval: number }) {
  let handle: Handle | null
  let timeoutId: NodeJS.Timer
  let stopped = false

  const reRun = () => {
    handle = fn()
    timeoutId = setTimeout(() => {
      if (handle != null) {
        handle.stop().catch(log)
      }

      if (!stopped) {
        timeoutId = setTimeout(reRun, options.interval)
      }

      handle = null
    }, options.period)
  }

  reRun()

  return {
    async stop () {
      stopped = true
      clearTimeout(timeoutId)
      if (handle != null) {
        await handle.stop()
      }
    }
  }
}

const nextId = (() => {
  let id = 0
  return () => {
    id++
    if (id === Number.MAX_SAFE_INTEGER) id = 1
    return id
  }
})()
