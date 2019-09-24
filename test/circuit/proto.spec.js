/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')

const proto = require('../../src/circuit/protocol')

describe('protocol', function () {
  let msgObject = null
  let message = null

  before(() => {
    msgObject = {
      type: proto.CircuitRelay.Type.HOP,
      srcPeer: {
        id: Buffer.from('QmSource'),
        addrs: [
          multiaddr('/p2p-circuit/ipfs/QmSource').buffer,
          multiaddr('/p2p-circuit/ip4/0.0.0.0/tcp/9000/ipfs/QmSource').buffer,
          multiaddr('/ip4/0.0.0.0/tcp/9000/ipfs/QmSource').buffer
        ]
      },
      dstPeer: {
        id: Buffer.from('QmDest'),
        addrs: [
          multiaddr('/p2p-circuit/ipfs/QmDest').buffer,
          multiaddr('/p2p-circuit/ip4/1.1.1.1/tcp/9000/ipfs/QmDest').buffer,
          multiaddr('/ip4/1.1.1.1/tcp/9000/ipfs/QmDest').buffer
        ]
      }
    }

    const buff = proto.CircuitRelay.encode(msgObject)
    message = proto.CircuitRelay.decode(buff)
  })

  it('should source and dest', () => {
    expect(message.srcPeer).to.deep.equal(msgObject.srcPeer)
    expect(message.dstPeer).to.deep.equal(msgObject.dstPeer)
  })

  it('should encode message', () => {
    expect(message.message).to.deep.equal(msgObject.message)
  })
})
