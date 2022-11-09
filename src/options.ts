import { CreateListenerOptions, DialOptions } from '@libp2p/interface-transport'

export interface WebRTCListenerOptions extends CreateListenerOptions {
  //, WebRTCInitiatorInit {
  //   channelOptions?: WebRTCReceiverInit
}

export interface WebRTCDialOptions extends DialOptions {}
