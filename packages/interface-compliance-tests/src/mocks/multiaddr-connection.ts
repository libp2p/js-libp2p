import { logger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { abortableSource } from 'abortable-iterator'
import { duplexPair } from 'it-pair/duplex'
import type { MultiaddrConnection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export function mockMultiaddrConnection (source: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> & Partial<MultiaddrConnection>, peerId: PeerId): MultiaddrConnection {
  const maConn: MultiaddrConnection = {
    async close () {

    },
    abort: () => {},
    timeline: {
      open: Date.now()
    },
    remoteAddr: multiaddr(`/ip4/127.0.0.1/tcp/4001/p2p/${peerId.toString()}`),
    log: logger('mock-maconn'),
    ...source
  }

  return maConn
}

export interface MockMultiaddrConnPairOptions {
  addrs: Multiaddr[]
  remotePeer: PeerId
}

/**
 * Returns both sides of a mocked MultiaddrConnection
 */
export function mockMultiaddrConnPair (opts: MockMultiaddrConnPairOptions): { inbound: MultiaddrConnection, outbound: MultiaddrConnection } {
  const { addrs, remotePeer } = opts
  const controller = new AbortController()
  const [localAddr, remoteAddr] = addrs
  const [inboundStream, outboundStream] = duplexPair<Uint8Array | Uint8ArrayList>()

  const outbound: MultiaddrConnection = {
    ...outboundStream,
    remoteAddr: remoteAddr.toString().includes(`/p2p/${remotePeer.toString()}`) ? remoteAddr : remoteAddr.encapsulate(`/p2p/${remotePeer.toString()}`),
    timeline: {
      open: Date.now()
    },
    close: async () => {
      outbound.timeline.close = Date.now()
      controller.abort()
    },
    abort: (err: Error) => {
      outbound.timeline.close = Date.now()
      controller.abort(err)
    },
    log: logger('mock-maconn-outbound')
  }

  const inbound: MultiaddrConnection = {
    ...inboundStream,
    remoteAddr: localAddr,
    timeline: {
      open: Date.now()
    },
    close: async () => {
      inbound.timeline.close = Date.now()
      controller.abort()
    },
    abort: (err: Error) => {
      outbound.timeline.close = Date.now()
      controller.abort(err)
    },
    log: logger('mock-maconn-inbound')
  }

  // Make the sources abortable so we can close them easily
  inbound.source = abortableSource(inbound.source, controller.signal)
  outbound.source = abortableSource(outbound.source, controller.signal)

  return { inbound, outbound }
}
