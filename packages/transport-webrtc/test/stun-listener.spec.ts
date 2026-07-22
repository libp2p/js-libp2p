import { expect } from 'aegir/chai'
import { isElectronMain, isNode } from 'wherearewe'
import { createDialerRTCPeerConnection } from '../src/private-to-public/utils/get-rtcpeerconnection.ts'
import { decodeV2ClientPwd, getIcePwdFromSdp } from '../src/private-to-public/utils/sdp.ts'
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

  it('should reject ufrags outside the RFC 8839 ice-char set or length bounds', () => {
    // CRLF / SDP injection attempt
    expect(parseStunUsernameUfrags('libp2p+webrtc+v2/aaaa\r\na=candidate:x', 'browserClient')).to.be.undefined()
    // ':' is not an ice-char
    expect(parseStunUsernameUfrags('libp2p+webrtc+v2/aaaa', 'ab:cd')).to.be.undefined()
    // too short (< 4 chars)
    expect(parseStunUsernameUfrags('abc', 'browserClient')).to.be.undefined()
    // too long (> 256 chars)
    expect(parseStunUsernameUfrags('a'.repeat(257), 'browserClient')).to.be.undefined()
    // multi-byte input: String.length (UTF-16) differs from the byte length
    // go-libp2p measures, but both reject it on the charset check
    /* spell-checker:disable-next-line */
    expect(parseStunUsernameUfrags('abécd', 'browserClient')).to.be.undefined()
    expect(parseStunUsernameUfrags('ab😀cd', 'browserClient')).to.be.undefined()
  })

  it('decodeV2ClientPwd validates the recovered ICE password', () => {
    const pwd = 'a'.repeat(24)
    expect(decodeV2ClientPwd(`libp2p+webrtc+v2/${pwd}`)).to.equal(pwd)
    // wrong prefix
    expect(decodeV2ClientPwd(`libp2p+webrtc+v1/${pwd}`)).to.be.undefined()
    // too short (< 22 chars)
    expect(decodeV2ClientPwd('libp2p+webrtc+v2/short')).to.be.undefined()
    // non-ice-char (CRLF)
    expect(decodeV2ClientPwd(`libp2p+webrtc+v2/${'a'.repeat(22)}\r\n`)).to.be.undefined()
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
