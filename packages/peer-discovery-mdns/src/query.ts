import { peerIdFromString } from '@libp2p/peer-id'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import type { LoggerOptions, PeerInfo } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Answer, StringAnswer, TxtAnswer } from 'dns-packet'
import type { MulticastDNS, QueryPacket, ResponsePacket } from 'multicast-dns'

export function queryLAN (mdns: MulticastDNS, serviceTag: string, interval: number, options?: LoggerOptions): ReturnType<typeof setInterval> {
  const query = (): void => {
    options?.log.trace('query', serviceTag)

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

export function gotResponse (rsp: ResponsePacket, localPeerName: string, serviceTag: string, options?: LoggerOptions): PeerInfo | undefined {
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

  // according to the spec, peer details should be in the additional records,
  // not the answers though it seems go-libp2p at least ignores this?
  // https://github.com/libp2p/specs/blob/master/discovery/mdns.md#response
  rsp.additionals.forEach((answer) => {
    switch (answer.type) {
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
    options?.log('peer found %p', peerId)

    return {
      id: peerIdFromString(peerId),
      multiaddrs: multiaddrs.map(addr => addr.decapsulateCode(protocols('p2p').code))
    }
  } catch (e) {
    options?.log.error('failed to parse mdns response', e)
  }
}

export function gotQuery (qry: QueryPacket, mdns: MulticastDNS, peerName: string, multiaddrs: Multiaddr[], serviceTag: string, broadcast: boolean, options?: LoggerOptions): void {
  if (!broadcast) {
    options?.log('not responding to mDNS query as broadcast mode is false')
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

    multiaddrs
      // mDNS requires link-local addresses only
      // https://github.com/libp2p/specs/blob/master/discovery/mdns.md#issues
      .filter(isLinkLocal)
      .forEach((addr) => {
        const data = 'dnsaddr=' + addr.toString()

        // TXT record fields have a max data length of 255 bytes
        // see 6.1 - https://www.ietf.org/rfc/rfc6763.txt
        if (data.length > 255) {
          options?.log('multiaddr %a is too long to use in mDNS query response', addr)
          return
        }

        // spec mandates multiaddr contains peer id
        if (addr.getPeerId() == null) {
          options?.log('multiaddr %a did not have a peer ID so cannot be used in mDNS query response', addr)
          return
        }

        answers.push({
          name: peerName + '.' + serviceTag,
          type: 'TXT',
          class: 'IN',
          ttl: 120,
          data
        })
      })

    options?.log.trace('responding to query')
    mdns.respond(answers)
  }
}

function isLinkLocal (ma: Multiaddr): boolean {
  // match private ip4/ip6 & loopback addresses
  if (isPrivate(ma)) {
    return true
  }

  return false
}
