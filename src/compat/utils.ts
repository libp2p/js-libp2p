import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerId } from '@libp2p/interface-peer-id'
import { logger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Answer } from 'dns-packet'
import { SERVICE_TAG_LOCAL } from './constants.js'

const log = logger('libp2p:mdns:compat:utils')

export function findPeerInfoInAnswers (answers: Answer[], ourPeerId: PeerId): PeerInfo | undefined {
  const ptrRecord = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TAG_LOCAL)

  // Only deal with responses for our service tag
  if (ptrRecord == null) {
    return
  }

  log.trace('got response', SERVICE_TAG_LOCAL)

  const txtRecord = answers.find(a => a.type === 'TXT')
  if (txtRecord == null || txtRecord.type !== 'TXT') {
    log('missing TXT record in response')
    return
  }

  let peerIdStr: string
  try {
    peerIdStr = txtRecord.data[0].toString()
  } catch (err) {
    log('failed to extract peer ID from TXT record data', txtRecord, err)
    return
  }

  let peerId: PeerId
  try {
    peerId = peerIdFromString(peerIdStr)
  } catch (err) {
    log('failed to create peer ID from TXT record data', peerIdStr, err)
    return
  }

  if (ourPeerId.equals(peerId)) {
    log('ignoring reply to myself')
    return
  }

  const multiaddrs: Multiaddr[] = []
  const hosts: { A: Record<string, string>, AAAA: Record<string, string> } = {
    A: {},
    AAAA: {}
  }

  answers.forEach(answer => {
    if (answer.type === 'A') {
      hosts.A[answer.name] = answer.data
    }

    if (answer.type === 'AAAA') {
      hosts.AAAA[answer.name] = answer.data
    }
  })

  answers.forEach(answer => {
    if (answer.type === 'SRV') {
      if (hosts.A[answer.data.target] != null) {
        multiaddrs.push(multiaddr(`/ip4/${hosts.A[answer.data.target]}/tcp/${answer.data.port}/p2p/${peerId.toString()}`))
      } else if (hosts.AAAA[answer.data.target] != null) {
        multiaddrs.push(multiaddr(`/ip6/${hosts.AAAA[answer.data.target]}/tcp/${answer.data.port}/p2p/${peerId.toString()}`))
      } else {
        multiaddrs.push(multiaddr(`/dnsaddr/${answer.data.target}/tcp/${answer.data.port}/p2p/${peerId.toString()}`))
      }
    }
  })

  return {
    id: peerId,
    multiaddrs,
    protocols: []
  }
}
