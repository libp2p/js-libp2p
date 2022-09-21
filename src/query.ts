import os from 'os'
import { logger } from '@libp2p/logger'
import { protocols, multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr, MultiaddrObject } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { MulticastDNS, ResponsePacket, QueryPacket } from 'multicast-dns'
import type { SrvAnswer, StringAnswer, TxtAnswer, Answer } from 'dns-packet'

const log = logger('libp2p:mdns:query')

export function queryLAN (mdns: MulticastDNS, serviceTag: string, interval: number) {
  const query = () => {
    log('query', serviceTag)

    mdns.query({
      questions: [{
        name: serviceTag,
        type: 'PTR'
      }]
    })
  }

  // Immediately start a query, then do it every interval.
  query()
  return setInterval(query, interval)
}

interface Answers {
  ptr?: StringAnswer
  srv?: SrvAnswer
  txt?: TxtAnswer
  a: StringAnswer[]
  aaaa: StringAnswer[]
}

export function gotResponse (rsp: ResponsePacket, localPeerId: PeerId, serviceTag: string): PeerInfo | undefined {
  if (rsp.answers == null) {
    return
  }

  const answers: Answers = {
    a: [],
    aaaa: []
  }

  rsp.answers.forEach((answer) => {
    switch (answer.type) {
      case 'PTR': answers.ptr = answer; break
      case 'SRV': answers.srv = answer; break
      case 'TXT': answers.txt = answer; break
      case 'A': answers.a.push(answer); break
      case 'AAAA': answers.aaaa.push(answer); break
      default: break
    }
  })

  if (answers.ptr == null ||
      answers.ptr.name !== serviceTag ||
      answers.txt == null ||
      answers.srv == null) {
    return
  }

  const b58Id = answers.txt.data[0].toString()
  const port = answers.srv.data.port
  const multiaddrs: Multiaddr[] = []

  answers.a.forEach((a) => {
    const ma = multiaddr(`/ip4/${a.data}/tcp/${port}`)

    if (!multiaddrs.some((m) => m.equals(ma))) {
      multiaddrs.push(ma)
    }
  })

  answers.aaaa.forEach((a) => {
    const ma = multiaddr(`/ip6/${a.data}/tcp/${port}`)

    if (!multiaddrs.some((m) => m.equals(ma))) {
      multiaddrs.push(ma)
    }
  })

  if (localPeerId.toString() === b58Id) {
    return // replied to myself, ignore
  }

  const id = peerIdFromString(b58Id)

  log('peer found %p', id)

  return {
    id,
    multiaddrs,
    protocols: []
  }
}

export function gotQuery (qry: QueryPacket, mdns: MulticastDNS, peerId: PeerId, multiaddrs: Multiaddr[], serviceTag: string, broadcast: boolean) {
  if (!broadcast) {
    log('not responding to mDNS query as broadcast mode is false')
    return
  }

  const addresses: MultiaddrObject[] = multiaddrs.reduce<MultiaddrObject[]>((acc, addr) => {
    if (addr.decapsulateCode(protocols('p2p').code).isThinWaistAddress()) {
      acc.push(addr.toOptions())
    }
    return acc
  }, [])

  // Only announce TCP for now
  if (addresses.length === 0) {
    log('no thin waist addresses present, cannot respond to query')
    return
  }

  if (qry.questions[0] != null && qry.questions[0].name === serviceTag) {
    const answers: Answer[] = []

    answers.push({
      name: serviceTag,
      type: 'PTR',
      class: 'IN',
      ttl: 120,
      data: peerId.toString() + '.' + serviceTag
    })

    // Only announce TCP multiaddrs for now
    const port = addresses[0].port

    answers.push({
      name: peerId.toString() + '.' + serviceTag,
      type: 'SRV',
      class: 'IN',
      ttl: 120,
      data: {
        priority: 10,
        weight: 1,
        port: port,
        target: os.hostname()
      }
    })

    answers.push({
      name: peerId.toString() + '.' + serviceTag,
      type: 'TXT',
      class: 'IN',
      ttl: 120,
      data: peerId.toString()
    })

    addresses.forEach((addr) => {
      if ([4, 6].includes(addr.family)) {
        answers.push({
          name: os.hostname(),
          type: addr.family === 4 ? 'A' : 'AAAA',
          class: 'IN',
          ttl: 120,
          data: addr.host
        })
      }
    })

    log('responding to query')
    mdns.respond(answers)
  }
}
