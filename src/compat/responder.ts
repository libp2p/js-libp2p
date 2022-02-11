import OS from 'os'
import MDNS, { QueryPacket } from 'multicast-dns'
import { logger } from '@libp2p/logger'
import { SERVICE_TAG_LOCAL } from './constants.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Multiaddr, MultiaddrObject } from '@multiformats/multiaddr'
import { base58btc } from 'multiformats/bases/base58'
import type { RemoteInfo } from 'dgram'
import type { Answer } from 'dns-packet'

const log = logger('libp2p:mdns:compat:responder')

export interface ResponderOptions {
  peerId: PeerId
  multiaddrs: Multiaddr[]
}

export class Responder {
  private readonly _peerIdStr: string
  private readonly _multiaddrs: Multiaddr[]
  private _mdns?: MDNS.MulticastDNS

  constructor (options: ResponderOptions) {
    const { peerId, multiaddrs } = options

    if (peerId == null) {
      throw new Error('missing peerId parameter')
    }

    this._peerIdStr = peerId.toString(base58btc)
    this._multiaddrs = multiaddrs
    this._onQuery = this._onQuery.bind(this)
  }

  start () {
    this._mdns = MDNS()
    this._mdns.on('query', this._onQuery)
  }

  _onQuery (event: QueryPacket, info: RemoteInfo) {
    const addresses = this._multiaddrs.reduce<MultiaddrObject[]>((acc, addr) => {
      if (addr.isThinWaistAddress()) {
        acc.push(addr.toOptions())
      }
      return acc
    }, [])

    // Only announce TCP for now
    if (addresses.length === 0) {
      return
    }

    const questions = event.questions ?? []

    // Only respond to queries for our service tag
    if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return

    log('got query', event, info)

    const answers: Answer[] = []
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

    if (this._mdns != null) {
      log('responding to query', answers)
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
