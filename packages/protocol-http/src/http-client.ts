/**
 * HTTP client implementation for libp2p
 */
import { AbortError, setMaxListeners } from '@libp2p/interface'
import { pbStream } from 'it-protobuf-stream'
import { HttpConstants } from './constants.js'
import { type HttpComponents } from './http-components-interface.js'
import { http } from './http-proto-api.js'
import type { HttpInit } from './interfaces/http-init-interface.js'
import type { AbortOptions, Logger, Stream, PeerId, Startable } from '@libp2p/interface'

const DEFAULT_TIMEOUT = 30000 // 30 seconds

export class HttpClient implements Startable {
  private readonly log: Logger
  private readonly components: HttpComponents
  private readonly protocol: string
  private started: boolean
  private readonly init: HttpInit

  constructor (components: HttpComponents, init: HttpInit = {}) {
    this.log = components.logger.forComponent('libp2p:http:client')
    this.components = components
    this.protocol = `/${HttpConstants.PROTOCOL_NAME}/${HttpConstants.PROTOCOL_VERSION}`
    this.started = false
    this.init = init
  }

  readonly [Symbol.toStringTag] = '@libp2p/http-client'

  async start (): Promise<void> {
    this.log.trace('starting http client')
    this.started = true
  }

  async stop (): Promise<void> {
    this.log.trace('stopping http client')
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  async fetch (peer: PeerId, request: http.HttpRequest, options: AbortOptions = {}): Promise<http.HttpResponse> {
    if (!this.isStarted()) {
      // Auto-start the client if it hasn't been started
      await this.start()
    }

    this.log.trace('sending %s request to %p for %s', request.method, peer, request.targetUri)

    let connection
    let stream: Stream | undefined
    let signal = options.signal
    let onAbort = (): void => {}

    try {
      connection = await this.components.connectionManager.openConnection(peer, options)

      if (signal == null) {
        const timeout = this.init.timeout ?? DEFAULT_TIMEOUT
        this.log.trace('using default timeout of %d ms', timeout)
        signal = AbortSignal.timeout(timeout)
        setMaxListeners(Infinity, signal)
      }

      stream = await connection.newStream(this.protocol, {
        signal
      })

      onAbort = () => {
        stream?.abort(new AbortError())
      }

      signal.addEventListener('abort', onAbort, { once: true })

      const pb = pbStream(stream)
      await pb.write(request, http.HttpRequest, options)

      const response = await pb.read(http.HttpResponse, options)
      await pb.unwrap().close(options)

      this.log.trace('received response with status %d from %p', response.statusCode, peer)

      return response
    } catch (err: any) {
      this.log.error('error fetching from %p - %e', peer, err)

      if (stream != null) {
        stream.abort(err)
      }

      throw err
    } finally {
      if (signal != null) {
        signal.removeEventListener('abort', onAbort)
      }

      if (stream != null) {
        await stream.close().catch(err => {
          this.log.error('error closing stream - %e', err)
        })
      }
    }
  }
}
