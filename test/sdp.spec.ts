import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'chai'
import * as underTest from '../src/sdp'

const sampleMultiAddr = multiaddr('/ip4/0.0.0.0/udp/56093/webrtc/certhash/uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ')
const sampleCerthash = 'uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ'
const sampleSdp = `v=0
o=- 0 0 IN IP4 0.0.0.0
s=-
c=IN IP4 0.0.0.0
t=0 0
a=ice-lite
m=application 56093 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:passive
a=ice-ufrag:MyUserFragment
a=ice-pwd:MyUserFragment
a=fingerprint:SHA-256 72:68:47:CD:48:B0:5E:C5:60:4D:15:9C:BF:40:1D:6F:00:A1:23:EC:90:17:0E:2C:D1:B3:8F:D2:9D:37:E5:B1
a=sctp-port:5000
a=max-message-size:100000
a=candidate:1467250027 1 UDP 1467250027 0.0.0.0 56093 typ host`

describe('SDP', () => {
  it('converts multiaddr with certhash to an answer SDP', async () => {
    const ufrag = 'MyUserFragment'
    const sdp = underTest.fromMultiAddr(sampleMultiAddr, ufrag)

    expect(sdp.sdp).to.contain(sampleSdp)
  })

  it('extracts certhash from a multiaddr', () => {
    const certhash = underTest.certhash(sampleMultiAddr)

    expect(certhash).to.equal(sampleCerthash)
  })

  it('decodes a certhash', () => {
    const decoded = underTest.decodeCerthash(sampleCerthash)

    // sha2-256 multihash 0x12 permanent
    // https://github.com/multiformats/multicodec/blob/master/table.csv
    expect(decoded.name).to.equal('sha2-256')
    expect(decoded.code).to.equal(0x12)
    expect(decoded.length).to.equal(32)
    expect(decoded.digest.toString()).to.equal('114,104,71,205,72,176,94,197,96,77,21,156,191,64,29,111,0,161,35,236,144,23,14,44,209,179,143,210,157,55,229,177')
  })

  it('converts a multiaddr into a fingerprint', () => {
    const fingerpint = underTest.ma2Fingerprint(sampleMultiAddr)
    expect(fingerpint).to.deep.equal([
      'SHA-256 72:68:47:CD:48:B0:5E:C5:60:4D:15:9C:BF:40:1D:6F:00:A1:23:EC:90:17:0E:2C:D1:B3:8F:D2:9D:37:E5:B1',
      '726847cd48b05ec5604d159cbf401d6f00a123ec90170e2cd1b38fd29d37e5b1'
    ])
  })

  it('munges the ufrag and pwd in a SDP', () => {
    const result = underTest.munge({ type: 'answer', sdp: sampleSdp }, 'someotheruserfragmentstring')
    const expected = `v=0
o=- 0 0 IN IP4 0.0.0.0
s=-
c=IN IP4 0.0.0.0
t=0 0
a=ice-lite
m=application 56093 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:passive
a=ice-ufrag:someotheruserfragmentstring
a=ice-pwd:someotheruserfragmentstring
a=fingerprint:SHA-256 72:68:47:CD:48:B0:5E:C5:60:4D:15:9C:BF:40:1D:6F:00:A1:23:EC:90:17:0E:2C:D1:B3:8F:D2:9D:37:E5:B1
a=sctp-port:5000
a=max-message-size:100000
a=candidate:1467250027 1 UDP 1467250027 0.0.0.0 56093 typ host`

    expect(result.sdp).to.equal(expected)
  })
})
