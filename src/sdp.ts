import { inappropriateMultiaddr, invalidArgument, unsupportedHashAlgorithm } from './error.js';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import * as multihashes from 'multihashes';
import { bases } from 'multiformats/basics';

const log = logger('libp2p:webrtc:sdp');

export const mbdecoder = (function () {
  const decoders = Object.values(bases).map((b) => b.decoder);
  let acc = decoders[0].or(decoders[1]);
  decoders.slice(2).forEach((d) => (acc = acc.or(d)));
  return acc;
})();

const CERTHASH_CODE: number = 466;

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
  if (certhash_value) {
    return certhash_value;
  } else {
    throw inappropriateMultiaddr("Couldn't find a certhash component of multiaddr:" + ma.toString());
  }
}

export function certhashToFingerprint(ma: Multiaddr): string[] {
  let certhash_value = certhash(ma);
  // certhash_value is a multibase encoded multihash encoded string
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
      throw unsupportedHashAlgorithm(mhdecoded.name);
  }

  let fp = mhdecoded.digest.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  let fpSdp = fp.match(/.{1,2}/g)!.join(':');

  return [`${prefix.toUpperCase()} ${fpSdp.toUpperCase()}`, fp];
}

function ma2sdp(ma: Multiaddr, ufrag: string): string {
  const IP = ip(ma);
  const IPVERSION = ipv(ma);
  const PORT = port(ma);
  const [CERTFP, _] = certhashToFingerprint(ma);
  return `v=0
o=- 0 0 IN ${IPVERSION} ${IP}
s=-
c=IN ${IPVERSION} ${IP}
t=0 0
a=ice-lite
m=application ${PORT} UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:passive
a=ice-ufrag:${ufrag}
a=ice-pwd:${ufrag}
a=fingerprint:${CERTFP}
a=sctp-port:5000
a=max-message-size:100000
a=candidate:1467250027 1 UDP 1467250027 ${IP} ${PORT} typ host\r\n`;
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
    throw invalidArgument("Can't munge a missing SDP");
  }
}
