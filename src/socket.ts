import type { Socket } from 'socket.io-client'

export interface OfferSignal {
  type: 'offer'
  sdp: string
}

export interface AnswerSignal {
  type: 'answer'
  sdp: string
}

export interface CandidateSignal {
  type: 'candidate'
  candidate: {
    candidate: string
    sdpMLineIndex?: number
    sdpMid?: string
  }
}

export interface RenegotiateSignal {
  type: 'renegotiate'
}

export interface GoodbyeSignal {
  type: 'goodbye'
}

export type Signal = OfferSignal | AnswerSignal | CandidateSignal | RenegotiateSignal | GoodbyeSignal

export interface HandshakeSignal {
  srcMultiaddr: string
  dstMultiaddr: string
  intentId: string
  signal: Signal
  answer?: boolean
  err?: string
}

interface SocketEvents {
  'ss-handshake': (offer: HandshakeSignal) => void
  'ss-join': (maStr: string) => void
  'ss-leave': (maStr: string) => void
  'ws-peer': (maStr: string) => void
  'ws-handshake': (offer: HandshakeSignal) => void
  'error': (err: Error) => void
  'listening': () => void
  'close': () => void
}

export interface WebRTCSocket extends Socket<SocketEvents> {

}
