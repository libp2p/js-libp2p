import { Transport } from '@libp2p/interface-transport';
import { WebRTCTransport, WebRTCTransportComponents } from './transport.js';

export function webRTC(): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components);
}

export * from './error.js';
export * from './maconn.js';
export * from './muxer.js';
export * from './options.js';
export * from './sdp.js';
export * from './stream.js';
export * from './transport.js';
export * from './util.js';
