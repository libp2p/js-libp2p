import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import xsalsa20 from 'xsalsa20'
import * as Errors from './errors.ts'
import { KEY_LENGTH } from './key-generator.ts'
import type { AbortOptions, MultiaddrConnection, StreamMessageEvent } from '@libp2p/interface'
import type { MessageStreamInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

const XOR_CHUNK_SIZE = 65536

/**
 * The xsalsa20 wasm backend copies each input into linear memory, which starts
 * at 640KiB and is capped at 62.5MiB. Growing it detaches every other cipher's
 * view of it, so keep chunks under the initial size rather than the cap. The
 * cipher resumes where it left off, so the result matches a single update.
 */
function xorInChunks (xor: xsalsa20.Xor, input: Uint8Array): Uint8Array {
  const output = new Uint8Array(input.byteLength)

  for (let start = 0; start < input.byteLength; start += XOR_CHUNK_SIZE) {
    const end = Math.min(start + XOR_CHUNK_SIZE, input.byteLength)

    xor.update(input.subarray(start, end), output.subarray(start, end))
  }

  return output
}

export interface BoxMessageStreamInit extends MessageStreamInit {
  maConn: MultiaddrConnection
  localNonce: Uint8Array
  remoteNonce: Uint8Array
  psk: Uint8Array
}

export class BoxMessageStream extends AbstractMultiaddrConnection {
  private maConn: MultiaddrConnection
  private inboundXor: xsalsa20.Xor
  private outboundXor: xsalsa20.Xor
  private inboundReleased: boolean
  private outboundReleased: boolean
  private readonly onInboundMessage: (evt: StreamMessageEvent) => void

  constructor (init: BoxMessageStreamInit) {
    super({
      ...init,
      remoteAddr: init.maConn.remoteAddr,
      direction: init.maConn.direction
    })

    this.inboundXor = xsalsa20(init.remoteNonce, init.psk)
    this.outboundXor = xsalsa20(init.localNonce, init.psk)
    this.inboundReleased = false
    this.outboundReleased = false
    this.maConn = init.maConn

    this.onInboundMessage = (evt) => {
      const data = evt.data

      // a peer can send data after closing and nothing upstream rejects it
      if (this.inboundReleased) {
        this.log('discarding %d bytes received after the readable end ended', data.byteLength)
        return
      }

      try {
        if (data instanceof Uint8Array) {
          this.onData(xorInChunks(this.inboundXor, data))
        } else {
          for (const buf of data) {
            // onData dispatches synchronously, so the consumer can abort and
            // release the cipher part way through the message
            if (this.inboundReleased) {
              break
            }

            this.onData(xorInChunks(this.inboundXor, buf))
          }
        }
      } catch (err: any) {
        // any bytes we fail to process leave the cipher permanently out of
        // step with the remote so tear the connection down
        this.log.error('error decrypting inbound data - %e', err)
        this.abort(err)
      }
    }

    this.maConn.addEventListener('message', this.onInboundMessage)

    // resume sending when the underlying connection can accept more data
    this.maConn.addEventListener('drain', () => {
      this.onMuxerDrain()
    })

    this.maConn.addEventListener('end', () => {
      this.releaseInbound()
    })

    this.maConn.addEventListener('close', (evt) => {
      if (evt.error != null) {
        if (evt.local) {
          this.abort(evt.error)
        } else {
          this.onRemoteReset()
        }

        // an errored connection never delivers what it still holds, so waiting
        // for 'end' would keep the cipher forever
        this.releaseInbound()
      } else {
        // the two ends have to close at different moments. the write side
        // first, because the drain dispatches to the consumer and a reply
        // would otherwise reach a released cipher and abort a graceful close.
        // the read side after, because closing it while our buffer is still
        // empty makes onData discard everything the drain produces
        this.writeStatus = 'closed'
        this.drainMaConn()
        this.onTransportClosed()
      }

      // last, the branches above close the write side first and that is what
      // stops sendData reaching a released cipher
      this.releaseOutbound()
    })

    // the nonce handshake reads from the connection before this stream exists,
    // so it can already have ended or closed. bytes unwrapped back onto it are
    // dispatched in a microtask, so run after them
    if (this.maConn.readableEnded || this.maConn.status !== 'open') {
      queueMicrotask(() => {
        if (this.maConn.readableEnded) {
          this.releaseInbound()
        }

        if (this.maConn.status !== 'open' && this.maConn.status !== 'closing') {
          this.onTransportClosed()
          this.releaseOutbound()
        }
      })
    }
  }

  /**
   * A connection can close while still holding bytes it received. Decrypt them
   * into our own read buffer first, so closing does not discard them and the
   * application can still read them
   */
  private drainMaConn (): void {
    if (this.maConn.readableEnded) {
      return
    }

    try {
      this.maConn.resume()
    } catch (err: any) {
      this.log.error('could not drain the connection before closing - %e', err)
    }
  }

  /**
   * Return the inbound cipher's slot in the shared wasm memory to the pool and
   * zero the key material it holds. If that fails the slot leaks and the key
   * stays resident.
   *
   * 'end' waits for the read buffer to drain, so a connection left paused with
   * unread bytes never emits it and keeps its slot until the process exits
   */
  private releaseInbound (): void {
    if (this.inboundReleased) {
      return
    }

    this.inboundReleased = true

    try {
      this.inboundXor.finalize()
    } catch (err: any) {
      // xsalsa20 caches a view of the shared wasm memory that any other cipher
      // growing it detaches, and finalize does not refresh it
      this.log.error('could not release the inbound cipher, its wasm slot and key leak - %e', err)
    }
  }

  private releaseOutbound (): void {
    if (this.outboundReleased) {
      return
    }

    this.outboundReleased = true

    try {
      this.outboundXor.finalize()
    } catch (err: any) {
      this.log.error('could not release the outbound cipher, its wasm slot and key leak - %e', err)
    }
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    await this.maConn.close(options)
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: this.maConn.send(xorInChunks(this.outboundXor, data.subarray()))
    }
  }

  sendReset (err: Error): void {
    this.maConn.abort(err)
  }

  sendPause (): void {
    this.maConn.pause()
  }

  sendResume (): void {
    // the connection may have finished delivering everything it had, in which
    // case resuming it throws
    if (this.maConn.readableEnded) {
      return
    }

    this.maConn.resume()
  }
}

/**
 * Decode the version 1 psk from the given Uint8Array
 */
export function decodeV1PSK (pskBuffer: Uint8Array): { tag: string | undefined, codecName: string | undefined, psk: Uint8Array } {
  try {
    // This should pull from multibase/multicodec to allow for
    // more encoding flexibility. Ideally we'd consume the codecs
    // from the buffer line by line to evaluate the next line
    // programmatically instead of making assumptions about the
    // encodings of each line.
    const metadata = uint8ArrayToString(pskBuffer).split(/(?:\r\n|\r|\n)/g)
    const pskTag = metadata.shift()
    const codec = metadata.shift()
    const pskString = metadata.shift()
    const psk = uint8ArrayFromString(pskString ?? '', 'base16')

    if (psk.byteLength !== KEY_LENGTH) {
      throw new Error(Errors.INVALID_PSK)
    }

    return {
      tag: pskTag,
      codecName: codec,
      psk
    }
  } catch (err: any) {
    throw new Error(Errors.INVALID_PSK)
  }
}
