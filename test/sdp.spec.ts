import { Multiaddr } from '@multiformats/multiaddr';
import { expect } from 'chai';
import * as underTest from '../src/sdp.js';
import { bases } from 'multiformats/basics';
import * as multihashes from 'multihashes';

const an_sdp = `v=0
o=- 0 0 IN IP4 192.168.0.152
s=-
c=IN IP4 192.168.0.152
t=0 0
a=ice-lite
m=application 2345 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:active
a=ice-options:ice2
a=ice-ufrag:MyUserFragment
a=ice-pwd:MyUserFragment
a=fingerprint:sha-256 b9:2e:11:cf:23:ff:da:31:bb:bb:5c:0a:9d:d9:0e:20:07:e2:bb:61:2f:1f:94:cf:e5:2e:0e:05:5c:4e:8a:88
a=sctp-port:5000
a=max-message-size:100000
a=candidate:1 1 UDP 1 192.168.0.152 2345 typ host`;

describe('SDP creation', () => {
  it('handles simple blue sky easily enough', async () => {
    return;
    let ma = new Multiaddr('/ip4/192.168.0.152/udp/2345/webrtc/certhash/uEiC5LhHPI__aMbu7XAqd2Q4gB-K7YS8flM_lLg4FXE6KiA');
    let ufrag = 'MyUserFragment';
    let sdp = underTest.fromMultiAddr(ma, ufrag);
    expect(sdp.sdp).to.equal(an_sdp);
  });

  it('extracts certhash', () => {
    let ma = new Multiaddr('/ip4/0.0.0.0/udp/56093/webrtc/certhash/uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ');
    let c = underTest.certhash(ma);
    expect(c).to.equal('uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ');
    const mbdecoder = (function () {
      const decoders = Object.values(bases).map((b) => b.decoder);
      let acc = decoders[0].or(decoders[1]);
      decoders.slice(2).forEach((d) => (acc = acc.or(d)));
      return acc;
    })();

    let mbdecoded = mbdecoder.decode(c);
    let mhdecoded = multihashes.decode(mbdecoded);
    //sha2-256	multihash	0x12	permanent
    //  https://github.com/multiformats/multicodec/blob/master/table.csv
    expect(mhdecoded.name).to.equal('sha2-256');
    expect(mhdecoded.code).to.equal(0x12);
    expect(mhdecoded.length).to.equal(32);
    expect(mhdecoded.digest.toString()).to.equal('114,104,71,205,72,176,94,197,96,77,21,156,191,64,29,111,0,161,35,236,144,23,14,44,209,179,143,210,157,55,229,177');
  });
});

describe('SDP munging', () => {
  it('does a simple replacement', () => {
    let result = underTest.munge({ type: 'answer', sdp: an_sdp }, 'someotheruserfragmentstring');
    expect(result.sdp).to.equal(`v=0
o=- 0 0 IN IP4 192.168.0.152
s=-
c=IN IP4 192.168.0.152
t=0 0
a=ice-lite
m=application 2345 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:active
a=ice-options:ice2
a=ice-ufrag:someotheruserfragmentstring
a=ice-pwd:someotheruserfragmentstring
a=fingerprint:sha-256 b9:2e:11:cf:23:ff:da:31:bb:bb:5c:0a:9d:d9:0e:20:07:e2:bb:61:2f:1f:94:cf:e5:2e:0e:05:5c:4e:8a:88
a=sctp-port:5000
a=max-message-size:100000
a=candidate:1 1 UDP 1 192.168.0.152 2345 typ host`);
  });
});
