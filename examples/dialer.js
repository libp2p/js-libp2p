/* eslint-disable no-console */
'use strict'

const tcp = require('net')
import { pipe } from 'it-pipe'
const { toIterable } = require('./util')
const Mplex = require('../src')

const socket = toIterable(tcp.connect(9999))
console.log('[dialer] socket stream opened')

const controller = new AbortController()

const muxer = new Mplex({ signal: controller.signal })

const pipeMuxerToSocket = async () => {
  await pipe(muxer, socket, muxer)
  console.log('[dialer] socket stream closed')
}

const sendAndReceive = async () => {
  const muxedStream = muxer.newStream()
  console.log('[dialer] muxed stream opened')

  await pipe(
    ['hey, how is it going. I am the dialer'],
    muxedStream,
    async source => {
      for await (const chunk of source) {
        console.log('[dialer] received:')
        console.log(chunk.toString())
      }
    }
  )
  console.log('[dialer] muxed stream closed')

  // Close the socket stream after 1s
  setTimeout(() => controller.abort(), 1000)
}

pipeMuxerToSocket()
sendAndReceive()
