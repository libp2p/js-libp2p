import errCode from 'err-code'
import { anySignal } from 'any-signal'
import FIFO from 'p-fifo'
import pAny from 'p-any'
// @ts-expect-error setMaxListeners is missing from the node 16 types
import { setMaxListeners } from 'events'
import { codes } from '../errors.js'
import { logger } from '@libp2p/logger'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Connection } from '@libp2p/interfaces/connection'
import type { AbortOptions } from '@libp2p/interfaces'
import type { DefaultDialer } from './index.js'

const log = logger('libp2p:dialer:dial-request')

export interface DialAction {
  (m: Multiaddr, options: AbortOptions): Promise<Connection>
}

export interface DialRequestOptions {
  addrs: Multiaddr[]
  dialAction: DialAction
  dialer: DefaultDialer
}

export class DialRequest {
  private readonly addrs: Multiaddr[]
  private readonly dialer: DefaultDialer
  private readonly dialAction: DialAction

  /**
   * Manages running the `dialAction` on multiple provided `addrs` in parallel
   * up to a maximum determined by the number of tokens returned
   * from `dialer.getTokens`. Once a DialRequest is created, it can be
   * started using `DialRequest.run(options)`. Once a single dial has succeeded,
   * all other dials in the request will be cancelled.
   */
  constructor (options: DialRequestOptions) {
    const {
      addrs,
      dialAction,
      dialer
    } = options

    this.addrs = addrs
    this.dialer = dialer
    this.dialAction = dialAction
  }

  async run (options: AbortOptions = {}): Promise<Connection> {
    const tokens = this.dialer.getTokens(this.addrs.length)

    // If no tokens are available, throw
    if (tokens.length < 1) {
      throw errCode(new Error('No dial tokens available'), codes.ERR_NO_DIAL_TOKENS)
    }

    const tokenHolder = new FIFO<number>()

    for (const token of tokens) {
      void tokenHolder.push(token).catch(err => {
        log.error(err)
      })
    }

    const dialAbortControllers = this.addrs.map(() => {
      const controller = new AbortController()
      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, controller.signal)
      } catch {}

      return controller
    })

    if (options.signal != null) {
      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, options.signal)
      } catch {}
    }

    let completedDials = 0

    try {
      return await pAny(this.addrs.map(async (addr, i) => {
        const token = await tokenHolder.shift() // get token
        let conn
        try {
          const signal = dialAbortControllers[i].signal
          conn = await this.dialAction(addr, { ...options, signal: (options.signal != null) ? anySignal([signal, options.signal]) : signal })
          // Remove the successful AbortController so it is not aborted
          dialAbortControllers.splice(i, 1)
        } finally {
          completedDials++
          // If we have more or equal dials remaining than tokens, recycle the token, otherwise release it
          if (this.addrs.length - completedDials >= tokens.length) {
            void tokenHolder.push(token).catch(err => {
              log.error(err)
            })
          } else {
            this.dialer.releaseToken(tokens.splice(tokens.indexOf(token), 1)[0])
          }
        }

        return conn
      }))
    } finally {
      dialAbortControllers.map(c => c.abort()) // success/failure happened, abort everything else
      tokens.forEach(token => this.dialer.releaseToken(token)) // release tokens back to the dialer
    }
  }
}
