import { Multiaddr } from '@multiformats/multiaddr';
import { expect } from 'chai';
import * as underTest from '../src/sdp.js';

const an_sdp = `
v=0
o=- 0 0 IN IP4 192.168.0.152
s=-
c=IN IP4 192.168.0.152
t=0 0
m=application 2345 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=ice-options:ice2
a=ice-ufrag:MyUserFragment
a=ice-pwd:MyUserFragment
a=fingerprint:sha-256 b9:2e:11:cf:23:ff:da:31:bb:bb:5c:0a:9d:d9:0e:20:07:e2:bb:61:2f:1f:94:cf:e5:2e:0e:05:5c:4e:8a:88
a=setup:actpass
a=sctp-port:5000
a=max-message-size:100000
`;

describe('SDP creation', () => {
  it('handles simple blue sky easily enough', async () => {
    let ma = new Multiaddr('/ip4/192.168.0.152/udp/2345/webrtc/certhash/uEiC5LhHPI__aMbu7XAqd2Q4gB-K7YS8flM_lLg4FXE6KiA');
    let ufrag = 'MyUserFragment';
    let sdp = underTest.fromMultiAddr(ma, ufrag);
    expect(sdp.sdp).to.equal(an_sdp);
  });
});

describe('SDP munging', () => {
    it('does a simple replacement', () => {
        let result = underTest.munge({type:'answer',sdp: an_sdp},'someotheruserfragmentstring');
        expect(result.sdp).to.equal(`
v=0
o=- 0 0 IN IP4 192.168.0.152
s=-
c=IN IP4 192.168.0.152
t=0 0
m=application 2345 UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=ice-options:ice2
a=ice-ufrag:someotheruserfragmentstring
a=ice-pwd:someotheruserfragmentstring
a=fingerprint:sha-256 b9:2e:11:cf:23:ff:da:31:bb:bb:5c:0a:9d:d9:0e:20:07:e2:bb:61:2f:1f:94:cf:e5:2e:0e:05:5c:4e:8a:88
a=setup:actpass
a=sctp-port:5000
a=max-message-size:100000
`);
    });
});
