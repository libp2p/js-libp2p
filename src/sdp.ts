import { InvalidArgumentError, UnsupportedHashAlgorithmError } from './error.js';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import * as multihashes from 'multihashes';
import { bases } from 'multiformats/basics';

const log = logger('libp2p:webrtc:sdp');

const mbdecoder = (function () {
  const decoders = Object.values(bases).map((b) => b.decoder);
  let acc = decoders[0].or(decoders[1]);
  decoders.slice(2).forEach((d) => (acc = acc.or(d)));
  return acc;
})();

const CERTHASH_CODE: number = 466;
const ANSWER_SDP_FORMAT: string = `
v=0
o=- 0 0 IN %s %s
s=-
c=IN %s %s
t=0 0
m=application %d UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=ice-options:ice2
a=ice-ufrag:%s
a=ice-pwd:%s
a=fingerprint:%s
a=setup:actpass
a=sctp-port:5000
a=max-message-size:100000
`;

function ipv(ma: Multiaddr): string {
  for (let proto of ma.protoNames()) {
    if (proto.startsWith('ip')) {
      return proto.toUpperCase();
    }
  }
  log('Warning: multiaddr does not appear to contain IP4 or IP6.', ma);
  return 'IP6';
}
function ip(ma: Multiaddr): string {
  return ma.toOptions().host;
}
function port(ma: Multiaddr): number {
  return ma.toOptions().port;
}

export function certhash(ma: Multiaddr): string {
  let tups = ma.stringTuples();
  let certhash_value = tups.filter((tup) => tup[0] == CERTHASH_CODE).map((tup) => tup[1])[0];
  if (!certhash_value) {
    throw new InvalidArgumentError('certhash not found in multiaddress');
  }
  return certhash_value;
}

function certhashToFingerprint(ma: Multiaddr): string {
  let certhash_value = certhash(ma);
  // certhash_value is a multibase encoded multihash encoded string
  // the multiformats PR always encodes in base64
  let mbdecoded = mbdecoder.decode(certhash_value);
  let mhdecoded = multihashes.decode(mbdecoded);
  let prefix = '';
  switch (mhdecoded.name) {
    case 'md5':
      prefix = 'md5';
      break;
    case 'sha2-256':
      prefix = 'sha-256';
      break;
    case 'sha2-512':
      prefix = 'sha-512';
      break;
    default:
      throw new UnsupportedHashAlgorithmError(mhdecoded.name);
  }

  let fp = mhdecoded.digest.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  fp = fp.match(/.{1,2}/g)!.join(':');

  return `${prefix} ${fp}`;
}

function ma2sdp(ma: Multiaddr, ufrag: string): string {
  return ANSWER_SDP_FORMAT.replace('%s', ipv(ma))
    .replace('%s', ip(ma))
    .replace('%s', ipv(ma))
    .replace('%s', ip(ma))
    .replace('%d', port(ma).toString())
    .replace('%s', ufrag)
    .replace('%s', ufrag)
    .replace('%s', certhashToFingerprint(ma));
}

export function fromMultiAddr(ma: Multiaddr, ufrag: string): RTCSessionDescriptionInit {
  return {
    type: 'answer',
    sdp: ma2sdp(ma, ufrag),
  };
}

export function munge(desc: RTCSessionDescriptionInit, ufrag: string): RTCSessionDescriptionInit {
  if (desc.sdp) {
    desc.sdp = desc.sdp.replace(/\na=ice-ufrag:[^\n]*\n/, '\na=ice-ufrag:' + ufrag + '\n').replace(/\na=ice-pwd:[^\n]*\n/, '\na=ice-pwd:' + ufrag + '\n');
    return desc;
  } else {
    throw new InvalidArgumentError("Can't munge a missing SDP");
  }
}

export function getCerthashFromMultiaddr(ma: Multiaddr): string | undefined {
  let tups = ma.stringTuples();
  let certhash_value = tups.filter((tup) => tup[0] == CERTHASH_CODE).map((tup) => tup[1])[0];
  return certhash_value;
}
