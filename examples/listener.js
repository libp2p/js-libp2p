/* eslint-disable no-console */
'use strict'

const tcp = require('net')
import { pipe } from 'it-pipe'
const { toIterable } = require('./util')
const Mplex = require('../src')

const listener = tcp.createServer(async socket => {
  console.log('[listener] Got connection!')

  const muxer = new Mplex({
    async onStream (stream) {
      console.log('[listener] muxed stream opened')
      await pipe(
        stream,
        source => (async function * () {
          for await (const chunk of source) {
            console.log('[listener] received:')
            console.log(chunk.toString())
            yield 'thanks for the message, I am the listener'
          }
        })(),
        stream
      )
      console.log('[listener] muxed stream closed')
    }
  })

  socket = toIterable(socket)
  await pipe(socket, muxer, socket)
  console.log('[listener] socket stream closed')
})

listener.listen(9999, () => console.log('[listener] listening on 9999'))
