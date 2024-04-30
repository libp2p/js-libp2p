export default class WebTransport {
  constructor (url: string | URL, options?: WebTransportOptions) {
    throw new Error('Only supported in browsers')
  }

  close (): void {
    throw new Error('Only supported in browsers')
  }

  async createBidirectionalStream (): Promise<WebTransportBidirectionalStream> {
    throw new Error('Only supported in browsers')
  }

  public closed = Promise.reject(new Error('Only supported in browsers'))
  public ready = Promise.reject(new Error('Only supported in browsers'))
  public incomingBidirectionalStreams: ReadableStream
}
