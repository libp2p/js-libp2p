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
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
  let ws
  let conn

  beforeEach((done) => {
    ws = new WS()
    expect(ws).to.exist()
    conn = ws.dial(ma, done)
  })

  it('echo', (done) => {
    const message = 'Hello World!'

    const s = goodbye({
      source: pull.values([message]),
      sink: pull.collect((err, results) => {
        expect(err).to.not.exist()
        expect(results).to.be.eql([message])
        done()
      })
    })

    pull(s, conn, s)
  })

  describe('stress', () => {
    it('one big write', (done) => {
      const rawMessage = new Buffer(1000000).fill('a')

      const s = goodbye({
        source: pull.values([rawMessage]),
        sink: pull.collect((err, results) => {
          expect(err).to.not.exist()
          expect(results).to.be.eql([rawMessage])
          done()
        })
      })
      pull(s, conn, s)
    })

    it('many writes', (done) => {
      const s = goodbye({
        source: pull(
          pull.infinite(),
          pull.take(1000),
          pull.map((val) => Buffer(val.toString()))
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
