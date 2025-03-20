/**
 * WHATWG Request implementation
 */

import { URL } from '../common/url.js'

/**
 * Request represents a resource request using the WHATWG Fetch API standard
 * https://fetch.spec.whatwg.org/#request-class
 */
export class Request {
  readonly cache: RequestCache
  readonly credentials: RequestCredentials
  readonly destination: string
  readonly headers: Headers
  readonly integrity: string
  readonly keepalive: boolean
  readonly method: string
  readonly mode: RequestMode
  readonly redirect: RequestRedirect
  readonly referrer: string
  readonly referrerPolicy: ReferrerPolicy
  readonly signal: AbortSignal
  readonly url: string
  readonly body: ReadableStream<Uint8Array> | null
  #bodyUsed: boolean = false

  // Internal state
  #bodyBuffer: ArrayBuffer | null = null

  /**
   * Whether the body has been used
   */
  get bodyUsed (): boolean {
    return this.#bodyUsed
  }

  /**
   * Creates a new Request
   */
  constructor (input: string | URL | Request, init: RequestInit = {}) {
    // Set default values
    this.cache = 'default'
    this.credentials = 'same-origin'
    this.destination = 'empty'
    this.integrity = ''
    this.keepalive = false
    this.method = 'GET'
    this.mode = 'cors'
    this.redirect = 'follow'
    this.referrer = 'about:client'
    this.referrerPolicy = ''
    this.signal = new AbortController().signal
    // bodyUsed is handled via getter/setter using private field
    this.body = null

    // Process input
    if (input instanceof Request) {
      // Clone from existing Request
      this.url = input.url
      this.method = input.method
      this.headers = new Headers(input.headers)
      this.cache = input.cache
      this.credentials = input.credentials
      this.integrity = input.integrity
      this.keepalive = input.keepalive
      this.mode = input.mode
      this.redirect = input.redirect
      this.referrer = input.referrer
      this.referrerPolicy = input.referrerPolicy
      this.signal = input.signal

      // Clone body if not used
      if (!input.bodyUsed && input.body !== null) {
        this.body = input.body
      }
    } else {
      // Create from URL
      this.url = new URL(typeof input === 'string' ? input : input.href).toString()
      this.headers = new Headers()
    }

    // Apply init options
    if (init.method !== undefined) {
      this.method = init.method
    }
    if (init.headers !== undefined) {
      this.headers = new Headers(init.headers)
    }
    if (init.body !== undefined && init.body !== null) {
      this.body = this.#createBody(init.body)
    }
    if (init.cache !== undefined) {
      this.cache = init.cache
    }
    if (init.credentials !== undefined) {
      this.credentials = init.credentials
    }
    if (init.integrity !== undefined) {
      this.integrity = init.integrity
    }
    if (init.keepalive !== undefined) {
      this.keepalive = init.keepalive
    }
    if (init.mode !== undefined) {
      this.mode = init.mode
    }
    if (init.redirect !== undefined) {
      this.redirect = init.redirect
    }
    if (init.referrer !== undefined) {
      this.referrer = init.referrer
    }
    if (init.referrerPolicy !== undefined) {
      this.referrerPolicy = init.referrerPolicy
    }
    if (init.signal !== undefined && init.signal !== null) {
      this.signal = init.signal
    }
  }

  /**
   * Creates a readable stream from body init
   */
  #createBody (body: BodyInit): ReadableStream<Uint8Array> | null {
    if (body === null) {
      return null
    }

    // Return existing stream
    if (body instanceof ReadableStream) {
      return body
    }

    // Convert body to ReadableStream
    return new ReadableStream({
      start (controller) {
        // Convert various body types to Uint8Array
        let bytes: Uint8Array

        if (typeof body === 'string') {
          // String body
          bytes = new TextEncoder().encode(body)
        } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          // ArrayBuffer or view (like Uint8Array or DataView)
          if (ArrayBuffer.isView(body)) {
            bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
          } else {
            bytes = new Uint8Array(body)
          }
        } else if (body instanceof Blob) {
          // Convert Blob to ArrayBuffer asynchronously
          body.arrayBuffer().then(buffer => {
            controller.enqueue(new Uint8Array(buffer))
            controller.close()
          }).catch(error => {
            controller.error(error)
          })
          return
        } else if (body instanceof FormData || body instanceof URLSearchParams) {
          // FormData or URLSearchParams - convert to string
          if (typeof body === 'object' && body !== null) {
            bytes = new TextEncoder().encode(JSON.stringify(body))
          } else {
            bytes = new TextEncoder().encode((body as string).toString())
          }
        } else {
          // Unknown body type
          controller.error(new TypeError('Unsupported body type'))
          return
        }

        // Enqueue data and close
        controller.enqueue(bytes)
        controller.close()
      }
    })
  }

  /**
   * Clones the request
   */
  clone (): Request {
    if (this.bodyUsed) {
      throw new TypeError('Cannot clone a Request with a used body')
    }
    return new Request(this)
  }

  /**
   * Returns a promise that resolves with an ArrayBuffer representation of the request body
   */
  async arrayBuffer (): Promise<ArrayBuffer> {
    if (this.bodyUsed) {
      throw new TypeError('Body already read')
    }

    if (this.body === null) {
      return new ArrayBuffer(0)
    }

    if (this.#bodyBuffer !== null) {
      this.#bodyUsed = true
      return this.#bodyBuffer
    }

    const reader = this.body.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.length
    }

    // Concatenate chunks
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    this.#bodyBuffer = result.buffer
    this.#bodyUsed = true
    return this.#bodyBuffer
  }

  /**
   * Returns a promise that resolves with a Blob representation of the request body
   */
  async blob (): Promise<Blob> {
    const buffer = await this.arrayBuffer()
    return new Blob([buffer], {
      type: this.headers.get('content-type') ?? ''
    })
  }

  /**
   * Returns a promise that resolves with a FormData representation of the request body
   */
  async formData (): Promise<FormData> {
    const text = await this.text()
    const formData = new FormData()

    // Parse the form data
    const contentType = this.headers.get('content-type') ?? ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse URL encoded form data
      const params = new URLSearchParams(text)
      for (const [name, value] of params.entries()) {
        formData.append(name, value)
      }
    } else {
      throw new TypeError('Not implemented: multipart/form-data parsing')
    }

    return formData
  }

  /**
   * Returns a promise that resolves with a JSON representation of the request body
   */
  async json (): Promise<any> {
    const text = await this.text()
    return JSON.parse(text)
  }

  /**
   * Returns a promise that resolves with a text representation of the request body
   */
  async text (): Promise<string> {
    const buffer = await this.arrayBuffer()
    return new TextDecoder().decode(buffer)
  }
}
