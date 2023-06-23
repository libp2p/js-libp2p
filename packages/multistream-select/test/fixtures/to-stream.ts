import type { ByteStream, RawStream } from '@libp2p/interface/connection'

export function toStream (stream: ByteStream): RawStream {
  return {
    ...stream,
    close: async () => Promise.all([
      stream.readable.cancel(),
      stream.writable.close()
    ]).then(),
    abort: () => {},
    id: `stream-${Math.random()}`,
    direction: 'inbound',
    timeline: {
      open: Date.now()
    },
    metadata: {}
  }
}
