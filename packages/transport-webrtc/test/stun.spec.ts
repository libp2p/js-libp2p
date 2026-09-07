import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { handleStunRequest, isIcePwd, isIceUfrag } from '../src/private-to-public/utils/stun.ts'
import { genUfrag } from '../src/util.ts'
import type { IceUdpMuxRequest } from 'node-datachannel'

describe('isIceUfrag', () => {
  it('accepts a generated ufrag', () => {
    expect(isIceUfrag(genUfrag())).to.be.true()
    expect(isIceUfrag(genUfrag(32, ''))).to.be.true()
  })

  it('accepts the full ice-char set [a-zA-Z0-9+/]', () => {
    expect(isIceUfrag('AZaz09+/')).to.be.true()
  })

  it('accepts the minimum valid length of 4 characters', () => {
    expect(isIceUfrag('a'.repeat(4))).to.be.true()
  })

  it('accepts the maximum valid length of 256 characters', () => {
    expect(isIceUfrag('a'.repeat(256))).to.be.true()
  })

  it('rejects a ufrag shorter than 4 characters', () => {
    expect(isIceUfrag('a'.repeat(3))).to.be.false()
    expect(isIceUfrag('')).to.be.false()
  })

  it('rejects a ufrag longer than 256 characters', () => {
    expect(isIceUfrag('a'.repeat(257))).to.be.false()
  })

  it('rejects a ufrag with characters outside the ice-char set', () => {
    for (const char of [' ', '\t', '\n', ':', '%', '=', '#', 'ü']) {
      const ufrag = `aaaa${char}aaaa`
      expect(isIceUfrag(ufrag), `expected ${JSON.stringify(char)} to be rejected`).to.be.false()
    }
  })
})

describe('isIcePwd', () => {
  it('accepts a generated v1 ufrag reused as the password', () => {
    expect(isIcePwd(genUfrag())).to.be.true()
  })

  it('accepts a generated v2 password', () => {
    expect(isIcePwd(genUfrag(22, ''))).to.be.true()
  })

  it('accepts the full ice-char set [a-zA-Z0-9+/]', () => {
    expect(isIcePwd('AZaz09+/AZaz09+/AZaz09+/')).to.be.true()
  })

  it('accepts the minimum valid length of 22 characters', () => {
    expect(isIcePwd('a'.repeat(22))).to.be.true()
  })

  it('accepts the maximum valid length of 256 characters', () => {
    expect(isIcePwd('a'.repeat(256))).to.be.true()
  })

  it('rejects a password shorter than 22 characters', () => {
    expect(isIcePwd('a'.repeat(21))).to.be.false()
  })

  it('rejects an empty password', () => {
    expect(isIcePwd('')).to.be.false()
  })

  it('rejects a password longer than 256 characters', () => {
    expect(isIcePwd('a'.repeat(257))).to.be.false()
  })

  it('rejects a short, attacker-controlled STUN ufrag', () => {
    // reused as the ICE password, a value this short is rejected by the native
    // ICE stack and aborts the process before it can be validated here
    expect(isIcePwd('controlled')).to.be.false()
  })

  it('rejects a password with characters outside the ice-char set', () => {
    for (const char of [' ', '\t', '\n', ':', '%', '=', '#', 'ü']) {
      const pwd = `aaaaaaaaaaaa${char}aaaaaaaaaaaa`
      expect(isIcePwd(pwd), `expected ${JSON.stringify(char)} to be rejected`).to.be.false()
    }
  })
})

describe('handleStunRequest', () => {
  const log = defaultLogger().forComponent('test')
  const clientPwd = 'clientPassword1234567890'
  const v2ServerUfrag = `libp2p+webrtc+v2/${clientPwd}`

  function request (ufrag: string | null, localUfrag?: string): IceUdpMuxRequest {
    return { ufrag: ufrag as string, localUfrag: localUfrag as string, host: '1.2.3.4', port: 1234 }
  }

  it('forwards a v1 request to the callback without a client password', () => {
    const cb = Sinon.stub()
    const ufrag = genUfrag()

    handleStunRequest(request(ufrag, ufrag), log, cb)

    expect(cb.calledOnceWithExactly(ufrag, ufrag, undefined, '1.2.3.4', 1234)).to.be.true()
  })

  it('uses the single ufrag as both ufrags when the mux could not split the username', () => {
    const cb = Sinon.stub()
    const ufrag = genUfrag()

    handleStunRequest(request(ufrag), log, cb)

    expect(cb.calledOnceWithExactly(ufrag, ufrag, undefined, '1.2.3.4', 1234)).to.be.true()
  })

  it('forwards a v2 request to the callback with the decoded client password', () => {
    const cb = Sinon.stub()
    const clientUfrag = genUfrag(32, '')

    handleStunRequest(request(clientUfrag, v2ServerUfrag), log, cb)

    expect(cb.calledOnceWithExactly(v2ServerUfrag, clientUfrag, clientPwd, '1.2.3.4', 1234)).to.be.true()
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

    handleStunRequest(request('controlled', 'libp2p+webrtc+v1/server'), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a v1 request whose server ufrag is too short to reuse as the ICE password', () => {
    const cb = Sinon.stub()

    // a valid ufrag length but below the 22 character password minimum
    handleStunRequest(request(genUfrag(), 'libp2p+webrtc+v1/abc'), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a request with a ufrag outside the ice-char set', () => {
    const cb = Sinon.stub()

    handleStunRequest(request(`${genUfrag()}\r\na=candidate:x`, genUfrag()), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a v2 request whose client password is invalid', () => {
    const cb = Sinon.stub()

    handleStunRequest(request(genUfrag(32, ''), 'libp2p+webrtc+v2/short'), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a request with an unknown version prefix', () => {
    const cb = Sinon.stub()

    handleStunRequest(request(genUfrag(32, ''), `libp2p+webrtc+v3/${clientPwd}`), log, cb)

    expect(cb.called).to.be.false()
  })

  it('drops a request with no version prefix', () => {
    const cb = Sinon.stub()
    const ufrag = genUfrag(32, '')

    handleStunRequest(request(ufrag, ufrag), log, cb)

    expect(cb.called).to.be.false()
  })
})
