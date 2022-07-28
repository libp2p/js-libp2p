import { Stream }  from '@libp2p/interface-connection';
import {StreamStat}from '@libp2p/interface-connection';
import { logger }  from '@libp2p/logger';
import { Source }  from 'it-stream-types';
import { Sink }    from 'it-stream-types';

const log = logger('libp2p:webrtc:connection')


export class WebRTCStream implements Stream {

    constructor() {
        this.id = "TODO";
        this.stat = {
            direction: 'outbound',
            timeline: {
                open: 0, 
                close: 0
            }
        };
        this.metadata = {};
        log('TODO',this.channel?.id);
    }

     /**
   * Close a stream for reading and writing
   */
  close() : void {}

  /**
   * Close a stream for reading only
   */
  closeRead() : void {}

  /**
   * Close a stream for writing only
   */
  closeWrite() : void {}

  /**
   * Call when a local error occurs, should close the stream for reading and writing
   */
  abort(err: Error): void {}

  /**
   * Call when a remote error occurs, should close the stream for reading and writing
   */
  reset() : void {}

  /**
   * Unique identifier for a stream
   */
  id: string;

  /**
   * Stats about this stream
   */
  stat: StreamStat;

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>;

  source: Source<Uint8Array> = process.stdin;//TODO
  sink: Sink<Uint8Array, Promise<void>> = (x) => new Promise((res,rej) => {});//TODO

  private channel?: RTCDataChannel;
    
}
