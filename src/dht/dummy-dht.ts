import type { DualDHT, QueryEvent, SingleDHT } from '@libp2p/interfaces/dht'
import type { PeerDiscoveryEvents } from '@libp2p/interfaces/peer-discovery'
import errCode from 'err-code'
import { messages, codes } from '../errors.js'
import { EventEmitter } from '@libp2p/interfaces/events'
import { symbol } from '@libp2p/interfaces/peer-discovery'

export class DummyDHT extends EventEmitter<PeerDiscoveryEvents> implements DualDHT {
  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/dummy-dht'
  }

  get wan (): SingleDHT {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  get lan (): SingleDHT {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  get (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  findProviders (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  findPeer (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  getClosestPeers (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  provide (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  put (): AsyncIterable<QueryEvent> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  async getMode (): Promise<'client' | 'server'> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  async setMode (): Promise<void> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }

  async refreshRoutingTable (): Promise<void> {
    throw errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED)
  }
}
