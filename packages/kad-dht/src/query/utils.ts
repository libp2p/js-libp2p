import { CodeError } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import type { CleanUpEvents } from './manager.js'
import type { QueryEvent } from '../index.js'
import type { Logger, TypedEventTarget } from '@libp2p/interface'
import type Queue from 'p-queue'

export async function * queueToGenerator (queue: Queue, signal: AbortSignal, cleanUp: TypedEventTarget<CleanUpEvents>, log: Logger): AsyncGenerator<QueryEvent, void, undefined> {
  const stream = pushable<QueryEvent>({
    objectMode: true
  })

  const cleanup = (err?: Error): void => {
    log('clean up queue, results %d, queue size %d, pending tasks %d', stream.readableLength, queue.size, queue.pending)
    queue.clear()
    stream.end(err)
  }

  const onQueueJobComplete = (result: QueryEvent): void => {
    if (result != null) {
      stream.push(result)
    }
  }

  const onQueueError = (err: Error): void => {
    log('queue error', err)
    cleanup(err)
  }

  const onQueueIdle = (): void => {
    log('queue idle')
    cleanup()
  }

  // clear the queue and throw if the query is aborted
  const onSignalAbort = (): void => {
    log('abort queue')
    cleanup(new CodeError('Query aborted', 'ERR_QUERY_ABORTED'))
  }

  // the user broke out of the loop early, ensure we resolve the deferred result
  // promise and clear the queue of any remaining jobs
  const onCleanUp = (): void => {
    cleanup()
  }

  // add listeners
  queue.on('completed', onQueueJobComplete)
  queue.on('error', onQueueError)
  queue.on('idle', onQueueIdle)
  signal.addEventListener('abort', onSignalAbort)
  cleanUp.addEventListener('cleanup', onCleanUp)

  try {
    yield * stream
  } finally {
    // remove listeners
    queue.removeListener('completed', onQueueJobComplete)
    queue.removeListener('error', onQueueError)
    queue.removeListener('idle', onQueueIdle)
    signal.removeEventListener('abort', onSignalAbort)
    cleanUp.removeEventListener('cleanup', onCleanUp)
  }
}
