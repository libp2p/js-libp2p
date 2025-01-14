import { peerIdFromCID } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { truncatePeerId } from '../src/utils.js'

describe('utils', () => {
  it('should truncate a peer id', () => {
    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')
    const peerId = peerIdFromCID(cid)

    expect(truncatePeerId(peerId)).to.equal('Qm…dAZb')
  })
})
