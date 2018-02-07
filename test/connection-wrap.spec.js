/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')
const multiaddr = require('multiaddr')
const Connection = require('interface-connection').Connection

describe('Connection Wrap', () => {
  let tcp
  let listener
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  beforeEach((done) => {
    tcp = new TCP()
    listener = tcp.createListener((conn) => {
      pull(conn, conn)
    })
    listener.on('listening', done)
    listener.listen(ma)
  })

  afterEach((done) => {
    listener.close(done)
  })

  it('simple wrap', (done) => {
    const conn = tcp.dial(ma)
    conn.setPeerInfo('peerInfo')
    const connWrap = new Connection(conn)
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist()
        expect(chunks).to.be.eql([Buffer.from('hey')])

        connWrap.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist()
          expect(peerInfo).to.equal('peerInfo')
          done()
        })
      })
    )
  })

  it('buffer wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap = new Connection()
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist()
        expect(chunks).to.be.eql([Buffer.from('hey')])
        done()
      })
    )

    connWrap.setInnerConn(conn)
  })

  it('overload wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap = new Connection(conn)
    connWrap.getPeerInfo = (callback) => {
      callback(null, 'none')
    }
    conn.getPeerInfo((err, peerInfo) => {
      expect(err).to.exist()
    })
    connWrap.getPeerInfo((err, peerInfo) => {
      expect(err).to.not.exist()
      expect(peerInfo).to.equal('none')
    })
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist()
        expect(chunks).to.be.eql([Buffer.from('hey')])
        done()
      })
    )
  })

  it('dial error', (done) => {
    tcp.dial(multiaddr('/ip4/999.0.0.1/tcp/1234'), (err) => {
      expect(err).to.exist()
      done()
    })
  })

  it('matryoshka wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap1 = new Connection(conn)
    const connWrap2 = new Connection(connWrap1)
    const connWrap3 = new Connection(connWrap2)

    conn.getPeerInfo = (callback) => {
      callback(null, 'inner doll')
    }
    pull(
      pull.values(['hey']),
      connWrap3,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist()
        expect(chunks).to.eql([Buffer.from('hey')])
        connWrap3.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist()
          expect(peerInfo).to.equal('inner doll')
          done()
        })
      })
    )
  })
})
