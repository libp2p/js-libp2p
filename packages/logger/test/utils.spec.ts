import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { truncatePeerId } from '../src/utils.js'

describe('utils', () => {
  it('should truncate a peer id', () => {
    const peerId = peerIdFromString('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    expect(truncatePeerId(peerId)).to.equal('Qm…dAZb')
  })
})
