import { logger } from '@libp2p/logger'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { Yamux, YamuxMuxer, type YamuxMuxerInit } from '../src/muxer.js'
import type { Config } from '../src/config.js'
import type { Source, Transform } from 'it-stream-types'

const isClient = (() => {
  let client = false
  return () => {
    const isClient = !client
    client = isClient
    return isClient
  }
})()

export const testConf: Partial<Config> = {
  enableKeepAlive: false
}

/**
 * Yamux must be configured with a client setting `client` to true
 * and a server setting `client` to falsey
 *
 * Since the compliance tests create a dialer and listener,
 * manually alternate setting `client` to true and false
 */
export class TestYamux extends Yamux {
  createStreamMuxer (init?: YamuxMuxerInit): YamuxMuxer {
    const client = isClient()
    return super.createStreamMuxer({ ...testConf, ...init, direction: client ? 'outbound' : 'inbound', log: logger(`libp2p:yamux${client ? 1 : 2}`) })
  }
}

export function testYamuxMuxer (name: string, client: boolean, conf: YamuxMuxerInit = {}): YamuxMuxer {
  return new YamuxMuxer({
    ...testConf,
    ...conf,
    direction: client ? 'outbound' : 'inbound',
    log: logger(name)
  })
}

/**
 * Create a transform that can be paused and unpaused
 */
export function pauseableTransform <A> (): { transform: Transform<Source<A>, AsyncGenerator<A>>, pause: () => void, unpause: () => void } {
  let resolvePausePromise: ((value: unknown) => void) | undefined
  let pausePromise: Promise<unknown> | undefined
  const unpause = (): void => {
    resolvePausePromise?.(null)
  }
  const pause = (): void => {
    pausePromise = new Promise(resolve => {
      resolvePausePromise = resolve
    })
  }
  const transform: Transform<Source<A>, AsyncGenerator<A>> = async function * (source) {
    for await (const d of source) {
      if (pausePromise !== undefined) {
        await pausePromise
        pausePromise = undefined
        resolvePausePromise = undefined
      }
      yield d
    }
  }
  return { transform, pause, unpause }
}

export interface YamuxFixture extends YamuxMuxer {
  pauseRead: () => void
  unpauseRead: () => void
  pauseWrite: () => void
  unpauseWrite: () => void
}

export function testClientServer (conf: YamuxMuxerInit = {}): {
  client: YamuxFixture
  server: YamuxFixture
} {
  const pair = duplexPair<Uint8Array>()
  const client = testYamuxMuxer('libp2p:yamux:client', true, conf)
  const server = testYamuxMuxer('libp2p:yamux:server', false, conf)

  const clientReadTransform = pauseableTransform<Uint8Array>()
  const clientWriteTransform = pauseableTransform<Uint8Array>()
  const serverReadTransform = pauseableTransform<Uint8Array>()
  const serverWriteTransform = pauseableTransform<Uint8Array>()

  void pipe(pair[0], clientReadTransform.transform, client, clientWriteTransform.transform, pair[0])
  void pipe(pair[1], serverReadTransform.transform, server, serverWriteTransform.transform, pair[1])
  return {
    client: Object.assign(client, {
      pauseRead: clientReadTransform.pause,
      unpauseRead: clientReadTransform.unpause,
      pauseWrite: clientWriteTransform.pause,
      unpauseWrite: clientWriteTransform.unpause
    }),
    server: Object.assign(server, {
      pauseRead: serverReadTransform.pause,
      unpauseRead: serverReadTransform.unpause,
      pauseWrite: serverWriteTransform.pause,
      unpauseWrite: serverWriteTransform.unpause
    })
  }
}

export async function timeout (ms: number): Promise<unknown> {
  return new Promise((_resolve, reject) => setTimeout(() => { reject(new Error(`timeout after ${ms}ms`)) }, ms))
}

export async function sleep (ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(() => { resolve(ms) }, ms))
}
