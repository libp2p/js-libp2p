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
const WELL_KNOWN_PROTOCOLS_PATH = '/.well-known/libp2p/protocols'

/**
 * Protocol discovery result
 */
export interface ProtocolDiscoveryResult {
  protocols: Array<{
    id: string
    name: string
    description: string
    version: string
    url?: string
  }>
}

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

  /**
   * Discover protocols supported by a remote peer using the .well-known/libp2p/protocols resource
   */
  async discoverProtocols (peer: PeerId, options: AbortOptions = {}): Promise<ProtocolDiscoveryResult> {
    if (!this.isStarted()) {
      // Auto-start the client if it hasn't been started
      await this.start()
    }

    this.log.trace('discovering protocols from %p', peer)

    // Create a GET request to the well-known protocols endpoint
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: WELL_KNOWN_PROTOCOLS_PATH,
      protocolVersion: 'HTTP/1.1',
      baseMessage: {
        headers: [
          { name: 'Accept', value: 'application/json' }
        ],
        content: new Uint8Array(0),
        trailers: []
      }
    }

    try {
      // Send request to peer
      const response = await this.fetch(peer, request, options)

      if (response.statusCode !== 200) {
        throw new Error(`Protocol discovery failed with status ${response.statusCode}`)
      }

      // Parse response content as JSON
      const content = response.baseMessage?.content ?? new Uint8Array(0)
      const contentString = new TextDecoder().decode(content)

      try {
        const result = JSON.parse(contentString) as ProtocolDiscoveryResult
        this.log.trace('discovered %d protocols from %p', result.protocols.length, peer)
        return result
      } catch (err) {
        throw new Error('Invalid protocol discovery response: ' + err.message)
      }
    } catch (err) {
      this.log.error('protocol discovery failed - %e', err)
      throw err
    }
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
