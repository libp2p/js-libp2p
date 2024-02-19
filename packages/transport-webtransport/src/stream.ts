import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, ComponentLogger, Direction, Stream } from '@libp2p/interface'
import type { Source } from 'it-stream-types'

export async function webtransportBiDiStreamToStream (bidiStream: WebTransportBidirectionalStream, streamId: string, direction: Direction, activeStreams: Stream[], onStreamEnd: undefined | ((s: Stream) => void), logger: ComponentLogger): Promise<Stream> {
  const log = logger.forComponent(`libp2p:webtransport:stream:${direction}:${streamId}`)
  const writer = bidiStream.writable.getWriter()
  const reader = bidiStream.readable.getReader()
  await writer.ready

  function cleanupStreamFromActiveStreams (): void {
    const index = activeStreams.findIndex(s => s === stream)
    if (index !== -1) {
      activeStreams.splice(index, 1)
      stream.timeline.close = Date.now()
      onStreamEnd?.(stream)
    }
  }

  let writerClosed = false
  let readerClosed = false;
  (async function () {
    const err: Error | undefined = await writer.closed.catch((err: Error) => err)
    if (err != null) {
      const msg = err.message
      if (!(msg.includes('aborted by the remote server') || msg.includes('STOP_SENDING'))) {
        log.error(`WebTransport writer closed unexpectedly: streamId=${streamId} err=${err.message}`)
      }
    }
    writerClosed = true
    if (writerClosed && readerClosed) {
      cleanupStreamFromActiveStreams()
    }
  })().catch(() => {
    log.error('WebTransport failed to cleanup closed stream')
  });

  (async function () {
    const err: Error | undefined = await reader.closed.catch((err: Error) => err)
    if (err != null) {
      log.error(`WebTransport reader closed unexpectedly: streamId=${streamId} err=${err.message}`)
    }
    readerClosed = true
    if (writerClosed && readerClosed) {
      cleanupStreamFromActiveStreams()
    }
  })().catch(() => {
    log.error('WebTransport failed to cleanup closed stream')
  })

  let sinkSunk = false
  const stream: Stream = {
    id: streamId,
    status: 'open',
    writeStatus: 'ready',
    readStatus: 'ready',
    abort (err: Error) {
      if (!writerClosed) {
        writer.abort(err)
          .catch(err => {
            log.error('could not abort stream', err)
          })
        writerClosed = true
      }
      readerClosed = true

      this.status = 'aborted'
      this.writeStatus = 'closed'
      this.readStatus = 'closed'

      this.timeline.reset =
        this.timeline.close =
        this.timeline.closeRead =
        this.timeline.closeWrite = Date.now()

      cleanupStreamFromActiveStreams()
    },
    async close (options?: AbortOptions) {
      this.status = 'closing'

      await Promise.all([
        stream.closeRead(options),
        stream.closeWrite(options)
      ])

      cleanupStreamFromActiveStreams()

      this.status = 'closed'
      this.timeline.close = Date.now()
    },

    async closeRead (options?: AbortOptions) {
      if (!readerClosed) {
        this.readStatus = 'closing'

        try {
          await reader.cancel()
        } catch (err: any) {
          if (err.toString().includes('RESET_STREAM') === true) {
            writerClosed = true
          }
        }

        this.timeline.closeRead = Date.now()
        this.readStatus = 'closed'

        readerClosed = true
      }

      if (writerClosed) {
        cleanupStreamFromActiveStreams()
      }
    },

    async closeWrite (options?: AbortOptions) {
      if (!writerClosed) {
        writerClosed = true

        this.writeStatus = 'closing'

        try {
          await writer.close()
        } catch (err: any) {
          if (err.toString().includes('RESET_STREAM') === true) {
            readerClosed = true
          }
        }

        this.timeline.closeWrite = Date.now()
        this.writeStatus = 'closed'
      }

      if (readerClosed) {
        cleanupStreamFromActiveStreams()
      }
    },
    direction,
    timeline: { open: Date.now() },
    metadata: {},
    source: (async function * () {
      while (true) {
        const val = await reader.read()
        if (val.done) {
          readerClosed = true
          if (writerClosed) {
            cleanupStreamFromActiveStreams()
          }
          return
        }

        yield new Uint8ArrayList(val.value)
      }
    })(),
    sink: async function (source: Source<Uint8Array | Uint8ArrayList>) {
      if (sinkSunk) {
        throw new Error('sink already called on stream')
      }
      sinkSunk = true
      try {
        this.writeStatus = 'writing'

        for await (const chunks of source) {
          if (chunks instanceof Uint8Array) {
            await writer.write(chunks)
          } else {
            for (const buf of chunks) {
              await writer.write(buf)
            }
          }
        }

        this.writeStatus = 'done'
      } finally {
        this.timeline.closeWrite = Date.now()
        this.writeStatus = 'closed'

        await stream.closeWrite()
      }
    },
    log
  }

  return stream
}
