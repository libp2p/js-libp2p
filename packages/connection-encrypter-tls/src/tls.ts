/**
 * @packageDocumentation
 *
 * Implements the spec at https://github.com/libp2p/specs/blob/master/tls/tls.md
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tls } from '@libp2p/tls'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncrypters: [
 *     tls()
 *   ]
 * })
 * ```
 */

import { TLSSocket, connect } from 'node:tls'
import { InvalidCryptoExchangeError, serviceCapabilities } from '@libp2p/interface'
import { HandshakeTimeoutError } from './errors.js'
import { generateCertificate, verifyPeerCertificate, toNodeDuplex, toMessageStream } from './utils.js'
import { PROTOCOL } from './index.js'
import type { TLSComponents } from './index.js'
import type { ConnectionEncrypter, SecuredConnection, Logger, SecureConnectionOptions, CounterGroup, StreamMuxerFactory, MessageStream } from '@libp2p/interface'
import type { TLSSocketOptions } from 'node:tls'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly log: Logger
  private readonly components: TLSComponents
  private readonly metrics: {
    server: {
      events?: CounterGroup
      errors?: CounterGroup
    }
    client: {
      events?: CounterGroup
      errors?: CounterGroup
    }
  }

  constructor (components: TLSComponents) {
    this.log = components.logger.forComponent('libp2p:tls')
    this.components = components
    this.metrics = {
      server: {
        events: components.metrics?.registerCounterGroup('libp2p_tls_server_events_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption events by type'
        }),
        errors: components.metrics?.registerCounterGroup('libp2p_tls_server_errors_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption errors by type'
        })
      },
      client: {
        events: components.metrics?.registerCounterGroup('libp2p_tls_server_events_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption events by type'
        }),
        errors: components.metrics?.registerCounterGroup('libp2p_tls_server_errors_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption errors by type'
        })
      }
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    return this._encrypt(connection, true, options)
  }

  async secureOutbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    return this._encrypt(connection, false, options)
  }

  /**
   * Encrypt connection
   */
  async _encrypt (connection: MessageStream, isServer: boolean, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    const log = connection.log?.newScope('tls') ?? this.log
    let streamMuxer: StreamMuxerFactory | undefined

    let streamMuxers: string[] = []

    if (options?.skipStreamMuxerNegotiation !== true) {
      streamMuxers = [...this.components.upgrader.getStreamMuxers().keys()]
    }

    const opts: TLSSocketOptions = {
      ...await generateCertificate(this.components.privateKey, options),
      isServer,
      // require TLS 1.3 or later
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      // accept self-signed certificates
      rejectUnauthorized: false,

      // early negotiation of muxer via ALPN protocols
      ALPNProtocols: [
        ...streamMuxers,
        'libp2p'
      ],
      ALPNCallback: ({ protocols }) => {
        log.trace('received protocols %s', protocols)
        let chosenProtocol: string | undefined

        for (const protocol of protocols) {
          if (protocol === 'libp2p') {
            chosenProtocol = 'libp2p'
          }

          streamMuxer = this.components.upgrader.getStreamMuxers().get(protocol)

          if (streamMuxer != null) {
            chosenProtocol = protocol
            break
          }
        }

        return chosenProtocol
      }
    }

    const duplex = toNodeDuplex(connection)
    let socket: TLSSocket

    if (isServer) {
      socket = new TLSSocket(duplex, {
        ...opts,
        // require clients to send certificates
        requestCert: true
      })
    } else {
      socket = connect({
        socket: duplex,
        ...opts
      })
    }

    duplex.on('error', (err) => {
      socket.emit('error', err)
    })

    const onAbort = (): void => {
      this.metrics[isServer ? 'server' : 'client'].events?.increment({
        abort: true
      })
      this.metrics[isServer ? 'server' : 'client'].errors?.increment({
        encrypt_abort: true
      })
      socket.emit('error', new HandshakeTimeoutError())
    }

    options?.signal?.addEventListener('abort', onAbort)

    return new Promise<SecuredConnection<MessageStream>>((resolve, reject) => {
      const verifyRemote = (): void => {
        const remote = socket.getPeerCertificate()

        verifyPeerCertificate(remote.raw, options?.remotePeer, log)
          .then(remotePeer => {
            log('remote certificate ok, remote peer %p', remotePeer)

            // 'libp2p' is a special protocol - if it's sent the remote does not
            // support early muxer negotiation
            if (!isServer && typeof socket.alpnProtocol === 'string' && socket.alpnProtocol !== 'libp2p' && options?.skipStreamMuxerNegotiation !== true) {
              this.log.trace('got early muxer', socket.alpnProtocol)
              streamMuxer = this.components.upgrader.getStreamMuxers().get(socket.alpnProtocol)

              if (streamMuxer == null) {
                const err = new InvalidCryptoExchangeError(`Selected muxer ${socket.alpnProtocol} did not exist`)
                log.error('selected muxer %s did not exist - %e', socket.alpnProtocol, err)

                connection.abort(err)
                reject(err)
              }
            }

            resolve({
              remotePeer,
              connection: toMessageStream(connection, socket),
              streamMuxer
            })
          })
          .catch((err: Error) => {
            this.metrics[isServer ? 'server' : 'client'].errors?.increment({
              verify_peer_certificate: true
            })

            socket.emit('error', err)
          })
      }

      socket.on('error', (err: Error) => {
        log.error('error encrypting %s connection - %e', connection.direction, err)

        if (err.name !== 'HandshakeTimeoutError') {
          this.metrics[isServer ? 'server' : 'client'].events?.increment({
            error: true
          })
        }

        socket.destroy()
        connection.abort(err)

        reject(err)
      })
      socket.once('secure', () => {
        log('verifying remote certificate of %s connection', connection.direction)
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          secure: true
        })
        verifyRemote()
      })
      socket.on('connect', () => {
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          connect: true
        })
      })
      socket.on('close', () => {
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          close: true
        })
      })
    })
      .finally(() => {
        options?.signal?.removeEventListener('abort', onAbort)
      })
  }
}
