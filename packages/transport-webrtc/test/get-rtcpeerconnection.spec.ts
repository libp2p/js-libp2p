import { expect } from 'aegir/chai'
import { isNode, isElectronMain } from 'wherearewe'
import { createDialerRTCPeerConnection } from '../src/private-to-public/utils/get-rtcpeerconnection.ts'

describe('webrtc-direct DirectRTCPeerConnection ufrag backstop', () => {
  it('rejects createAnswer with an invalid ufrag instead of aborting the process', async function () {
    // exercises the native node-datachannel answer path, which only runs in node
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    // 'controlled' is too short to be a valid ICE password. It is reused as the
    // ICE password during the answer, and without the guard node-datachannel
    // aborts the whole process with SIGABRT instead of throwing.
    const { peerConnection } = await createDialerRTCPeerConnection('server', 'controlled')

    try {
      const err = await peerConnection.createAnswer().then(
        () => { throw new Error('createAnswer should have rejected for an invalid ufrag') },
        (err: unknown) => err
      )
      expect(err).to.have.property('name', 'InvalidParametersError')
    } finally {
      peerConnection.close()
    }
  })
})
