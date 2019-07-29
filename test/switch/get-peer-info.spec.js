/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const PeerBook = require('peer-book')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const MultiAddr = require('multiaddr')
const TestPeerInfos = require('./test-data/ids.json').infos

const getPeerInfo = require('libp2p-switch/get-peer-info')

describe('Get peer info', () => {
  let peerBook
  let peerInfoA
  let multiaddrA
  let peerIdA

  before((done) => {
    peerBook = new PeerBook()
    PeerId.createFromJSON(TestPeerInfos[0].id, (err, id) => {
      peerIdA = id
      peerInfoA = new PeerInfo(peerIdA)
      multiaddrA = MultiAddr('/ipfs/QmdWYwTywvXBeLKWthrVNjkq9SafEDn1PbAZdz4xZW7Jd9')
      peerInfoA.multiaddrs.add(multiaddrA)
      peerBook.put(peerInfoA)
      done(err)
    })
  })

  it('should be able get peer info from multiaddr', () => {
    let _peerInfo = getPeerInfo(multiaddrA, peerBook)
    expect(peerBook.has(_peerInfo)).to.equal(true)
    expect(peerInfoA).to.deep.equal(_peerInfo)
  })

  it('should return a new PeerInfo with a multiAddr not in the PeerBook', () => {
    let wrongMultiAddr = MultiAddr('/ipfs/QmckZzdVd72h9QUFuJJpQqhsZqGLwjhh81qSvZ9BhB2FQi')
    let _peerInfo = getPeerInfo(wrongMultiAddr, peerBook)
    expect(PeerInfo.isPeerInfo(_peerInfo)).to.equal(true)
    expect(peerBook.has(_peerInfo)).to.equal(false)
  })

  it('should be able get peer info from peer id', () => {
    let _peerInfo = getPeerInfo(multiaddrA, peerBook)
    expect(peerBook.has(_peerInfo)).to.equal(true)
    expect(peerInfoA).to.deep.equal(_peerInfo)
  })

  it('should not be able to get the peer info for a wrong peer id', (done) => {
    PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
      let func = () => {
        getPeerInfo(id, peerBook)
      }

      expect(func).to.throw('Couldnt get PeerInfo')

      done(err)
    })
  })

  it('should add a peerInfo to the book', (done) => {
    PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
      const peerInfo = new PeerInfo(id)
      expect(peerBook.has(peerInfo.id.toB58String())).to.eql(false)

      expect(getPeerInfo(peerInfo, peerBook)).to.exist()
      expect(peerBook.has(peerInfo.id.toB58String())).to.eql(true)
      done(err)
    })
  })

  it('should return the most up to date version of the peer', (done) => {
    const ma1 = MultiAddr('/ip4/0.0.0.0/tcp/8080')
    const ma2 = MultiAddr('/ip6/::/tcp/8080')
    PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
      const peerInfo = new PeerInfo(id)
      peerInfo.multiaddrs.add(ma1)
      expect(getPeerInfo(peerInfo, peerBook)).to.exist()

      const peerInfo2 = new PeerInfo(id)
      peerInfo2.multiaddrs.add(ma2)
      const returnedPeerInfo = getPeerInfo(peerInfo2, peerBook)
      expect(returnedPeerInfo.multiaddrs.toArray()).to.contain.members([
        ma1, ma2
      ])
      done(err)
    })
  })

  it('an invalid peer type should throw an error', () => {
    let func = () => {
      getPeerInfo('/ip4/127.0.0.1/tcp/1234', peerBook)
    }

    expect(func).to.throw('peer type not recognized')
  })
})
