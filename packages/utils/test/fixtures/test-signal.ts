import { TypedEventEmitter } from '@libp2p/interface'

export interface TestSignalEvents {
  abort: CustomEvent
}

export class TestSignal extends TypedEventEmitter<TestSignalEvents> {
  public aborted: boolean
  public reason: any

  constructor () {
    super()

    this.aborted = false
  }

  throwIfAborted (): void {

  }

  onabort (): void {

  }

  abort (reason: any): void {
    this.aborted = true
    this.reason = reason
    this.safeDispatchEvent('abort')
  }
}
