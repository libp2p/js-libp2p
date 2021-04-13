'use strict'

const OS = require('os')
const MDNS = require('multicast-dns')
const log = require('debug')('libp2p:mdns:compat:responder')
const { SERVICE_TAG_LOCAL } = require('./constants')

class Responder {
  constructor ({ peerId, multiaddrs }) {
    if (!peerId) {
      throw new Error('missing peerId parameter')
    }

    this._peerId = peerId
    this._peerIdStr = peerId.toB58String()
    this._multiaddrs = multiaddrs
    this._onQuery = this._onQuery.bind(this)
  }

  start () {
    this._mdns = MDNS()
    this._mdns.on('query', this._onQuery)
  }

  _onQuery (event, info) {
    const addresses = this._multiaddrs.reduce((acc, addr) => {
      if (addr.isThinWaistAddress()) {
        acc.push(addr.toOptions())
      }
      return acc
    }, [])

    // Only announce TCP for now
    if (!addresses.length) return

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
    const port = addresses[0].port

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

    addresses.forEach((ma) => {
      if ([4, 6].includes(ma.family)) {
        answers.push({
          name: OS.hostname(),
          type: ma.family === 4 ? 'A' : 'AAAA',
          class: 'IN',
          ttl: 120,
          data: ma.host
        })
      }
    })

    log('responding to query', answers)
    this._mdns.respond(answers, info)
  }

  stop () {
    this._mdns.removeListener('query', this._onQuery)
    return new Promise(resolve => this._mdns.destroy(resolve))
  }
}

module.exports = Responder
