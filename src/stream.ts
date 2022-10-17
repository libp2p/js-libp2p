import { Stream, StreamStat, Direction } from '@libp2p/interface-connection';
import { Source } from 'it-stream-types';
import { Sink } from 'it-stream-types';
import { pushable, Pushable } from 'it-pushable';
import defer, { DeferredPromise } from 'p-defer';
import merge from 'it-merge';
import { Uint8ArrayList } from 'uint8arraylist';
import { fromString } from 'uint8arrays/from-string';
import { logger } from '@libp2p/logger';
import * as pb from '../proto_ts/message.js';

const log = logger('libp2p:webrtc:stream');

export function defaultStat(dir: Direction): StreamStat {
  return {
    direction: dir,
    timeline: {
      open: 0,
      close: undefined,
    },
  };
}

type StreamInitOpts = {
  channel: RTCDataChannel;
  metadata?: Record<string, any>;
  stat: StreamStat;
  closeCb?: (stream: WebRTCStream) => void;
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

  _src: Source<Uint8ArrayList> = pushable();
  sink: Sink<Uint8ArrayList | Uint8Array, Promise<void>>;

  // promises
  opened: DeferredPromise<void> = defer();
  closeWritePromise: DeferredPromise<void> = defer();
  writeClosed: boolean = false;
  readClosed: boolean = false;
  closed: boolean = false;
  closeCb?: (stream: WebRTCStream) => void | undefined;

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

    this.channel.onmessage = async ({ data }) => {
      let res: Uint8Array;
      if (typeof data == 'string') {
        res = fromString(data);
      } else {
        res = new Uint8Array(data as ArrayBuffer);
      }
      log.trace(`[stream:${this.id}][${this.stat.direction}] received message: length: ${res.length} ${res}`);
      let m = pb.Message.fromBinary(res);
      log(`[stream:${this.id}][${this.stat.direction}] received pb.Message: ${Object.entries(m)}`);
      switch (m.flag) {
        case undefined:
          break; //regular message only
        case pb.Message_Flag.STOP_SENDING:
          log.trace('Remote has indicated, with "STOP_SENDING" flag, that it will discard any messages we send.');
          this.closeWrite();
          break;
        case pb.Message_Flag.FIN:
          log.trace('Remote has indicated, with "FIN" flag, that it will not send any further messages.');
          this.closeRead();
          break;
        case pb.Message_Flag.RESET:
          log.trace('Remote abruptly stopped sending, indicated with "RESET" flag.');
          this.closeRead();
      }
      if (this.readClosed || this.closed) {
        return;
      }
      if (m.message) {
        log.trace('%s incoming message %s', this.id, m.message);
        (this._src as Pushable<Uint8ArrayList>).push(new Uint8ArrayList(m.message));
      }
    };

    this.channel.onclose = (_evt) => {
      this.close();
    };

    this.channel.onerror = (evt) => {
      let err = (evt as RTCErrorEvent).error;
      this.abort(err);
    };
  }

  // If user attempts to set a new source
  // this should be a nop
  set source(_src: Source<Uint8ArrayList>) {}

  get source(): Source<Uint8ArrayList> {
    return this._src;
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
      let res = buf.subarray();
      let send_buf = pb.Message.toBinary({ message: buf.subarray() });
      log.trace(`[stream:${this.id}][${this.stat.direction}] sending message: length: ${res.length} ${res}, encoded through pb as ${send_buf}`);
      this.channel.send(send_buf);
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
    this.readClosed = true;
    this.writeClosed = true;
    this.channel.close();
    if (this.closeCb) {
      this.closeCb(this);
    }
  }

  /**
   * Close a stream for reading only
   */
  closeRead(): void {
    this._sendFlag(pb.Message_Flag.STOP_SENDING);
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
    this._sendFlag(pb.Message_Flag.FIN);
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
   * Close the stream for writing, and indicate to the remote side this is being done 'abruptly'
   * @see closeWrite
   */
  reset(): void {
    this.stat = defaultStat(this.stat.direction);
    this._sendFlag(pb.Message_Flag.RESET);
    this.writeClosed = true;
    this.closeWritePromise.resolve();
    if (this.readClosed && this.writeClosed) {
      this.close();
    }
  }

  private _sendFlag(flag: pb.Message_Flag): void {
    try {
      log('Sending flag: %s', flag.toString());
      this.channel.send(pb.Message.toBinary({ flag: flag }));
    } catch (e) {
      log.error(`Exception while sending flag ${flag}: ${e}`);
    }
  }
}
