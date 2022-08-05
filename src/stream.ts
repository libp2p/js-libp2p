import { Stream, Direction } from '@libp2p/interface-connection';
import { StreamStat } from '@libp2p/interface-connection';
// import { logger } from '@libp2p/logger';
import { Source } from 'it-stream-types';
import { Sink } from 'it-stream-types';
import { pushable, Pushable } from 'it-pushable';
import defer, { DeferredPromise } from 'p-defer';
import merge from 'it-merge';

// const log = logger('libp2p:webrtc:connection');

type StreamInitOpts = {
  channel: RTCDataChannel;
  direction: Direction;
  metadata?: Record<string, any>;
};

export class WebRTCStream implements Stream {
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
  private readonly channel: RTCDataChannel;

  source: Source<Uint8Array> = process.stdin; //TODO
  sink: Sink<Uint8Array, Promise<void>>;

  // promises
  opened: DeferredPromise<void> = defer();
  closeWritePromise: DeferredPromise<void> = defer();
  writeClosed: boolean = false;
  readClosed: boolean = false;
  closed: boolean = false;

  constructor(opts: StreamInitOpts) {
    this.channel = opts.channel;
    this.id = this.channel.label;
    this.stat = {
      direction: opts.direction,
      timeline: {
        open: 0,
        close: 0,
      },
    };

    this.metadata = opts.metadata ?? {};
    this.source = pushable();

    // closable sink
    this.sink = async (src: Source<Uint8Array>) => {
      await this.opened.promise;
      if (closed || this.writeClosed) {
        return;
      }

      let self = this;
      let closeWriteIterable = {
        async *[Symbol.asyncIterator]() {
          await self.closeWritePromise.promise;
          yield new Uint8Array(0);
        },
      };

      for await (const buf of merge(closeWriteIterable, src)) {
        if (closed || this.writeClosed) {
          break;
        }
        this.channel.send(buf);
      }
    };

    // handle datachannel events
    this.channel.onopen = (_) => this.opened.resolve();
    this.channel.onmessage = (evt) => {
      if (this.readClosed) {
        return;
      }
      (this.source as Pushable<Uint8Array>).push(evt.data);
    };
    this.channel.onclose = (_) => this.close();
    this.channel.onerror = (_event) => {
      this.abort(new Error('TODO'));
    };
  }

  // duplex sink

  /**
   * Close a stream for reading and writing
   */
  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.closeRead();
    this.closeWrite();
    this.channel.close();
  }

  /**
   * Close a stream for reading only
   */
  closeRead(): void {
    this.readClosed = true;
    (this.source as Pushable<Uint8Array>).end();
  }

  /**
   * Close a stream for writing only
   */
  closeWrite(): void {
    this.writeClosed = true;
    this.closeWritePromise.resolve();
  }

  /**
   * Call when a local error occurs, should close the stream for reading and writing
   */
  abort(err: Error): void {
    this.close();
  }

  /**
   * Call when a remote error occurs, should close the stream for reading and writing
   */
  reset(): void {
    this.close();
  }
}
