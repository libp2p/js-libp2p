'use strict'
/* eslint-env mocha */

const expect = require('chai').expect
const WSlibp2p = require('../../src')
const multiaddr = require('multiaddr')

describe('libp2p-websockets', function () {
  this.timeout(10000)
  var ws

  it('create', (done) => {
    ws = new WSlibp2p()
    expect(ws).to.exist
    done()
  })

  it('echo', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
    const conn = ws.dial(mh)
    const message = 'Hello World!'
    conn.write(message)
    conn.on('data', (data) => {
      expect(data.toString()).to.equal(message)
      conn.end()
      done()
    })
  })

  describe('stress', () => {
    it('one big write', (done) => {
      const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
      const conn = ws.dial(mh)
      const message = new Buffer(1000000).fill('a').toString('hex')
      conn.write(message)
      conn.on('data', (data) => {
        expect(data.toString()).to.equal(message)
        conn.end()
        done()
      })
    })

    it('many writes in 2 batches', (done) => {
      const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
      const conn = ws.dial(mh)
      let expected = ''
      let counter = 0
      while (++counter < 10000) {
        conn.write(`${counter} `)
        expected += `${counter} `
      }

      setTimeout(() => {
        while (++counter < 20000) {
          conn.write(`${counter} `)
          expected += `${counter} `
        }

        conn.write('STOP')
      }, 1000)

      let result = ''
      conn.on('data', (data) => {
        if (data.toString() === 'STOP') {
          conn.end()
          return
        }
        result += data.toString()
      })

      conn.on('end', () => {
        expect(result).to.equal(expected)
        done()
      })
    })
  })
})
