/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const WSlibp2p = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const multiplex = require('../src')

describe('browser-server', () => {
  let ws

  before(() => {
    ws = new WSlibp2p()
  })

  it('ricochet test', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
    const transportSocket = ws.dial(mh)
    const muxedConn = multiplex.dialer(transportSocket)

    muxedConn.on('stream', (conn) => {
      pull(
        conn,
        pull.collect((err, chunks) => {
          expect(err).to.not.exist
          expect(chunks).to.be.eql([Buffer('hey')])
          pull(pull.empty(), conn)
        })
      )
    })

    pull(
      pull.values([Buffer('hey')]),
      muxedConn.newStream(),
      pull.onEnd(done)
    )
  })
})
