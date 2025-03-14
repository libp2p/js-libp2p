/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface AuthParamValue {
    key: string
    value: string
  }

  export namespace AuthParamValue {
    let _codec: Codec<AuthParamValue>

    export const codec = (): Codec<AuthParamValue> => {
      if (_codec == null) {
        _codec = message<AuthParamValue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if ((obj.value != null && obj.value !== '')) {
            w.uint32(18)
            w.string(obj.value)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: '',
            value: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                obj.value = reader.string()
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<AuthParamValue>): Uint8Array => {
      return encodeMessage(obj, AuthParamValue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AuthParamValue>): AuthParamValue => {
      return decodeMessage(buf, AuthParamValue.codec(), opts)
    }
  }

  export interface AuthParams {
    params: http.AuthParamValue[]
  }

  export namespace AuthParams {
    let _codec: Codec<AuthParams>

    export const codec = (): Codec<AuthParams> => {
      if (_codec == null) {
        _codec = message<AuthParams>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.params != null) {
            for (const value of obj.params) {
              w.uint32(10)
              http.AuthParamValue.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            params: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.params != null && obj.params.length === opts.limits.params) {
                  throw new MaxLengthError('Decode error - map field "params" had too many elements')
                }

                obj.params.push(http.AuthParamValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.params$
                }))
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<AuthParams>): Uint8Array => {
      return encodeMessage(obj, AuthParams.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AuthParams>): AuthParams => {
      return decodeMessage(buf, AuthParams.codec(), opts)
    }
  }

  export interface Challenge {
    authScheme: string
    token68: string
    authParams?: http.AuthParams
    realm: string
  }

  export namespace Challenge {
    let _codec: Codec<Challenge>

    export const codec = (): Codec<Challenge> => {
      if (_codec == null) {
        _codec = message<Challenge>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.authScheme != null && obj.authScheme !== '')) {
            w.uint32(10)
            w.string(obj.authScheme)
          }

          if ((obj.token68 != null && obj.token68 !== '')) {
            w.uint32(18)
            w.string(obj.token68)
          }

          if (obj.authParams != null) {
            w.uint32(26)
            http.AuthParams.codec().encode(obj.authParams, w)
          }

          if ((obj.realm != null && obj.realm !== '')) {
            w.uint32(34)
            w.string(obj.realm)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            authScheme: '',
            token68: '',
            realm: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.authScheme = reader.string()
                break
              }
              case 2: {
                obj.token68 = reader.string()
                break
              }
              case 3: {
                obj.authParams = http.AuthParams.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.authParams
                })
                break
              }
              case 4: {
                obj.realm = reader.string()
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<Challenge>): Uint8Array => {
      return encodeMessage(obj, Challenge.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Challenge>): Challenge => {
      return decodeMessage(buf, Challenge.codec(), opts)
    }
  }

  export interface CredentialParams {
    params: http.AuthParamValue[]
  }

  export namespace CredentialParams {
    let _codec: Codec<CredentialParams>

    export const codec = (): Codec<CredentialParams> => {
      if (_codec == null) {
        _codec = message<CredentialParams>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.params != null) {
            for (const value of obj.params) {
              w.uint32(10)
              http.AuthParamValue.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            params: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.params != null && obj.params.length === opts.limits.params) {
                  throw new MaxLengthError('Decode error - map field "params" had too many elements')
                }

                obj.params.push(http.AuthParamValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.params$
                }))
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<CredentialParams>): Uint8Array => {
      return encodeMessage(obj, CredentialParams.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CredentialParams>): CredentialParams => {
      return decodeMessage(buf, CredentialParams.codec(), opts)
    }
  }

  export interface Credentials {
    authScheme: string
    token68: string
    authParams?: http.CredentialParams
  }

  export namespace Credentials {
    let _codec: Codec<Credentials>

    export const codec = (): Codec<Credentials> => {
      if (_codec == null) {
        _codec = message<Credentials>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.authScheme != null && obj.authScheme !== '')) {
            w.uint32(10)
            w.string(obj.authScheme)
          }

          if ((obj.token68 != null && obj.token68 !== '')) {
            w.uint32(18)
            w.string(obj.token68)
          }

          if (obj.authParams != null) {
            w.uint32(26)
            http.CredentialParams.codec().encode(obj.authParams, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            authScheme: '',
            token68: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.authScheme = reader.string()
                break
              }
              case 2: {
                obj.token68 = reader.string()
                break
              }
              case 3: {
                obj.authParams = http.CredentialParams.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.authParams
                })
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<Credentials>): Uint8Array => {
      return encodeMessage(obj, Credentials.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Credentials>): Credentials => {
      return decodeMessage(buf, Credentials.codec(), opts)
    }
  }

  export interface AuthInfoParams {
    params: http.AuthParamValue[]
  }

  export namespace AuthInfoParams {
    let _codec: Codec<AuthInfoParams>

    export const codec = (): Codec<AuthInfoParams> => {
      if (_codec == null) {
        _codec = message<AuthInfoParams>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.params != null) {
            for (const value of obj.params) {
              w.uint32(10)
              http.AuthParamValue.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            params: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.params != null && obj.params.length === opts.limits.params) {
                  throw new MaxLengthError('Decode error - map field "params" had too many elements')
                }

                obj.params.push(http.AuthParamValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.params$
                }))
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<AuthInfoParams>): Uint8Array => {
      return encodeMessage(obj, AuthInfoParams.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AuthInfoParams>): AuthInfoParams => {
      return decodeMessage(buf, AuthInfoParams.codec(), opts)
    }
  }

  export interface ProxyAuthInfoParams {
    params: http.AuthParamValue[]
  }

  export namespace ProxyAuthInfoParams {
    let _codec: Codec<ProxyAuthInfoParams>

    export const codec = (): Codec<ProxyAuthInfoParams> => {
      if (_codec == null) {
        _codec = message<ProxyAuthInfoParams>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.params != null) {
            for (const value of obj.params) {
              w.uint32(10)
              http.AuthParamValue.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            params: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.params != null && obj.params.length === opts.limits.params) {
                  throw new MaxLengthError('Decode error - map field "params" had too many elements')
                }

                obj.params.push(http.AuthParamValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.params$
                }))
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<ProxyAuthInfoParams>): Uint8Array => {
      return encodeMessage(obj, ProxyAuthInfoParams.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProxyAuthInfoParams>): ProxyAuthInfoParams => {
      return decodeMessage(buf, ProxyAuthInfoParams.codec(), opts)
    }
  }

  export interface AuthenticationInfo {
    wwwAuthenticate: http.Challenge[]
    authorization?: http.Credentials
    authenticationInfo?: http.AuthInfoParams
    proxyAuthenticate: http.Challenge[]
    proxyAuthorization?: http.Credentials
    proxyAuthenticationInfo?: http.ProxyAuthInfoParams
  }

  export namespace AuthenticationInfo {
    let _codec: Codec<AuthenticationInfo>

    export const codec = (): Codec<AuthenticationInfo> => {
      if (_codec == null) {
        _codec = message<AuthenticationInfo>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.wwwAuthenticate != null) {
            for (const value of obj.wwwAuthenticate) {
              w.uint32(10)
              http.Challenge.codec().encode(value, w)
            }
          }

          if (obj.authorization != null) {
            w.uint32(18)
            http.Credentials.codec().encode(obj.authorization, w)
          }

          if (obj.authenticationInfo != null) {
            w.uint32(26)
            http.AuthInfoParams.codec().encode(obj.authenticationInfo, w)
          }

          if (obj.proxyAuthenticate != null) {
            for (const value of obj.proxyAuthenticate) {
              w.uint32(34)
              http.Challenge.codec().encode(value, w)
            }
          }

          if (obj.proxyAuthorization != null) {
            w.uint32(42)
            http.Credentials.codec().encode(obj.proxyAuthorization, w)
          }

          if (obj.proxyAuthenticationInfo != null) {
            w.uint32(50)
            http.ProxyAuthInfoParams.codec().encode(obj.proxyAuthenticationInfo, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            wwwAuthenticate: [],
            proxyAuthenticate: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.wwwAuthenticate != null && obj.wwwAuthenticate.length === opts.limits.wwwAuthenticate) {
                  throw new MaxLengthError('Decode error - map field "wwwAuthenticate" had too many elements')
                }

                obj.wwwAuthenticate.push(http.Challenge.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.wwwAuthenticate$
                }))
                break
              }
              case 2: {
                obj.authorization = http.Credentials.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.authorization
                })
                break
              }
              case 3: {
                obj.authenticationInfo = http.AuthInfoParams.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.authenticationInfo
                })
                break
              }
              case 4: {
                if (opts.limits?.proxyAuthenticate != null && obj.proxyAuthenticate.length === opts.limits.proxyAuthenticate) {
                  throw new MaxLengthError('Decode error - map field "proxyAuthenticate" had too many elements')
                }

                obj.proxyAuthenticate.push(http.Challenge.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.proxyAuthenticate$
                }))
                break
              }
              case 5: {
                obj.proxyAuthorization = http.Credentials.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.proxyAuthorization
                })
                break
              }
              case 6: {
                obj.proxyAuthenticationInfo = http.ProxyAuthInfoParams.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.proxyAuthenticationInfo
                })
                break
              }
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<AuthenticationInfo>): Uint8Array => {
      return encodeMessage(obj, AuthenticationInfo.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AuthenticationInfo>): AuthenticationInfo => {
      return decodeMessage(buf, AuthenticationInfo.codec(), opts)
    }
  }

  let _codec: Codec<http>

  export const codec = (): Codec<http> => {
    if (_codec == null) {
      _codec = message<http>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<http>): Uint8Array => {
    return encodeMessage(obj, http.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<http>): http => {
    return decodeMessage(buf, http.codec(), opts)
  }
}
