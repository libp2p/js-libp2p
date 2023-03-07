import type { PeerInfo } from '@libp2p/interface-peer-info'
import { logger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import type { Answer, StringAnswer, TxtAnswer } from 'dns-packet'
import type { MulticastDNS, QueryPacket, ResponsePacket } from 'multicast-dns'

const log = logger('libp2p:mdns:query')

export function queryLAN (mdns: MulticastDNS, serviceTag: string, interval: number): NodeJS.Timer {
  const query = (): void => {
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

export function gotResponse (rsp: ResponsePacket, localPeerName: string, serviceTag: string): PeerInfo | undefined {
  if (rsp.answers == null) {
    return
  }

  let answerPTR: StringAnswer | undefined
  const txtAnswers: TxtAnswer[] = []

  rsp.answers.forEach((answer) => {
    switch (answer.type) {
      case 'PTR': answerPTR = answer; break
      case 'TXT': txtAnswers.push(answer); break
      default: break
    }
  })

  if (answerPTR == null ||
    answerPTR?.name !== serviceTag ||
    txtAnswers.length === 0 ||
    answerPTR.data.startsWith(localPeerName)) {
    return
  }

  try {
    const multiaddrs: Multiaddr[] = txtAnswers
      .flatMap((a) => a.data)
      .filter(answerData => answerData.toString().startsWith('dnsaddr='))
      .map((answerData) => {
        return multiaddr(answerData.toString().substring('dnsaddr='.length))
      })

    const peerId = multiaddrs[0].getPeerId()
    if (peerId == null) {
      throw new Error("Multiaddr doesn't contain PeerId")
    }
    log('peer found %p', peerId)

    return {
      id: peerIdFromString(peerId),
      multiaddrs,
      protocols: []
    }
  } catch (e) {
    log.error('failed to parse mdns response', e)
  }
}

export function gotQuery (qry: QueryPacket, mdns: MulticastDNS, peerName: string, multiaddrs: Multiaddr[], serviceTag: string, broadcast: boolean): void {
  if (!broadcast) {
    log('not responding to mDNS query as broadcast mode is false')
    return
  }

  if (multiaddrs.length === 0) {
    return
  }

  if (qry.questions[0] != null && qry.questions[0].name === serviceTag) {
    const answers: Answer[] = []

    answers.push({
      name: serviceTag,
      type: 'PTR',
      class: 'IN',
      ttl: 120,
      data: peerName + '.' + serviceTag
    })

    multiaddrs.forEach((addr) => {
      // spec mandates multiaddr contains peer id
      if (addr.getPeerId() != null) {
        answers.push({
          name: peerName + '.' + serviceTag,
          type: 'TXT',
          class: 'IN',
          ttl: 120,
          data: 'dnsaddr=' + addr.toString()
        })
      }
    })

    log('responding to query')
    mdns.respond(answers)
  }
}
