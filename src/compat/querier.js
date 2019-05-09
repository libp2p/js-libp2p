'use strict'

const assert = require('assert')
const EE = require('events')
const MDNS = require('multicast-dns')
const Multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const nextTick = require('async/nextTick')
const log = require('debug')('libp2p:mdns:compat:querier')
const { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } = require('./constants')

class Querier extends EE {
  constructor (peerId, options) {
    super()
    assert(peerId, 'missing peerId parameter')
    options = options || {}
    this._peerIdStr = peerId.toB58String()
    // Re-query every 60s, in leu of network change detection
    options.queryInterval = options.queryInterval || 60000
    // Time for which the MDNS server will stay alive waiting for responses
    // Must be less than options.queryInterval!
    options.queryPeriod = Math.min(
      options.queryInterval,
      options.queryPeriod == null ? 5000 : options.queryPeriod
    )
    this._options = options
    this._onResponse = this._onResponse.bind(this)
  }

  start (callback) {
    this._handle = periodically(() => {
      // Create a querier that queries multicast but gets responses unicast
      const mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

      mdns.on('response', this._onResponse)

      mdns.query({
        id: nextId(), // id > 0 for unicast response
        questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
      }, null, {
        address: MULTICAST_IP,
        port: MULTICAST_PORT
      })

      return {
        stop: callback => {
          mdns.removeListener('response', this._onResponse)
          mdns.destroy(callback)
        }
      }
    }, {
      period: this._options.queryPeriod,
      interval: this._options.queryInterval
    })

    nextTick(() => callback())
  }

  _onResponse (event, info) {
    const answers = event.answers || []
    const ptrRecord = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TAG_LOCAL)

    // Only deal with responses for our service tag
    if (!ptrRecord) return

    log('got response', event, info)

    const txtRecord = answers.find(a => a.type === 'TXT')
    if (!txtRecord) return log('missing TXT record in response')

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
      peerId = PeerId.createFromB58String(peerIdStr)
    } catch (err) {
      return log('failed to create peer ID from TXT record data', peerIdStr, err)
    }

    PeerInfo.create(peerId, (err, info) => {
      if (err) return log('failed to create peer info from peer ID', peerId, err)

      const srvRecord = answers.find(a => a.type === 'SRV')
      if (!srvRecord) return log('missing SRV record in response')

      log('peer found', peerIdStr)

      const { port } = srvRecord.data || {}
      const protos = { A: 'ip4', AAAA: 'ip6' }

      const multiaddrs = answers
        .filter(a => ['A', 'AAAA'].includes(a.type))
        .reduce((addrs, a) => {
          const maStr = `/${protos[a.type]}/${a.data}/tcp/${port}`
          try {
            addrs.push(new Multiaddr(maStr))
            log(maStr)
          } catch (err) {
            log(`failed to create multiaddr from ${a.type} record data`, maStr, port, err)
          }
          return addrs
        }, [])

      multiaddrs.forEach(addr => info.multiaddrs.add(addr))
      this.emit('peer', info)
    })
  }

  stop (callback) {
    this._handle.stop(callback)
  }
}

module.exports = Querier

/**
 * Run `fn` for a certain period of time, and then wait for an interval before
 * running it again. `fn` must return an object with a stop function, which is
 * called when the period expires.
 *
 * @param {Function} fn function to run
 * @param {Object} [options]
 * @param {Object} [options.period] Period in ms to run the function for
 * @param {Object} [options.interval] Interval in ms between runs
 * @returns {Object} handle that can be used to stop execution
 */
function periodically (fn, options) {
  let handle, timeoutId
  let stopped = false

  const reRun = () => {
    handle = fn()
    timeoutId = setTimeout(() => {
      handle.stop(err => {
        if (err) log(err)
        if (!stopped) {
          timeoutId = setTimeout(reRun, options.interval)
        }
      })
      handle = null
    }, options.period)
  }

  reRun()

  return {
    stop (callback) {
      stopped = true
      clearTimeout(timeoutId)
      if (handle) {
        handle.stop(callback)
      } else {
        callback()
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
