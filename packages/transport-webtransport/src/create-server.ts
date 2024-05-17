import { Http3Server } from '@fails-components/webtransport'
import { TypedEventEmitter } from '@libp2p/interface'
import { raceSignal } from 'race-signal'
import type { HttpServerInit, WebTransportSession } from '@fails-components/webtransport'
import type { ComponentLogger, Logger, TypedEventTarget } from '@libp2p/interface'

interface WebTransportServerEvents extends Record<string, any> {
  listening: CustomEvent
  session: CustomEvent<WebTransportSession>
  close: CustomEvent
  error: CustomEvent<Error>
}

export interface WebTransportServer extends TypedEventTarget<WebTransportServerEvents> {
  listening: boolean
  sessionTimeout: number

  close(callback?: () => void): void
  listen(): void
  address(): { port: number, host: string, family: 'IPv4' | 'IPv6' } | null
}

export interface WebTransportServerComponents {
  logger: ComponentLogger
}

class DefaultWebTransportServer extends TypedEventEmitter<WebTransportServerEvents> implements WebTransportServer {
  private readonly server: Http3Server
  public listening: boolean
  /**
   * How long in ms to wait for an incoming session to be ready
   */
  public sessionTimeout: number
  private readonly log: Logger

  constructor (components: WebTransportServerComponents, init: HttpServerInit) {
    super()

    this.server = new Http3Server(init)
    this.listening = false
    this.log = components.logger.forComponent('libp2p:webtransport:server')

    this.sessionTimeout = 1000
  }

  close (callback?: () => void): void {
    if (callback != null) {
      this.addEventListener('close', callback)
    }

    this.server.stopServer()
    this.server.closed
      .then(() => {
        this.listening = false
        this.safeDispatchEvent('close')
      })
      .catch((err) => {
        this.safeDispatchEvent('error', { detail: err })
      })
  }

  listen (): void {
    this.server.startServer()
    this.server.ready
      .then(() => {
        this.server.setRequestCallback(async (args: any): Promise<any> => {
          const url = args.header[':path']
          const [path] = url.split('?')

          if (this.server.sessionController[path] == null) {
            return {
              ...args,
              path,
              status: 404
            }
          }

          return {
            ...args,
            path,
            userData: {
              search: url.substring(path.length)
            },
            header: {
              ...args.header,
              ':path': path
            },
            status: 200
          }
        })

        this.listening = true
        this.safeDispatchEvent('listening')

        this.log('ready, processing incoming sessions')
        this._processIncomingSessions()
          .catch(err => {
            this.safeDispatchEvent('error', { detail: err })
          })
      })
      .catch((err) => {
        this.safeDispatchEvent('error', { detail: err })
      })
  }

  address (): { port: number, host: string, family: 'IPv4' | 'IPv6' } | null {
    return this.server.address()
  }

  async _processIncomingSessions (): Promise<void> {
    const sessionStream = this.server.sessionStream('/.well-known/libp2p-webtransport')
    const sessionReader = sessionStream.getReader()

    while (true) {
      const { done, value: session } = await sessionReader.read()

      if (done) {
        this.log('session reader finished')
        break
      }

      this.log('new incoming session')
      void Promise.resolve()
        .then(async () => {
          try {
            await raceSignal(session.ready, AbortSignal.timeout(this.sessionTimeout))
            this.log('session ready')

            this.safeDispatchEvent('session', { detail: session })
          } catch (err) {
            this.log.error('error waiting for session to become ready', err)
          }
        })
    }
  }
}

export interface SessionHandler {
  (event: CustomEvent<WebTransportSession>): void
}

export function createServer (components: WebTransportServerComponents, init: HttpServerInit, sessionHandler?: SessionHandler): WebTransportServer {
  const server = new DefaultWebTransportServer(components, init)

  if (sessionHandler != null) {
    server.addEventListener('session', sessionHandler)
  }

  return server
}
