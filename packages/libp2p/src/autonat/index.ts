/**
 * @packageDocumentation
 *
 * Use the `autoNATService` function to add support for the [AutoNAT protocol](https://docs.libp2p.io/concepts/nat/autonat/)
 * to libp2p.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { autoNATService } from 'libp2p/autonat'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     autoNAT: autoNATService()
 *   }
 * })
 * ```
 */

import { setMaxListeners } from 'events'
import { CodeError, codes } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import first from 'it-first'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import isPrivateIp from 'private-ip'
import {
  MAX_INBOUND_STREAMS,
  MAX_OUTBOUND_STREAMS,
  PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION, REFRESH_INTERVAL, STARTUP_DELAY, TIMEOUT
} from './constants.js'
import { Message } from './pb/index.js'
import type { Connection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerInfo } from '@libp2p/interface/peer-info'
import type { PeerRouting } from '@libp2p/interface/peer-routing'
import type { Startable } from '@libp2p/interface/startable'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

const log = logger('libp2p:autonat')

// if more than 3 peers manage to dial us on what we believe to be our external
// IP then we are convinced that it is, in fact, our external IP
// https://github.com/libp2p/specs/blob/master/autonat/README.md#autonat-protocol
const REQUIRED_SUCCESSFUL_DIALS = 4

export interface AutoNATServiceInit {
  /**
   * Allows overriding the protocol prefix used
   */
  protocolPrefix?: string

  /**
   * How long we should wait for a remote peer to verify our external address
   */
  timeout?: number

  /**
   * How long to wait after startup before trying to verify our external address
   */
  startupDelay?: number

  /**
   * Verify our external addresses this often
   */
  refreshInterval?: number

  /**
   * How many parallel inbound autoNAT streams we allow per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outbound autoNAT streams we allow per-connection
   */
  maxOutboundStreams?: number
}

export interface AutoNATComponents {
  registrar: Registrar
  addressManager: AddressManager
  transportManager: TransportManager
  peerId: PeerId
  connectionManager: ConnectionManager
  peerRouting: PeerRouting
}

class DefaultAutoNATService implements Startable {
  private readonly components: AutoNATComponents
  private readonly startupDelay: number
  private readonly refreshInterval: number
  private readonly protocol: string
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private verifyAddressTimeout?: ReturnType<typeof setTimeout>
  private started: boolean

  constructor (components: AutoNATComponents, init: AutoNATServiceInit) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.startupDelay = init.startupDelay ?? STARTUP_DELAY
    this.refreshInterval = init.refreshInterval ?? REFRESH_INTERVAL
    this._verifyExternalAddresses = this._verifyExternalAddresses.bind(this)
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.components.registrar.handle(this.protocol, (data) => {
      void this.handleIncomingAutonatStream(data)
        .catch(err => {
          log.error('error handling incoming autonat stream', err)
        })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
    })

    this.verifyAddressTimeout = setTimeout(this._verifyExternalAddresses, this.startupDelay)

    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    clearTimeout(this.verifyAddressTimeout)

    this.started = false
  }

  /**
   * Handle an incoming AutoNAT request
   */
  async handleIncomingAutonatStream (data: IncomingStreamData): Promise<void> {
    const signal = AbortSignal.timeout(this.timeout)

    const onAbort = (): void => {
      data.stream.abort(new CodeError('handleIncomingAutonatStream timeout', codes.ERR_TIMEOUT))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    // this controller may be used while dialing lots of peers so prevent MaxListenersExceededWarning
    // appearing in the console
    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, signal)
    } catch {}

    const ourHosts = this.components.addressManager.getAddresses()
      .map(ma => ma.toOptions().host)

    try {
      const self = this

      await pipe(
        data.stream,
        (source) => lp.decode(source),
        async function * (stream) {
          const buf = await first(stream)

          if (buf == null) {
            log('no message received')
            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'No message was sent'
              }
            })

            return
          }

          let request: Message

          try {
            request = Message.decode(buf)
          } catch (err) {
            log.error('could not decode message', err)

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'Could not decode message'
              }
            })

            return
          }

          const dialRequest = request.dial

          if (dialRequest == null) {
            log.error('dial was missing from message')

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'No Dial message found in message'
              }
            })

            return
          }

          let peerId: PeerId
          const peer = dialRequest.peer

          if (peer == null || peer.id == null) {
            log.error('PeerId missing from message')

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'missing peer info'
              }
            })

            return
          }

          try {
            peerId = peerIdFromBytes(peer.id)
          } catch (err) {
            log.error('invalid PeerId', err)

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'bad peer id'
              }
            })

            return
          }

          log('incoming request from %p', peerId)

          // reject any dial requests that arrive via relays
          if (!data.connection.remotePeer.equals(peerId)) {
            log('target peer %p did not equal sending peer %p', peerId, data.connection.remotePeer)

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_BAD_REQUEST,
                statusText: 'peer id mismatch'
              }
            })

            return
          }

          // get a list of multiaddrs to dial
          const multiaddrs = peer.addrs
            .map(buf => multiaddr(buf))
            .filter(ma => {
              const isFromSameHost = ma.toOptions().host === data.connection.remoteAddr.toOptions().host

              log.trace('request to dial %a was sent from %a is same host %s', ma, data.connection.remoteAddr, isFromSameHost)
              // skip any Multiaddrs where the target node's IP does not match the sending node's IP
              return isFromSameHost
            })
            .filter(ma => {
              const host = ma.toOptions().host
              const isPublicIp = !(isPrivateIp(host) ?? false)

              log.trace('host %s was public %s', host, isPublicIp)
              // don't try to dial private addresses
              return isPublicIp
            })
            .filter(ma => {
              const host = ma.toOptions().host
              const isNotOurHost = !ourHosts.includes(host)

              log.trace('host %s was not our host %s', host, isNotOurHost)
              // don't try to dial nodes on the same host as us
              return isNotOurHost
            })
            .filter(ma => {
              const isSupportedTransport = Boolean(self.components.transportManager.transportForMultiaddr(ma))

              log.trace('transport for %a is supported %s', ma, isSupportedTransport)
              // skip any Multiaddrs that have transports we do not support
              return isSupportedTransport
            })
            .map(ma => {
              if (ma.getPeerId() == null) {
                // make sure we have the PeerId as part of the Multiaddr
                ma = ma.encapsulate(`/p2p/${peerId.toString()}`)
              }

              return ma
            })

          // make sure we have something to dial
          if (multiaddrs.length === 0) {
            log('no valid multiaddrs for %p in message', peerId)

            yield Message.encode({
              type: Message.MessageType.DIAL_RESPONSE,
              dialResponse: {
                status: Message.ResponseStatus.E_DIAL_REFUSED,
                statusText: 'no dialable addresses'
              }
            })

            return
          }

          log('dial multiaddrs %s for peer %p', multiaddrs.map(ma => ma.toString()).join(', '), peerId)

          let errorMessage = ''
          let lastMultiaddr = multiaddrs[0]

          for await (const multiaddr of multiaddrs) {
            let connection: Connection | undefined
            lastMultiaddr = multiaddr

            try {
              connection = await self.components.connectionManager.openConnection(multiaddr, {
                signal
              })

              if (!connection.remoteAddr.equals(multiaddr)) {
                log.error('tried to dial %a but dialed %a', multiaddr, connection.remoteAddr)
                throw new Error('Unexpected remote address')
              }

              log('Success %p', peerId)

              yield Message.encode({
                type: Message.MessageType.DIAL_RESPONSE,
                dialResponse: {
                  status: Message.ResponseStatus.OK,
                  addr: connection.remoteAddr.decapsulateCode(protocols('p2p').code).bytes
                }
              })

              return
            } catch (err: any) {
              log('could not dial %p', peerId, err)
              errorMessage = err.message
            } finally {
              if (connection != null) {
                await connection.close()
              }
            }
          }

          yield Message.encode({
            type: Message.MessageType.DIAL_RESPONSE,
            dialResponse: {
              status: Message.ResponseStatus.E_DIAL_ERROR,
              statusText: errorMessage,
              addr: lastMultiaddr.bytes
            }
          })
        },
        (source) => lp.encode(source),
        data.stream
      )
    } catch (err) {
      log.error('error handling incoming autonat stream', err)
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }

  _verifyExternalAddresses (): void {
    void this.verifyExternalAddresses()
      .catch(err => {
        log.error('error verifying external address', err)
      })
  }

  /**
   * Our multicodec topology noticed a new peer that supports autonat
   */
  async verifyExternalAddresses (): Promise<void> {
    clearTimeout(this.verifyAddressTimeout)

    // Do not try to push if we are not running
    if (!this.isStarted()) {
      return
    }

    const addressManager = this.components.addressManager

    const multiaddrs = addressManager.getObservedAddrs()
      .filter(ma => {
        const options = ma.toOptions()

        return !(isPrivateIp(options.host) ?? false)
      })

    if (multiaddrs.length === 0) {
      log('no public addresses found, not requesting verification')
      this.verifyAddressTimeout = setTimeout(this._verifyExternalAddresses, this.refreshInterval)

      return
    }

    const signal = AbortSignal.timeout(this.timeout)

    // this controller may be used while dialing lots of peers so prevent MaxListenersExceededWarning
    // appearing in the console
    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, signal)
    } catch {}

    const self = this

    try {
      log('verify multiaddrs %s', multiaddrs.map(ma => ma.toString()).join(', '))

      const request = Message.encode({
        type: Message.MessageType.DIAL,
        dial: {
          peer: {
            id: this.components.peerId.toBytes(),
            addrs: multiaddrs.map(map => map.bytes)
          }
        }
      })
      // find some random peers
      const randomPeer = await createEd25519PeerId()
      const randomCid = randomPeer.toBytes()

      const results: Record<string, { success: number, failure: number }> = {}
      const networkSegments: string[] = []

      const verifyAddress = async (peer: PeerInfo): Promise<Message.DialResponse | undefined> => {
        let onAbort = (): void => {}

        try {
          log('asking %p to verify multiaddr', peer.id)

          const connection = await self.components.connectionManager.openConnection(peer.id, {
            signal
          })

          const stream = await connection.newStream(this.protocol, {
            signal
          })

          onAbort = () => { stream.abort(new CodeError('verifyAddress timeout', codes.ERR_TIMEOUT)) }

          signal.addEventListener('abort', onAbort, { once: true })

          const buf = await pipe(
            [request],
            (source) => lp.encode(source),
            stream,
            (source) => lp.decode(source),
            async (stream) => first(stream)
          )
          if (buf == null) {
            log('no response received from %p', connection.remotePeer)
            return undefined
          }
          const response = Message.decode(buf)

          if (response.type !== Message.MessageType.DIAL_RESPONSE || response.dialResponse == null) {
            log('invalid autonat response from %p', connection.remotePeer)
            return undefined
          }

          if (response.dialResponse.status === Message.ResponseStatus.OK) {
            // make sure we use different network segments
            const options = connection.remoteAddr.toOptions()
            let segment: string

            if (options.family === 4) {
              const octets = options.host.split('.')
              segment = octets[0]
            } else if (options.family === 6) {
              const octets = options.host.split(':')
              segment = octets[0]
            } else {
              log('remote address "%s" was not IP4 or IP6?', options.host)
              return undefined
            }

            if (networkSegments.includes(segment)) {
              log('already have response from network segment %d - %s', segment, options.host)
              return undefined
            }

            networkSegments.push(segment)
          }

          return response.dialResponse
        } catch (err) {
          log.error('error asking remote to verify multiaddr', err)
        } finally {
          signal.removeEventListener('abort', onAbort)
        }
      }

      for await (const dialResponse of parallel(map(this.components.peerRouting.getClosestPeers(randomCid, {
        signal
      }), (peer) => async () => verifyAddress(peer)), {
        concurrency: REQUIRED_SUCCESSFUL_DIALS
      })) {
        try {
          if (dialResponse == null) {
            continue
          }

          // they either told us which address worked/didn't work, or we only sent them one address
          const addr = dialResponse.addr == null ? multiaddrs[0] : multiaddr(dialResponse.addr)

          log('autonat response for %a is %s', addr, dialResponse.status)

          if (dialResponse.status === Message.ResponseStatus.E_BAD_REQUEST) {
            // the remote could not parse our request
            continue
          }

          if (dialResponse.status === Message.ResponseStatus.E_DIAL_REFUSED) {
            // the remote could not honour our request
            continue
          }

          if (dialResponse.addr == null && multiaddrs.length > 1) {
            // we sent the remote multiple addrs but they didn't tell us which ones worked/didn't work
            continue
          }

          if (!multiaddrs.some(ma => ma.equals(addr))) {
            log('peer reported %a as %s but it was not in our observed address list', addr, dialResponse.status)
            continue
          }

          const addrStr = addr.toString()

          if (results[addrStr] == null) {
            results[addrStr] = { success: 0, failure: 0 }
          }

          if (dialResponse.status === Message.ResponseStatus.OK) {
            results[addrStr].success++
          } else if (dialResponse.status === Message.ResponseStatus.E_DIAL_ERROR) {
            results[addrStr].failure++
          }

          if (results[addrStr].success === REQUIRED_SUCCESSFUL_DIALS) {
            // we are now convinced
            log('%a is externally dialable', addr)
            addressManager.confirmObservedAddr(addr)
            return
          }

          if (results[addrStr].failure === REQUIRED_SUCCESSFUL_DIALS) {
            // we are now unconvinced
            log('%a is not externally dialable', addr)
            addressManager.removeObservedAddr(addr)
            return
          }
        } catch (err) {
          log.error('could not verify external address', err)
        }
      }
    } finally {
      this.verifyAddressTimeout = setTimeout(this._verifyExternalAddresses, this.refreshInterval)
    }
  }
}

export function autoNATService (init: AutoNATServiceInit = {}): (components: AutoNATComponents) => unknown {
  return (components) => {
    return new DefaultAutoNATService(components, init)
  }
}
