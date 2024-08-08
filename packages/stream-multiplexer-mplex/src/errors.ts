/**
 * There was an error in the stream input buffer
 */
export class StreamInputBufferError extends Error {
  constructor (message = 'Stream input buffer error') {
    super(message)
    this.name = 'StreamInputBufferError'
  }
}
