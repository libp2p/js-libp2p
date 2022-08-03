import { Connection } from '@libp2p/interface-connection';
import { ConnectionStat } from '@libp2p/interface-connection';
import { Stream, Direction } from '@libp2p/interface-connection';
import { PeerId } from '@libp2p/interface-peer-id';
import { AbortOptions } from '@libp2p/interfaces';
import { logger } from '@libp2p/logger';
import { Multiaddr } from '@multiformats/multiaddr';
import { v4 as genUuid } from 'uuid';

const log = logger('libp2p:webrtc:connection');

type ConnectionInit = {
  id: string;
  localPeer: PeerId;
  localAddr?: Multiaddr;
  remotePeer: PeerId;
  remoteAddr: Multiaddr;
  direction: Direction;
  tags?: string[];
  stat: ConnectionStat;
  pc: RTCPeerConnection;
  credential_string: string;
};

export class WebRTCConnection implements Connection {
  id: string;
  stat: ConnectionStat;
  remoteAddr: Multiaddr;
  remotePeer: PeerId;
  tags: string[] = [];
  streams: Stream[] = [];
  direction: Direction;

  private peerConnection: RTCPeerConnection;
  private ufrag: string;

  constructor(init: ConnectionInit) {
    this.streams = [];
    this.remotePeer = init.remotePeer;
    this.remoteAddr = init.remoteAddr;
    this.stat = init.stat;
    this.id = init.id;
    this.direction = init.direction;
    this.peerConnection = init.pc;
    this.ufrag = init.credential_string;
  }

  async newStream(multicodecs: string | string[], options?: AbortOptions): Promise<Stream> {
    log('TODO', this.ufrag);
    this.peerConnection.createDataChannel(genUuid());
    throw new Error('not implemented');
  }

  addStream(stream: Stream): void {
    throw new Error('not implemented');
  }
  removeStream(id: string): void {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    throw new Error('not implemented');
  }
}
