import { expect } from 'chai';
import * as underTest from '../src/stream.js';
// import { RTCPeerConnection } from 'rtc';

describe('stream stats', () => {
  it('can construct', () => {
    // let pc = new RTCPeerConnection();
    // let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: {} });
    expect(s.stat.timeline.close).to.be.null;
  });
});
