import { expect } from 'chai';
import * as underTest from '../src/stream.js';

describe('stream stats', () => {
  it('can construct', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.stat.timeline.close).to.not.exist();
  });

  it('close marks it closed', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    expect(s.stat.timeline.close).to.not.exist();
    s.close();
    expect(s.closed).to.equal(true);
    expect(s.readClosed).to.equal(true);
    expect(s.writeClosed).to.equal(true);
    expect(s.stat.timeline.close).to.exist();
  });

  it('closeRead marks it read-closed only', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    s.closeRead();
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(true);
    expect(s.writeClosed).to.equal(false);
  });

  it('closeWrite marks it write-closed only', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    s.closeWrite();
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(true);
  });

  it('closeWrite AND closeRead = close', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    s.closeRead();
    s.closeWrite();
    expect(s.closed).to.equal(true);
    expect(s.readClosed).to.equal(true);
    expect(s.writeClosed).to.equal(true);
  });

  it('abort = close', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    expect(s.stat.timeline.close).to.not.exist();
    s.abort({ name: 'irrelevant', message: 'this parameter is actually ignored' });
    expect(s.closed).to.equal(true);
    expect(s.readClosed).to.equal(true);
    expect(s.writeClosed).to.equal(true);
    expect(s.stat.timeline.close).to.exist();
    expect(s.stat.timeline.close).to.be.greaterThan(s.stat.timeline.open);
  });

  it('reset = close + newStat', () => {
    let pc = new RTCPeerConnection();
    let dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 });
    let s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') });
    expect(s.closed).to.equal(false);
    expect(s.readClosed).to.equal(false);
    expect(s.writeClosed).to.equal(false);
    expect(s.stat.timeline.close).to.not.exist();
    s.reset();
    expect(s.closed).to.equal(true);
    expect(s.readClosed).to.equal(true);
    expect(s.writeClosed).to.equal(true);
    expect(s.stat.timeline.close).to.not.exist();
  });
});
