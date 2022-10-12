import OS from 'os'
import MDNS, { QueryPacket } from 'multicast-dns'
import { logger } from '@libp2p/logger'
import { SERVICE_TAG_LOCAL } from './constants.js'
import { MultiaddrObject, protocols } from '@multiformats/multiaddr'
import type { RemoteInfo } from 'dgram'
import type { Answer } from 'dns-packet'
import type { MulticastDNSComponents } from '../index.js'

const log = logger('libp2p:mdns:compat:responder')

export class Responder {
  private readonly components: MulticastDNSComponents
  private _mdns?: MDNS.MulticastDNS

  constructor (components: MulticastDNSComponents) {
    this.components = components
    this._onQuery = this._onQuery.bind(this)
  }

  start () {
    this._mdns = MDNS()
    this._mdns.on('query', this._onQuery)
  }

  _onQuery (event: QueryPacket, info: RemoteInfo) {
    const addresses = this.components.addressManager.getAddresses().reduce<MultiaddrObject[]>((acc, addr) => {
      addr = addr.decapsulateCode(protocols('p2p').code)

      if (addr.isThinWaistAddress()) {
        acc.push(addr.toOptions())
      }

      return acc
    }, [])

    // Only announce TCP for now
    if (addresses.length === 0) {
      log('no tcp addresses configured so cannot respond to mDNS query')
      return
    }

    const questions = event.questions ?? []

    // Only respond to queries for our service tag
    if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return

    log.trace('got query', event, info)

    const answers: Answer[] = []
    const peerServiceTagLocal = `${this.components.peerId.toString()}.${SERVICE_TAG_LOCAL}`

    answers.push({
      name: SERVICE_TAG_LOCAL,
      type: 'PTR',
      class: 'IN',
      ttl: 120,
      data: peerServiceTagLocal
    })

    answers.push({
      name: peerServiceTagLocal,
      type: 'TXT',
      class: 'IN',
      ttl: 120,
      data: [Buffer.from(this.components.peerId.toString())]
    })

    addresses.forEach(ma => {
      if (![4, 6].includes(ma.family)) {
        return
      }

      answers.push({
        name: peerServiceTagLocal,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: ma.port,
          target: OS.hostname()
        }
      })

      answers.push({
        name: OS.hostname(),
        type: ma.family === 4 ? 'A' : 'AAAA',
        class: 'IN',
        ttl: 120,
        data: ma.host
      })
    })

    if (this._mdns != null) {
      log.trace('responding to query')
      log.trace('query answers', answers)

      this._mdns.respond(answers, info)
    }
  }

  stop () {
    if (this._mdns != null) {
      this._mdns.removeListener('query', this._onQuery)
      return new Promise<void>(resolve => {
        if (this._mdns != null) {
          this._mdns.destroy(resolve)
        } else {
          resolve()
        }
      })
    }
  }
}
