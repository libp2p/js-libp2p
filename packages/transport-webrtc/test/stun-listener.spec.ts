import { expect } from 'aegir/chai'
import { isElectronMain, isNode } from 'wherearewe'
import { createDialerRTCPeerConnection } from '../src/private-to-public/utils/get-rtcpeerconnection.ts'
import { getIcePwdFromSdp } from '../src/private-to-public/utils/sdp.ts'
import { parseStunUsernameUfrags } from '../src/private-to-public/utils/stun.ts'

function getIceUfragFromSdp (sdp: string | undefined): string | undefined {
  return sdp?.match(/^a=ice-ufrag:(?<ufrag>[^\r\n]+)$/m)?.groups?.ufrag
}

describe('stun listener username parsing', () => {
  it('should parse server and client ufrags from the username', () => {
    const result = parseStunUsernameUfrags('libp2p+webrtc+v2/server', 'browserClient')

    expect(result).to.deep.equal({
      serverUfrag: 'libp2p+webrtc+v2/server',
      clientUfrag: 'browserClient'
    })
  })

  it('should reject malformed usernames', () => {
    expect(parseStunUsernameUfrags('', 'browserClient')).to.be.undefined()
    expect(parseStunUsernameUfrags('libp2p+webrtc+v2/server', '')).to.be.undefined()
  })

  it('should support pre-seeded distinct v2 ICE credentials on node', async function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const clientUfrag = 'clientUfrag123456'
    const clientPwd = 'clientPassword1234567890'
    const { peerConnection } = await createDialerRTCPeerConnection('client', clientUfrag, {
      pwd: clientPwd
    })
    peerConnection.createDataChannel('', { negotiated: true, id: 0 })

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      expect(getIceUfragFromSdp(peerConnection.localDescription?.sdp)).to.equal(clientUfrag)
      expect(getIcePwdFromSdp(peerConnection.localDescription?.sdp)).to.equal(clientPwd)
    } finally {
      peerConnection.close()
    }
  })
})
