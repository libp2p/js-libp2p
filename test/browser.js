/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const goodbye = require('pull-goodbye')

const WS = require('../src')

describe('libp2p-websockets', () => {
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  let ws
  let conn

  beforeEach((done) => {
    ws = new WS()
    expect(ws).to.exist()
    conn = ws.dial(ma, (err, res) => {
      expect(err).to.not.exist()
      done()
    })
  })

  it('echo', (done) => {
    const message = 'Hello World!'

    const s = goodbye({
      source: pull.values([message]),
      sink: pull.collect((err, results) => {
        expect(err).to.not.exist()
        expect(results).to.eql([message])
        done()
      })
    })

    pull(s, conn, s)
  })

  describe('stress', () => {
    it('one big write', (done) => {
      const rawMessage = Buffer.allocUnsafe(1000000).fill('a')

      const s = goodbye({
        source: pull.values([rawMessage]),
        sink: pull.collect((err, results) => {
          expect(err).to.not.exist()
          expect(results).to.eql([rawMessage])
          done()
        })
      })
      pull(s, conn, s)
    })

    it('many writes', function (done) {
      this.timeout(10000)
      const s = goodbye({
        source: pull(
          pull.infinite(),
          pull.take(1000),
          pull.map((val) => Buffer.from(val.toString()))
        ),
        sink: pull.collect((err, result) => {
          expect(err).to.not.exist()
          expect(result).to.have.length(1000)
          done()
        })
      })

      pull(s, conn, s)
    })
  })
})

it('.createServer throws in browser', () => {
  expect(new WS().createListener).to.throw()
})
