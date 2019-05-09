'use strict'

const OS = require('os')
const assert = require('assert')
const MDNS = require('multicast-dns')
const log = require('debug')('libp2p:mdns:compat:responder')
const TCP = require('libp2p-tcp')
const nextTick = require('async/nextTick')
const { SERVICE_TAG_LOCAL } = require('./constants')

const tcp = new TCP()

class Responder {
  constructor (peerInfo) {
    assert(peerInfo, 'missing peerInfo parameter')
    this._peerInfo = peerInfo
    this._peerIdStr = peerInfo.id.toB58String()
    this._onQuery = this._onQuery.bind(this)
  }

  start (callback) {
    this._mdns = MDNS()
    this._mdns.on('query', this._onQuery)
    nextTick(() => callback())
  }

  _onQuery (event, info) {
    const multiaddrs = tcp.filter(this._peerInfo.multiaddrs.toArray())
    // Only announce TCP for now
    if (!multiaddrs.length) return

    const questions = event.questions || []

    // Only respond to queries for our service tag
    if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return

    log('got query', event, info)

    const answers = []
    const peerServiceTagLocal = `${this._peerIdStr}.${SERVICE_TAG_LOCAL}`

    answers.push({
      name: SERVICE_TAG_LOCAL,
      type: 'PTR',
      class: 'IN',
      ttl: 120,
      data: peerServiceTagLocal
    })

    // Only announce TCP multiaddrs for now
    const port = multiaddrs[0].toString().split('/')[4]

    answers.push({
      name: peerServiceTagLocal,
      type: 'SRV',
      class: 'IN',
      ttl: 120,
      data: {
        priority: 10,
        weight: 1,
        port,
        target: OS.hostname()
      }
    })

    answers.push({
      name: peerServiceTagLocal,
      type: 'TXT',
      class: 'IN',
      ttl: 120,
      data: [Buffer.from(this._peerIdStr)]
    })

    multiaddrs.forEach((ma) => {
      const proto = ma.protoNames()[0]
      if (proto === 'ip4' || proto === 'ip6') {
        answers.push({
          name: OS.hostname(),
          type: proto === 'ip4' ? 'A' : 'AAAA',
          class: 'IN',
          ttl: 120,
          data: ma.toString().split('/')[2]
        })
      }
    })

    log('responding to query', answers)
    this._mdns.respond(answers, info)
  }

  stop (callback) {
    this._mdns.removeListener('query', this._onQuery)
    this._mdns.destroy(callback)
  }
}

module.exports = Responder
