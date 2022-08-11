import { Stream } from '@libp2p/interface-connection';
import { StreamStat } from '@libp2p/interface-connection';
import { Source } from 'it-stream-types';
import { Sink } from 'it-stream-types';
import { pushable, Pushable } from 'it-pushable';
import defer, { DeferredPromise } from 'p-defer';
import merge from 'it-merge';
import { Uint8ArrayList } from 'uint8arraylist';
import { fromString } from 'uint8arrays/from-string';
import { logger } from '@libp2p/logger';

const log = logger('libp2p:webrtc:stream');

type StreamInitOpts = {
  channel: RTCDataChannel;
  metadata?: Record<string, any>;
  stat: StreamStat;
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

  source: Source<Uint8ArrayList> = pushable();
  sink: Sink<Uint8ArrayList | Uint8Array, Promise<void>>;

  // promises
  opened: DeferredPromise<void> = defer();
  closeWritePromise: DeferredPromise<void> = defer();
  writeClosed: boolean = false;
  readClosed: boolean = false;
  closed: boolean = false;

  // testing

  constructor(opts: StreamInitOpts) {
    this.channel = opts.channel;
    this.id = this.channel.label;

    this.stat = opts.stat;
    switch (this.channel.readyState) {
      case 'open':
        this.opened.resolve();
        break;
      case 'closed':
      case 'closing':
        this.closed = true;
        if (!this.stat.timeline.close) {
          this.stat.timeline.close = new Date().getTime();
        }
        this.opened.resolve();
        break;
    }

    this.metadata = opts.metadata ?? {};

    // closable sink
    this.sink = this._sinkFn;

    // handle RTCDataChannel events
    this.channel.onopen = (_evt) => {
      this.stat.timeline.open = new Date().getTime();
      this.opened.resolve();
    };

    this.channel.onmessage = ({ data }) => {
      if (this.readClosed || this.closed) {
        return;
      }

      let res: Uint8Array;
      if (typeof data == 'string') {
        res = fromString(data);
      } else {
        res = new Uint8Array(data as ArrayBuffer);
      }
      log.trace(`[stream:${this.id}][${this.stat.direction}] received message: length: ${res.length} ${res}`);
      (this.source as Pushable<Uint8ArrayList>).push(new Uint8ArrayList(res));
    };

    this.channel.onclose = (_evt) => {
      this.close();
    };

    this.channel.onerror = (evt) => {
      let err = (evt as RTCErrorEvent).error;
      this.abort(err);
    };
  }

  private async _sinkFn(src: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
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
      this.channel.send(buf.subarray());
    }
  }

  /**
   * Close a stream for reading and writing
   */
  close(): void {
    if (this.closed) {
      return;
    }
    this.stat.timeline.close = new Date().getTime();
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
    (this.source as Pushable<Uint8ArrayList>).end();
    if (this.readClosed && this.writeClosed) {
      this.close();
    }
  }

  /**
   * Close a stream for writing only
   */
  closeWrite(): void {
    this.writeClosed = true;
    this.closeWritePromise.resolve();
    if (this.readClosed && this.writeClosed) {
      this.close();
    }
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
