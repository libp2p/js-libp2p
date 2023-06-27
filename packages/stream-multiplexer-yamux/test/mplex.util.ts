import { mplex } from '@libp2p/mplex'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import type { StreamMuxer, StreamMuxerInit } from '@libp2p/interface/stream-muxer'
import type { Source, Transform } from 'it-stream-types'

const factory = mplex()()

export function testYamuxMuxer (name: string, client: boolean, conf: StreamMuxerInit = {}): StreamMuxer {
  return factory.createStreamMuxer({
    ...conf,
    direction: client ? 'outbound' : 'inbound'
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

export function testClientServer (conf: StreamMuxerInit = {}): {
  client: StreamMuxer & {
    pauseRead: () => void
    unpauseRead: () => void
    pauseWrite: () => void
    unpauseWrite: () => void
  }
  server: StreamMuxer & {
    pauseRead: () => void
    unpauseRead: () => void
    pauseWrite: () => void
    unpauseWrite: () => void
  }
} {
  const pair = duplexPair<Uint8Array>()
  const client = testYamuxMuxer('libp2p:mplex:client', true, conf)
  const server = testYamuxMuxer('libp2p:mplex:server', false, conf)

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
