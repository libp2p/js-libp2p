/**
 * WHATWG Response implementation
 */

/**
 * Response represents an HTTP response using the WHATWG Fetch API standard
 * https://fetch.spec.whatwg.org/#response-class
 */
export class Response {
  readonly headers: Headers
  readonly ok: boolean
  readonly redirected: boolean
  readonly status: number
  readonly statusText: string
  readonly type: ResponseType
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
   * Creates a new Response
   */
  constructor (
    body?: BodyInit | null,
    init: ResponseInit = {}
  ) {
    // Set default values
    this.status = init.status ?? 200
    this.statusText = init.statusText ?? ''
    if (init.headers !== undefined && init.headers !== null) {
      this.headers = init.headers instanceof Headers
        ? new Headers(init.headers)
        : new Headers(init.headers)
    } else {
      this.headers = new Headers()
    }
    this.type = 'default'
    this.url = ''
    this.ok = this.status >= 200 && this.status < 300
    this.redirected = false
    // bodyUsed is handled via private field and getter

    // Create body
    if (body === null || body === undefined) {
      this.body = null
    } else if (body instanceof ReadableStream) {
      this.body = body
    } else {
      this.body = this.#createBody(body)
    }
  }

  /**
   * Creates a readable stream from body init
   */
  #createBody (body: BodyInit): ReadableStream<Uint8Array> {
    // Convert body to ReadableStream
    return new ReadableStream({
      start (controller) {
        // Convert various body types to Uint8Array
        let bytes: Uint8Array

        if (typeof body === 'string') {
          // String body
          bytes = new TextEncoder().encode(body)
        } else if (body instanceof Uint8Array) {
          // Uint8Array
          bytes = body
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
        } else if (body instanceof URLSearchParams) {
          // URLSearchParams - convert to string format
          bytes = new TextEncoder().encode(body.toString())
        } else if (body instanceof FormData) {
          // FormData - convert to URL encoded string representation
          const params = new URLSearchParams()
          for (const [key, value] of body.entries()) {
            if (typeof value === 'string') {
              params.append(key, value)
            } else {
              throw new TypeError('Unsupported FormData entry type')
            }
          }
          bytes = new TextEncoder().encode(params.toString())
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
   * Creates a successful response with the given body and status
   */
  static json (data: any, init: ResponseInit = {}): Response {
    const body = JSON.stringify(data)
    const headers = new Headers(init.headers ?? {})

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return new Response(body, {
      ...init,
      headers
    })
  }

  /**
   * Clones the response
   */
  clone (): Response {
    if (this.bodyUsed) {
      throw new TypeError('Cannot clone a Response with a used body')
    }

    const newResponse = new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    })

    // Copy non-standard properties
    Object.defineProperties(newResponse, {
      type: { value: this.type },
      url: { value: this.url },
      redirected: { value: this.redirected }
    })

    return newResponse
  }

  /**
   * Returns a promise that resolves with an ArrayBuffer representation of the response body
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
   * Returns a promise that resolves with a Blob representation of the response body
   */
  async blob (): Promise<Blob> {
    const buffer = await this.arrayBuffer()
    const contentType = this.headers.get('content-type')
    return new Blob([buffer], {
      type: contentType ?? ''
    })
  }

  /**
   * Returns a promise that resolves with a FormData representation of the response body
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
   * Returns a promise that resolves with a JSON representation of the response body
   */
  async json (): Promise<any> {
    const text = await this.text()
    return JSON.parse(text)
  }

  /**
   * Returns a promise that resolves with a text representation of the response body
   */
  async text (): Promise<string> {
    const buffer = await this.arrayBuffer()
    return new TextDecoder().decode(buffer)
  }
}
