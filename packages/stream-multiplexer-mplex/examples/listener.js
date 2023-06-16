/* eslint-disable no-console */
'use strict'

import tcp from 'net'
import { pipe } from 'it-pipe'
import { toIterable } from './util.js'
import { Mplex } from '../dist/src/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const listener = tcp.createServer(async socket => {
  console.log('[listener] Got connection!')

  const factory = new Mplex()
  socket = toIterable(socket)
  const muxer = factory.createStreamMuxer({
    onIncomingStream: async (stream) => {
      console.log('[listener] muxed stream opened, id:', stream.id)
      await pipe(
        stream,
        source => (async function * () {
          for await (const chunk of source) {
            console.log('[listener] received:')
            console.log(uint8ArrayToString(chunk.slice()))
            yield uint8ArrayFromString('thanks for the message, I am the listener')
          }
        })(),
        stream
      )
      console.log('[listener] muxed stream closed')
    }
  })
  await pipe(socket, muxer, socket)
  console.log('[listener] socket stream closed')
})

listener.listen(9999, () => console.log('[listener] listening on 9999'))
