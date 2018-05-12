/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const each = require('async/each')
const map = require('async/map')
const series = require('async/series')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-mplex')
const pull = require('pull-stream')
const secio = require('libp2p-secio')
const PeerBook = require('peer-book')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('../src')

describe('Stats', () => {
  const setup = (cb) => {
    createInfos(2, (err, infos) => {
      expect(err).to.not.exist()

      const options = {
        stats: {
          computeThrottleTimeout: 100
        }
      }

      const peerA = infos[0]
      const peerB = infos[1]

      peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/0')

      const switchA = new Switch(peerA, new PeerBook(), options)
      const switchB = new Switch(peerB, new PeerBook(), options)

      switchA.transport.add('tcp', new TCP())
      switchB.transport.add('tcp', new TCP())

      switchA.connection.crypto(secio.tag, secio.encrypt)
      switchB.connection.crypto(secio.tag, secio.encrypt)

      switchA.connection.addStreamMuxer(multiplex)
      switchB.connection.addStreamMuxer(multiplex)

      parallel([
        (cb) => switchA.transport.listen('tcp', {}, null, cb),
        (cb) => switchB.transport.listen('tcp', {}, null, cb)
      ], (err) => {
        if (err) {
          cb(err)
          return
        }
        const echo = (protocol, conn) => pull(conn, conn)
        switchB.handle('/echo/1.0.0', echo)
        switchA.handle('/echo/1.0.0', echo)

        parallel([
          (cb) => {
            switchA.dial(switchB._peerInfo, '/echo/1.0.0', (err, conn) => {
              expect(err).to.not.exist()
              tryEcho(conn, cb)
            })
          },
          (cb) => {
            switchB.dial(switchA._peerInfo, '/echo/1.0.0', (err, conn) => {
              expect(err).to.not.exist()
              tryEcho(conn, cb)
            })
          }
        ], (err) => {
          if (err) {
            cb(err)
            return
          }

          // wait until stats are processed
          let pending = 12
          switchA.stats.on('update', waitForUpdate)
          switchB.stats.on('update', waitForUpdate)

          function waitForUpdate () {
            if (--pending === 0) {
              switchA.stats.removeListener('update', waitForUpdate)
              switchB.stats.removeListener('update', waitForUpdate)
              cb(null, [switchA, switchB])
            }
          }
        })
      })
    })
  }

  const teardown = (switches, cb) => {
    map(switches, (swtch, cb) => swtch.stop(cb), cb)
  }

  it('both nodes have some global stats', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()

      switches.forEach((swtch) => {
        let snapshot = swtch.stats.global.snapshot
        expect(snapshot.dataReceived.toFixed()).to.equal('2426')
        expect(snapshot.dataSent.toFixed()).to.equal('2426')
      })

      teardown(switches, done)
    })
  })

  it('both nodes know the transports', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      const expectedTransports = [
        'tcp'
      ]

      switches.forEach(
        (swtch) => expect(swtch.stats.transports().sort()).to.deep.equal(expectedTransports))
      teardown(switches, done)
    })
  })

  it('both nodes know the protocols', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      const expectedProtocols = [
        '/echo/1.0.0',
        '/mplex/6.7.0',
        '/secio/1.0.0'
      ]

      switches.forEach((swtch) => {
        expect(swtch.stats.protocols().sort()).to.deep.equal(expectedProtocols)
      })

      teardown(switches, done)
    })
  })

  it('both nodes know about each other', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      switches.forEach(
        (swtch, index) => {
          const otherSwitch = selectOther(switches, index)
          expect(swtch.stats.peers().sort()).to.deep.equal([otherSwitch._peerInfo.id.toB58String()])
        })
      teardown(switches, done)
    })
  })

  it('both have transport-specific stats', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      switches.forEach((swtch) => {
        let snapshot = swtch.stats.forTransport('tcp').snapshot
        expect(snapshot.dataReceived.toFixed()).to.equal('2426')
        expect(snapshot.dataSent.toFixed()).to.equal('2426')
      })
      teardown(switches, done)
    })
  })

  it('both have protocol-specific stats', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      switches.forEach((swtch) => {
        let snapshot = swtch.stats.forProtocol('/echo/1.0.0').snapshot
        expect(snapshot.dataReceived.toFixed()).to.equal('4')
        expect(snapshot.dataSent.toFixed()).to.equal('4')
      })
      teardown(switches, done)
    })
  })

  it('both have peer-specific stats', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      switches.forEach((swtch, index) => {
        const other = selectOther(switches, index)
        let snapshot = swtch.stats.forPeer(other._peerInfo.id.toB58String()).snapshot
        expect(snapshot.dataReceived.toFixed()).to.equal('2426')
        expect(snapshot.dataSent.toFixed()).to.equal('2426')
      })
      teardown(switches, done)
    })
  })

  it('both have moving average stats for peer', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      switches.forEach((swtch, index) => {
        const other = selectOther(switches, index)
        let ma = swtch.stats.forPeer(other._peerInfo.id.toB58String()).movingAverages
        const intervals = [60000, 300000, 900000]
        intervals.forEach((interval) => {
          const average = ma.dataReceived[interval].movingAverage()
          expect(average).to.be.above(0).below(100)
        })
      })
      teardown(switches, done)
    })
  })

  it('retains peer after disconnect', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      let index = -1
      each(switches, (swtch, cb) => {
        swtch.once('peer-mux-closed', () => cb())
        index++
        swtch.hangUp(selectOther(switches, index)._peerInfo, (err) => {
          expect(err).to.not.exist()
        })
      },
      (err) => {
        expect(err).to.not.exist()
        switches.forEach((swtch, index) => {
          const other = selectOther(switches, index)
          const snapshot = swtch.stats.forPeer(other._peerInfo.id.toB58String()).snapshot
          expect(snapshot.dataReceived.toFixed()).to.equal('2426')
          expect(snapshot.dataSent.toFixed()).to.equal('2426')
        })
        teardown(switches, done)
      })
    })
  })

  it('retains peer after reconnect', (done) => {
    setup((err, switches) => {
      expect(err).to.not.exist()
      series([
        (cb) => {
          let index = -1
          each(switches, (swtch, cb) => {
            swtch.once('peer-mux-closed', () => cb())
            index++
            swtch.hangUp(selectOther(switches, index)._peerInfo, (err) => {
              expect(err).to.not.exist()
            })
          }, cb)
        },
        (cb) => {
          let index = -1
          each(switches, (swtch, cb) => {
            index++
            const other = selectOther(switches, index)
            swtch.dial(other._peerInfo, '/echo/1.0.0', (err, conn) => {
              expect(err).to.not.exist()
              tryEcho(conn, cb)
            })
          }, cb)
        },
        (cb) => setTimeout(cb, 1000),
        (cb) => {
          switches.forEach((swtch, index) => {
            const other = selectOther(switches, index)
            const snapshot = swtch.stats.forPeer(other._peerInfo.id.toB58String()).snapshot
            expect(snapshot.dataReceived.toFixed()).to.equal('4852')
            expect(snapshot.dataSent.toFixed()).to.equal('4852')
          })
          teardown(switches, done)
        }
      ], done)
    })
  })
})

function selectOther (array, index) {
  const useIndex = (index + 1) % array.length
  return array[useIndex]
}
