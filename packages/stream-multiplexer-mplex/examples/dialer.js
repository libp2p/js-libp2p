/* eslint-disable no-console */
'use strict'

import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import tcp from 'net'
import { pipe } from 'it-pipe'
import { toIterable } from './util.js'
import { Mplex } from '../dist/src/index.js'

const socket = toIterable(tcp.connect(9999))
console.log('[dialer] socket stream opened')

const controller = new AbortController()

const factory = new Mplex({ signal: controller.signal })
const muxer = factory.createStreamMuxer()

const pipeMuxerToSocket = async () => {
  await pipe(muxer, socket, muxer)
  console.log('[dialer] socket stream closed')
}

const sendAndReceive = async () => {
  const muxedStream = muxer.newStream('hello')
  console.log('[dialer] muxed stream opened')

  await pipe(
    [uint8ArrayFromString('hey, how is it going. I am the dialer')],
    muxedStream,
    async source => {
      for await (const chunk of source) {
        console.log('[dialer] received:')
        console.log(uint8ArrayToString(chunk.slice()))
      }
    }
  )
  console.log('[dialer] muxed stream closed')

  // Close the socket stream after 1s
  setTimeout(() => controller.abort(), 1000)
}

pipeMuxerToSocket()
sendAndReceive()
