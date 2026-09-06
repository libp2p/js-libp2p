import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { genUfrag, handleStunRequest, isValidUfrag } from '../src/util.ts'
import type { IceUdpMuxRequest } from 'node-datachannel'

describe('isValidUfrag', () => {
  it('accepts a generated ufrag', () => {
    expect(isValidUfrag(genUfrag())).to.be.true()
  })

  it('accepts the full ice-char set [a-zA-Z0-9+/]', () => {
    expect(isValidUfrag('AZaz09+/AZaz09+/AZaz09+/')).to.be.true()
  })

  it('accepts the minimum valid length of 22 characters', () => {
    expect(isValidUfrag('a'.repeat(22))).to.be.true()
  })

  it('accepts the maximum valid length of 256 characters', () => {
    expect(isValidUfrag('a'.repeat(256))).to.be.true()
  })

  it('rejects a ufrag shorter than 22 characters', () => {
    expect(isValidUfrag('a'.repeat(21))).to.be.false()
  })

  it('rejects an empty ufrag', () => {
    expect(isValidUfrag('')).to.be.false()
  })

  it('rejects a ufrag longer than 256 characters', () => {
    expect(isValidUfrag('a'.repeat(257))).to.be.false()
  })

  it('rejects a short, attacker-controlled STUN ufrag', () => {
    // reused as the ICE password, a value this short is rejected by the native
    // ICE stack and aborts the process before it can be validated here
    expect(isValidUfrag('controlled')).to.be.false()
  })

  it('rejects a ufrag with characters outside the ice-char set', () => {
    for (const char of [' ', '\t', '\n', ':', '%', '=', '#', 'ü']) {
      const ufrag = `aaaaaaaaaaaa${char}aaaaaaaaaaaa`
      expect(isValidUfrag(ufrag), `expected ${JSON.stringify(char)} to be rejected`).to.be.false()
    }
  })
})

describe('handleStunRequest', () => {
  const log = defaultLogger().forComponent('test')

  function request (ufrag: string | null): IceUdpMuxRequest {
    return { ufrag: ufrag as string, localUfrag: 'libp2p+webrtc+v1/server', host: '1.2.3.4', port: 1234 }
  }

  it('forwards a request with a valid ufrag to the callback', () => {
    const cb = Sinon.stub()
    const ufrag = genUfrag()

    handleStunRequest(request(ufrag), log, cb)

    expect(cb.calledOnceWithExactly(ufrag, '1.2.3.4', 1234)).to.be.true()
  })

  it('drops a request with no ufrag', () => {
    const cb = Sinon.stub()

    handleStunRequest(request(null), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a request whose ufrag is not a valid ICE credential', () => {
    // a short, attacker-controlled ufrag must never reach the callback - reused
    // as an ICE password it aborts the process in native code
    const cb = Sinon.stub()

    handleStunRequest(request('controlled'), log, cb)

    expect(cb.called).to.be.false()
  })
})
