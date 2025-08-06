import { StreamMessageEvent } from '@libp2p/interface'
import { AbstractMessageStream } from '@libp2p/utils'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import xsalsa20 from 'xsalsa20'
import * as Errors from './errors.js'
import { KEY_LENGTH } from './key-generator.js'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { MessageStreamInit, SendResult } from '@libp2p/utils'

export interface BoxMessageStreamInit extends MessageStreamInit {
  maConn: MultiaddrConnection
  localNonce: Uint8Array
  remoteNonce: Uint8Array
  psk: Uint8Array
}

export class BoxMessageStream extends AbstractMessageStream {
  private maConn: MultiaddrConnection
  private inboundXor: xsalsa20.Xor
  private outboundXor: xsalsa20.Xor

  constructor (init: BoxMessageStreamInit) {
    super(init)

    this.inboundXor = xsalsa20(init.remoteNonce, init.psk)
    this.outboundXor = xsalsa20(init.localNonce, init.psk)
    this.maConn = init.maConn

    this.maConn.addEventListener('message', (evt) => {
      const data = evt.data

      if (data instanceof Uint8Array) {
        this.dispatchEvent(new StreamMessageEvent(this.inboundXor.update(data)))
      } else {
        for (const buf of data) {
          this.dispatchEvent(new StreamMessageEvent(this.inboundXor.update(buf)))
        }
      }
    })

    this.maConn.addEventListener('close', (evt) => {
      if (evt.local) {
        if (evt.error != null) {
          this.abort(evt.error)
        } else {
          this.close()
            .catch(() => {})
        }
      } else {
        if (evt.error != null) {
          this.onRemoteReset()
        } else {
          this.onRemoteClose()
        }
      }
    })
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    await this.maConn.closeWrite(options)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    await this.maConn.closeRead(options)
  }

  sendData (data: Uint8Array): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: this.maConn.send(this.outboundXor.update(data))
    }
  }

  sendReset (err: Error): void {
    this.maConn.abort(err)
  }

  sendPause (): void {
    this.maConn.pause()
  }

  sendResume (): void {
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
