/* eslint-env mocha */

const expect = require('chai').expect
const streamPair = require('stream-pair')
const multiplex = require('../src')

describe('multiplex', () => {
  var listenerSocket
  var dialerSocket

  var listener
  var dialer

  before((done) => {
    const pair = streamPair.create()
    dialerSocket = pair
    listenerSocket = pair.other
    done()
  })

  it('attach to a duplex stream, as listener', (done) => {
    listener = multiplex(listenerSocket, true)
    expect(listener).to.exist
    done()
  })

  it('attach to a duplex stream, as dialer', (done) => {
    dialer = multiplex(dialerSocket, false)
    expect(dialer).to.exist
    done()
  })

  it('open a multiplex stream from client', (done) => {
    listener.once('stream', (conn) => {
      conn.pipe(conn)
    })

    const conn = dialer.newStream()

    conn.on('error', (err) => {
      expect(err).to.not.exist
    })

    conn.on('data', () => {}) // otherwise data doesn't flow
    conn.on('end', done)
    conn.end()
  })

  it('open a multiplex stream from server', (done) => {
    dialer.once('stream', (conn) => {
      conn.pipe(conn)
    })

    const conn = listener.newStream()

    conn.on('error', (err) => {
      expect(err).to.not.exist
    })

    conn.on('data', () => {}) // otherwise data doesn't flow
    conn.on('end', done)
    conn.end()
  })
})
