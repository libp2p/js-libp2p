/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const goodbye = require('pull-goodbye')

const WS = require('../src')

require('./compliance.node')

describe('instantiate the transport', () => {
  it('create', () => {
    const ws = new WS()
    expect(ws).to.exist()
  })
})

describe('listen', () => {
  describe('ip4', () => {
    let ws
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')

    beforeEach(() => {
      ws = new WS()
    })

    it('listen, check for callback', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.listen(ma, () => {
        listener.close(done)
      })
    })

    it('listen, check for listening event', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.on('listening', () => {
        listener.close(done)
      })

      listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.on('listening', () => {
        listener.on('close', done)
        listener.close()
      })

      listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', (done) => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const listener = ws.createListener((conn) => { })

      listener.listen(ma, () => {
        listener.close(done)
      })
    })

    it.skip('close listener with connections, through timeout', (done) => {
      // TODO `ws` closes all anyway, we need to make it not close
      // first - https://github.com/diasdavid/simple-websocket-server
    })

    it.skip('listen on port 0', (done) => {
      // TODO port 0 not supported yet
    })

    it.skip('listen on any Interface', (done) => {
      // TODO 0.0.0.0 not supported yet
    })

    it('getAddrs', (done) => {
      const listener = ws.createListener((conn) => {
      })
      listener.listen(ma, () => {
        listener.getAddrs((err, addrs) => {
          expect(err).to.not.exist()
          expect(addrs.length).to.equal(1)
          expect(addrs[0]).to.deep.equal(ma)
          listener.close(done)
        })
      })
    })

    it('getAddrs on port 0 listen', (done) => {
      const addr = multiaddr(`/ip4/127.0.0.1/tcp/0/ws`)
      const listener = ws.createListener((conn) => {
      })
      listener.listen(addr, () => {
        listener.getAddrs((err, addrs) => {
          expect(err).to.not.exist()
          expect(addrs.length).to.equal(1)
          expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
          listener.close(done)
        })
      })
    })

    it('getAddrs from listening on 0.0.0.0', (done) => {
      const addr = multiaddr(`/ip4/0.0.0.0/tcp/9003/ws`)
      const listener = ws.createListener((conn) => {
      })
      listener.listen(addr, () => {
        listener.getAddrs((err, addrs) => {
          expect(err).to.not.exist()
          expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
          listener.close(done)
        })
      })
    })

    it('getAddrs from listening on 0.0.0.0 and port 0', (done) => {
      const addr = multiaddr(`/ip4/0.0.0.0/tcp/0/ws`)
      const listener = ws.createListener((conn) => {
      })
      listener.listen(addr, () => {
        listener.getAddrs((err, addrs) => {
          expect(err).to.not.exist()
          expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
          expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
          listener.close(done)
        })
      })
    })

    it('getAddrs preserves IPFS Id', (done) => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const listener = ws.createListener((conn) => { })

      listener.listen(ma, () => {
        listener.getAddrs((err, addrs) => {
          expect(err).to.not.exist()
          expect(addrs.length).to.equal(1)
          expect(addrs[0]).to.deep.equal(ma)
          listener.close(done)
        })
      })
    })
  })

  describe('ip6', () => {
    let ws
    const ma = multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(() => {
      ws = new WS()
    })

    it('listen, check for callback', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.listen(ma, () => {
        listener.close(done)
      })
    })

    it('listen, check for listening event', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.on('listening', () => {
        listener.close(done)
      })

      listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener((conn) => { })

      listener.on('listening', () => {
        listener.on('close', done)
        listener.close()
      })

      listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', (done) => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const listener = ws.createListener((conn) => { })

      listener.listen(ma, () => {
        listener.close(done)
      })
    })
  })
})

describe('dial', () => {
  describe('ip4', () => {
    let ws
    let listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws')

    beforeEach((done) => {
      ws = new WS()
      listener = ws.createListener((conn) => {
        pull(conn, conn)
      })
      listener.listen(ma, done)
    })

    afterEach((done) => {
      listener.close(done)
    })

    it('dial', (done) => {
      const conn = ws.dial(ma)

      const s = goodbye({
        source: pull.values(['hey']),
        sink: pull.collect((err, result) => {
          expect(err).to.not.exist()

          expect(result).to.be.eql(['hey'])
          done()
        })
      })

      pull(s, conn, s)
    })

    it('dial with IPFS Id', (done) => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = ws.dial(ma)

      const s = goodbye({
        source: pull.values(['hey']),
        sink: pull.collect((err, result) => {
          expect(err).to.not.exist()

          expect(result).to.be.eql(['hey'])
          done()
        })
      })

      pull(s, conn, s)
    })
  })

  describe('ip6', () => {
    let ws
    let listener
    const ma = multiaddr('/ip6/::1/tcp/9091')

    beforeEach((done) => {
      ws = new WS()
      listener = ws.createListener((conn) => {
        pull(conn, conn)
      })
      listener.listen(ma, done)
    })

    afterEach((done) => {
      listener.close(done)
    })

    it('dial', (done) => {
      const conn = ws.dial(ma)

      const s = goodbye({
        source: pull.values(['hey']),
        sink: pull.collect((err, result) => {
          expect(err).to.not.exist()

          expect(result).to.be.eql(['hey'])
          done()
        })
      })

      pull(s, conn, s)
    })

    it('dial with IPFS Id', (done) => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = ws.dial(ma)

      const s = goodbye({
        source: pull.values(['hey']),
        sink: pull.collect((err, result) => {
          expect(err).to.not.exist()

          expect(result).to.be.eql(['hey'])
          done()
        })
      })

      pull(s, conn, s)
    })
  })
})

describe('filter addrs', () => {
  let ws

  before(() => {
    ws = new WS()
  })

  describe('filter valid addrs for this transport', function () {
    it('should fail invalid WS addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = multiaddr('/ip6/::1/tcp/80')
      const ma4 = multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.filter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct ipv4 addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv4 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/80/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 address', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns address', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.filter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter mixed addresses', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma3 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma4 = multiaddr('/dns6/ipfs.io/ws')
      const mh5 = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw' +
        '/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2, ma3, ma4, mh5])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma4)
    })
  })

  it('filter a single addr for this transport', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

    const valid = ws.filter(ma)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(ma)
    done()
  })
})

describe('valid Connection', () => {
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9092/ws')

  it('get observed addrs', (done) => {
    let dialerObsAddrs
    let listenerObsAddrs

    const ws = new WS()

    const listener = ws.createListener((conn) => {
      expect(conn).to.exist()

      conn.getObservedAddrs((err, addrs) => {
        expect(err).to.not.exist()
        dialerObsAddrs = addrs
      })

      pull(conn, conn)
    })

    listener.listen(ma, () => {
      const conn = ws.dial(ma)

      pull(
        pull.empty(),
        conn,
        pull.onEnd(onEnd)
      )

      function onEnd () {
        conn.getObservedAddrs((err, addrs) => {
          expect(err).to.not.exist()
          listenerObsAddrs = addrs

          listener.close(onClose)

          function onClose () {
            expect(listenerObsAddrs[0]).to.deep.equal(ma)
            expect(dialerObsAddrs.length).to.equal(0)
            done()
          }
        })
      }
    })
  })

  it('get Peer Info', (done) => {
    const ws = new WS()

    const listener = ws.createListener((conn) => {
      expect(conn).to.exist()

      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.exist()
      })

      pull(conn, conn)
    })

    listener.listen(ma, () => {
      const conn = ws.dial(ma)

      pull(
        pull.empty(),
        conn,
        pull.onEnd(onEnd)
      )

      function onEnd () {
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.exist()
          listener.close(done)
        })
      }
    })
  })

  it('set Peer Info', (done) => {
    const ws = new WS()

    const listener = ws.createListener((conn) => {
      expect(conn).to.exist()
      conn.setPeerInfo('a')

      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist()
        expect(peerInfo).to.equal('a')
      })

      pull(conn, conn)
    })

    listener.listen(ma, onListen)

    function onListen () {
      const conn = ws.dial(ma)
      conn.setPeerInfo('b')

      pull(
        pull.empty(),
        conn,
        pull.onEnd(onEnd)
      )

      function onEnd () {
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist()
          expect(peerInfo).to.equal('b')
          listener.close(done)
        })
      }
    }
  })
})

describe.skip('turbolence', () => {
  it('dialer - emits error on the other end is terminated abruptly', (done) => {
  })
  it('listener - emits error on the other end is terminated abruptly', (done) => {
  })
})
