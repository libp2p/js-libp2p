/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface ProxyConfiguration {
    host: string
    port: number
    bypassHosts: string[]
    directConnectSchemes: string[]
    username: string
    password: string
    configSource: http.ProxyConfiguration.ConfigSource
    pacUrl: string
  }

  export namespace ProxyConfiguration {
    export enum ConfigSource {
      MANUAL = 'MANUAL',
      AUTO_DETECT = 'AUTO_DETECT',
      PAC_SCRIPT = 'PAC_SCRIPT',
      SYSTEM = 'SYSTEM',
      ENVIRONMENT = 'ENVIRONMENT'
    }

    enum __ConfigSourceValues {
      MANUAL = 0,
      AUTO_DETECT = 1,
      PAC_SCRIPT = 2,
      SYSTEM = 3,
      ENVIRONMENT = 4
    }

    export namespace ConfigSource {
      export const codec = (): Codec<ConfigSource> => {
        return enumeration<ConfigSource>(__ConfigSourceValues)
      }
    }

    let _codec: Codec<ProxyConfiguration>

    export const codec = (): Codec<ProxyConfiguration> => {
      if (_codec == null) {
        _codec = message<ProxyConfiguration>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.host != null && obj.host !== '')) {
            w.uint32(10)
            w.string(obj.host)
          }

          if ((obj.port != null && obj.port !== 0)) {
            w.uint32(16)
            w.int32(obj.port)
          }

          if (obj.bypassHosts != null) {
            for (const value of obj.bypassHosts) {
              w.uint32(26)
              w.string(value)
            }
          }

          if (obj.directConnectSchemes != null) {
            for (const value of obj.directConnectSchemes) {
              w.uint32(34)
              w.string(value)
            }
          }

          if ((obj.username != null && obj.username !== '')) {
            w.uint32(42)
            w.string(obj.username)
          }

          if ((obj.password != null && obj.password !== '')) {
            w.uint32(50)
            w.string(obj.password)
          }

          if (obj.configSource != null && __ConfigSourceValues[obj.configSource] !== 0) {
            w.uint32(56)
            http.ProxyConfiguration.ConfigSource.codec().encode(obj.configSource, w)
          }

          if ((obj.pacUrl != null && obj.pacUrl !== '')) {
            w.uint32(66)
            w.string(obj.pacUrl)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            host: '',
            port: 0,
            bypassHosts: [],
            directConnectSchemes: [],
            username: '',
            password: '',
            configSource: ConfigSource.MANUAL,
            pacUrl: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.host = reader.string()
                break
              }
              case 2: {
                obj.port = reader.int32()
                break
              }
              case 3: {
                if (opts.limits?.bypassHosts != null && obj.bypassHosts.length === opts.limits.bypassHosts) {
                  throw new MaxLengthError('Decode error - map field "bypassHosts" had too many elements')
                }

                obj.bypassHosts.push(reader.string())
                break
              }
              case 4: {
                if (opts.limits?.directConnectSchemes != null && obj.directConnectSchemes.length === opts.limits.directConnectSchemes) {
                  throw new MaxLengthError('Decode error - map field "directConnectSchemes" had too many elements')
                }

                obj.directConnectSchemes.push(reader.string())
                break
              }
              case 5: {
                obj.username = reader.string()
                break
              }
              case 6: {
                obj.password = reader.string()
                break
              }
              case 7: {
                obj.configSource = http.ProxyConfiguration.ConfigSource.codec().decode(reader)
                break
              }
              case 8: {
                obj.pacUrl = reader.string()
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

    export const encode = (obj: Partial<ProxyConfiguration>): Uint8Array => {
      return encodeMessage(obj, ProxyConfiguration.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProxyConfiguration>): ProxyConfiguration => {
      return decodeMessage(buf, ProxyConfiguration.codec(), opts)
    }
  }

  export interface OriginMapping {
    incomingHost: string
    targetHost: string
    targetPort: number
    targetScheme: string
    preserveHost: boolean
  }

  export namespace OriginMapping {
    let _codec: Codec<OriginMapping>

    export const codec = (): Codec<OriginMapping> => {
      if (_codec == null) {
        _codec = message<OriginMapping>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.incomingHost != null && obj.incomingHost !== '')) {
            w.uint32(10)
            w.string(obj.incomingHost)
          }

          if ((obj.targetHost != null && obj.targetHost !== '')) {
            w.uint32(18)
            w.string(obj.targetHost)
          }

          if ((obj.targetPort != null && obj.targetPort !== 0)) {
            w.uint32(24)
            w.int32(obj.targetPort)
          }

          if ((obj.targetScheme != null && obj.targetScheme !== '')) {
            w.uint32(34)
            w.string(obj.targetScheme)
          }

          if ((obj.preserveHost != null && obj.preserveHost !== false)) {
            w.uint32(40)
            w.bool(obj.preserveHost)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            incomingHost: '',
            targetHost: '',
            targetPort: 0,
            targetScheme: '',
            preserveHost: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.incomingHost = reader.string()
                break
              }
              case 2: {
                obj.targetHost = reader.string()
                break
              }
              case 3: {
                obj.targetPort = reader.int32()
                break
              }
              case 4: {
                obj.targetScheme = reader.string()
                break
              }
              case 5: {
                obj.preserveHost = reader.bool()
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

    export const encode = (obj: Partial<OriginMapping>): Uint8Array => {
      return encodeMessage(obj, OriginMapping.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<OriginMapping>): OriginMapping => {
      return decodeMessage(buf, OriginMapping.codec(), opts)
    }
  }

  export interface RequestTransformation {
    headerName: string
    action: http.RequestTransformation.Action
    value: string
  }

  export namespace RequestTransformation {
    export enum Action {
      ADD = 'ADD',
      REMOVE = 'REMOVE',
      REPLACE = 'REPLACE'
    }

    enum __ActionValues {
      ADD = 0,
      REMOVE = 1,
      REPLACE = 2
    }

    export namespace Action {
      export const codec = (): Codec<Action> => {
        return enumeration<Action>(__ActionValues)
      }
    }

    let _codec: Codec<RequestTransformation>

    export const codec = (): Codec<RequestTransformation> => {
      if (_codec == null) {
        _codec = message<RequestTransformation>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.headerName != null && obj.headerName !== '')) {
            w.uint32(10)
            w.string(obj.headerName)
          }

          if (obj.action != null && __ActionValues[obj.action] !== 0) {
            w.uint32(16)
            http.RequestTransformation.Action.codec().encode(obj.action, w)
          }

          if ((obj.value != null && obj.value !== '')) {
            w.uint32(26)
            w.string(obj.value)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            headerName: '',
            action: Action.ADD,
            value: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.headerName = reader.string()
                break
              }
              case 2: {
                obj.action = http.RequestTransformation.Action.codec().decode(reader)
                break
              }
              case 3: {
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

    export const encode = (obj: Partial<RequestTransformation>): Uint8Array => {
      return encodeMessage(obj, RequestTransformation.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RequestTransformation>): RequestTransformation => {
      return decodeMessage(buf, RequestTransformation.codec(), opts)
    }
  }

  export interface GatewayConfiguration {
    originMappings: http.OriginMapping[]
    requestTransformations: http.RequestTransformation[]
    responseTransformations: http.RequestTransformation[]
  }

  export namespace GatewayConfiguration {
    let _codec: Codec<GatewayConfiguration>

    export const codec = (): Codec<GatewayConfiguration> => {
      if (_codec == null) {
        _codec = message<GatewayConfiguration>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.originMappings != null) {
            for (const value of obj.originMappings) {
              w.uint32(10)
              http.OriginMapping.codec().encode(value, w)
            }
          }

          if (obj.requestTransformations != null) {
            for (const value of obj.requestTransformations) {
              w.uint32(18)
              http.RequestTransformation.codec().encode(value, w)
            }
          }

          if (obj.responseTransformations != null) {
            for (const value of obj.responseTransformations) {
              w.uint32(26)
              http.RequestTransformation.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            originMappings: [],
            requestTransformations: [],
            responseTransformations: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.originMappings != null && obj.originMappings.length === opts.limits.originMappings) {
                  throw new MaxLengthError('Decode error - map field "originMappings" had too many elements')
                }

                obj.originMappings.push(http.OriginMapping.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.originMappings$
                }))
                break
              }
              case 2: {
                if (opts.limits?.requestTransformations != null && obj.requestTransformations.length === opts.limits.requestTransformations) {
                  throw new MaxLengthError('Decode error - map field "requestTransformations" had too many elements')
                }

                obj.requestTransformations.push(http.RequestTransformation.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.requestTransformations$
                }))
                break
              }
              case 3: {
                if (opts.limits?.responseTransformations != null && obj.responseTransformations.length === opts.limits.responseTransformations) {
                  throw new MaxLengthError('Decode error - map field "responseTransformations" had too many elements')
                }

                obj.responseTransformations.push(http.RequestTransformation.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.responseTransformations$
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

    export const encode = (obj: Partial<GatewayConfiguration>): Uint8Array => {
      return encodeMessage(obj, GatewayConfiguration.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<GatewayConfiguration>): GatewayConfiguration => {
      return decodeMessage(buf, GatewayConfiguration.codec(), opts)
    }
  }

  export interface TlsConfiguration {
    protocols: string[]
    cipherSuites: string[]
    verifyPeer: boolean
    verifyHostname: boolean
    caFile: string
    certFile: string
    keyFile: string
    alpnProtocols: string[]
  }

  export namespace TlsConfiguration {
    let _codec: Codec<TlsConfiguration>

    export const codec = (): Codec<TlsConfiguration> => {
      if (_codec == null) {
        _codec = message<TlsConfiguration>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.protocols != null) {
            for (const value of obj.protocols) {
              w.uint32(10)
              w.string(value)
            }
          }

          if (obj.cipherSuites != null) {
            for (const value of obj.cipherSuites) {
              w.uint32(18)
              w.string(value)
            }
          }

          if ((obj.verifyPeer != null && obj.verifyPeer !== false)) {
            w.uint32(24)
            w.bool(obj.verifyPeer)
          }

          if ((obj.verifyHostname != null && obj.verifyHostname !== false)) {
            w.uint32(32)
            w.bool(obj.verifyHostname)
          }

          if ((obj.caFile != null && obj.caFile !== '')) {
            w.uint32(42)
            w.string(obj.caFile)
          }

          if ((obj.certFile != null && obj.certFile !== '')) {
            w.uint32(50)
            w.string(obj.certFile)
          }

          if ((obj.keyFile != null && obj.keyFile !== '')) {
            w.uint32(58)
            w.string(obj.keyFile)
          }

          if (obj.alpnProtocols != null) {
            for (const value of obj.alpnProtocols) {
              w.uint32(66)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            protocols: [],
            cipherSuites: [],
            verifyPeer: false,
            verifyHostname: false,
            caFile: '',
            certFile: '',
            keyFile: '',
            alpnProtocols: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                  throw new MaxLengthError('Decode error - map field "protocols" had too many elements')
                }

                obj.protocols.push(reader.string())
                break
              }
              case 2: {
                if (opts.limits?.cipherSuites != null && obj.cipherSuites.length === opts.limits.cipherSuites) {
                  throw new MaxLengthError('Decode error - map field "cipherSuites" had too many elements')
                }

                obj.cipherSuites.push(reader.string())
                break
              }
              case 3: {
                obj.verifyPeer = reader.bool()
                break
              }
              case 4: {
                obj.verifyHostname = reader.bool()
                break
              }
              case 5: {
                obj.caFile = reader.string()
                break
              }
              case 6: {
                obj.certFile = reader.string()
                break
              }
              case 7: {
                obj.keyFile = reader.string()
                break
              }
              case 8: {
                if (opts.limits?.alpnProtocols != null && obj.alpnProtocols.length === opts.limits.alpnProtocols) {
                  throw new MaxLengthError('Decode error - map field "alpnProtocols" had too many elements')
                }

                obj.alpnProtocols.push(reader.string())
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

    export const encode = (obj: Partial<TlsConfiguration>): Uint8Array => {
      return encodeMessage(obj, TlsConfiguration.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TlsConfiguration>): TlsConfiguration => {
      return decodeMessage(buf, TlsConfiguration.codec(), opts)
    }
  }

  export interface TransportSecurity {
    tlsConfig?: http.TlsConfiguration
    requireSecureTransport: boolean
    hstsEnabled: boolean
    hstsMaxAge: number
    hstsIncludeSubdomains: boolean
  }

  export namespace TransportSecurity {
    let _codec: Codec<TransportSecurity>

    export const codec = (): Codec<TransportSecurity> => {
      if (_codec == null) {
        _codec = message<TransportSecurity>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.tlsConfig != null) {
            w.uint32(10)
            http.TlsConfiguration.codec().encode(obj.tlsConfig, w)
          }

          if ((obj.requireSecureTransport != null && obj.requireSecureTransport !== false)) {
            w.uint32(16)
            w.bool(obj.requireSecureTransport)
          }

          if ((obj.hstsEnabled != null && obj.hstsEnabled !== false)) {
            w.uint32(24)
            w.bool(obj.hstsEnabled)
          }

          if ((obj.hstsMaxAge != null && obj.hstsMaxAge !== 0)) {
            w.uint32(32)
            w.int32(obj.hstsMaxAge)
          }

          if ((obj.hstsIncludeSubdomains != null && obj.hstsIncludeSubdomains !== false)) {
            w.uint32(40)
            w.bool(obj.hstsIncludeSubdomains)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            requireSecureTransport: false,
            hstsEnabled: false,
            hstsMaxAge: 0,
            hstsIncludeSubdomains: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.tlsConfig = http.TlsConfiguration.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.tlsConfig
                })
                break
              }
              case 2: {
                obj.requireSecureTransport = reader.bool()
                break
              }
              case 3: {
                obj.hstsEnabled = reader.bool()
                break
              }
              case 4: {
                obj.hstsMaxAge = reader.int32()
                break
              }
              case 5: {
                obj.hstsIncludeSubdomains = reader.bool()
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

    export const encode = (obj: Partial<TransportSecurity>): Uint8Array => {
      return encodeMessage(obj, TransportSecurity.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransportSecurity>): TransportSecurity => {
      return decodeMessage(buf, TransportSecurity.codec(), opts)
    }
  }

  export interface ViaConfiguration {
    pseudonym: string
    addVersion: boolean
    obfuscateHosts: boolean
    forwardingBehavior: http.ViaConfiguration.ForwardingBehavior
  }

  export namespace ViaConfiguration {
    export enum ForwardingBehavior {
      APPEND = 'APPEND',
      COMBINE = 'COMBINE',
      OMIT = 'OMIT'
    }

    enum __ForwardingBehaviorValues {
      APPEND = 0,
      COMBINE = 1,
      OMIT = 2
    }

    export namespace ForwardingBehavior {
      export const codec = (): Codec<ForwardingBehavior> => {
        return enumeration<ForwardingBehavior>(__ForwardingBehaviorValues)
      }
    }

    let _codec: Codec<ViaConfiguration>

    export const codec = (): Codec<ViaConfiguration> => {
      if (_codec == null) {
        _codec = message<ViaConfiguration>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.pseudonym != null && obj.pseudonym !== '')) {
            w.uint32(10)
            w.string(obj.pseudonym)
          }

          if ((obj.addVersion != null && obj.addVersion !== false)) {
            w.uint32(16)
            w.bool(obj.addVersion)
          }

          if ((obj.obfuscateHosts != null && obj.obfuscateHosts !== false)) {
            w.uint32(24)
            w.bool(obj.obfuscateHosts)
          }

          if (obj.forwardingBehavior != null && __ForwardingBehaviorValues[obj.forwardingBehavior] !== 0) {
            w.uint32(32)
            http.ViaConfiguration.ForwardingBehavior.codec().encode(obj.forwardingBehavior, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            pseudonym: '',
            addVersion: false,
            obfuscateHosts: false,
            forwardingBehavior: ForwardingBehavior.APPEND
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.pseudonym = reader.string()
                break
              }
              case 2: {
                obj.addVersion = reader.bool()
                break
              }
              case 3: {
                obj.obfuscateHosts = reader.bool()
                break
              }
              case 4: {
                obj.forwardingBehavior = http.ViaConfiguration.ForwardingBehavior.codec().decode(reader)
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

    export const encode = (obj: Partial<ViaConfiguration>): Uint8Array => {
      return encodeMessage(obj, ViaConfiguration.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ViaConfiguration>): ViaConfiguration => {
      return decodeMessage(buf, ViaConfiguration.codec(), opts)
    }
  }

  export interface ConnectionPool {
    maxConnectionsPerHost: number
    maxConnectionsTotal: number
    connectionTimeoutMs: number
    idleTimeoutMs: number
    keepAlive: boolean
  }

  export namespace ConnectionPool {
    let _codec: Codec<ConnectionPool>

    export const codec = (): Codec<ConnectionPool> => {
      if (_codec == null) {
        _codec = message<ConnectionPool>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.maxConnectionsPerHost != null && obj.maxConnectionsPerHost !== 0)) {
            w.uint32(8)
            w.int32(obj.maxConnectionsPerHost)
          }

          if ((obj.maxConnectionsTotal != null && obj.maxConnectionsTotal !== 0)) {
            w.uint32(16)
            w.int32(obj.maxConnectionsTotal)
          }

          if ((obj.connectionTimeoutMs != null && obj.connectionTimeoutMs !== 0)) {
            w.uint32(24)
            w.int32(obj.connectionTimeoutMs)
          }

          if ((obj.idleTimeoutMs != null && obj.idleTimeoutMs !== 0)) {
            w.uint32(32)
            w.int32(obj.idleTimeoutMs)
          }

          if ((obj.keepAlive != null && obj.keepAlive !== false)) {
            w.uint32(40)
            w.bool(obj.keepAlive)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            maxConnectionsPerHost: 0,
            maxConnectionsTotal: 0,
            connectionTimeoutMs: 0,
            idleTimeoutMs: 0,
            keepAlive: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.maxConnectionsPerHost = reader.int32()
                break
              }
              case 2: {
                obj.maxConnectionsTotal = reader.int32()
                break
              }
              case 3: {
                obj.connectionTimeoutMs = reader.int32()
                break
              }
              case 4: {
                obj.idleTimeoutMs = reader.int32()
                break
              }
              case 5: {
                obj.keepAlive = reader.bool()
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

    export const encode = (obj: Partial<ConnectionPool>): Uint8Array => {
      return encodeMessage(obj, ConnectionPool.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnectionPool>): ConnectionPool => {
      return decodeMessage(buf, ConnectionPool.codec(), opts)
    }
  }

  export interface ConnectionManagement {
    connectionPool?: http.ConnectionPool
    tcpNodelay: boolean
    sendBufferSize: number
    receiveBufferSize: number
    connectTimeoutMs: number
    tcpKeepalive: boolean
    maxRequestHeaderSize: number
    maxResponseHeaderSize: number
    maxHeaderCount: number
    maxConcurrentStreams: number
    closePolicy: http.ConnectionManagement.ConnectionClosePolicy
  }

  export namespace ConnectionManagement {
    export enum ConnectionClosePolicy {
      NORMAL = 'NORMAL',
      AGGRESSIVE = 'AGGRESSIVE',
      KEEP_OPEN = 'KEEP_OPEN'
    }

    enum __ConnectionClosePolicyValues {
      NORMAL = 0,
      AGGRESSIVE = 1,
      KEEP_OPEN = 2
    }

    export namespace ConnectionClosePolicy {
      export const codec = (): Codec<ConnectionClosePolicy> => {
        return enumeration<ConnectionClosePolicy>(__ConnectionClosePolicyValues)
      }
    }

    let _codec: Codec<ConnectionManagement>

    export const codec = (): Codec<ConnectionManagement> => {
      if (_codec == null) {
        _codec = message<ConnectionManagement>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.connectionPool != null) {
            w.uint32(10)
            http.ConnectionPool.codec().encode(obj.connectionPool, w)
          }

          if ((obj.tcpNodelay != null && obj.tcpNodelay !== false)) {
            w.uint32(16)
            w.bool(obj.tcpNodelay)
          }

          if ((obj.sendBufferSize != null && obj.sendBufferSize !== 0)) {
            w.uint32(24)
            w.int32(obj.sendBufferSize)
          }

          if ((obj.receiveBufferSize != null && obj.receiveBufferSize !== 0)) {
            w.uint32(32)
            w.int32(obj.receiveBufferSize)
          }

          if ((obj.connectTimeoutMs != null && obj.connectTimeoutMs !== 0)) {
            w.uint32(40)
            w.int32(obj.connectTimeoutMs)
          }

          if ((obj.tcpKeepalive != null && obj.tcpKeepalive !== false)) {
            w.uint32(48)
            w.bool(obj.tcpKeepalive)
          }

          if ((obj.maxRequestHeaderSize != null && obj.maxRequestHeaderSize !== 0)) {
            w.uint32(56)
            w.int32(obj.maxRequestHeaderSize)
          }

          if ((obj.maxResponseHeaderSize != null && obj.maxResponseHeaderSize !== 0)) {
            w.uint32(64)
            w.int32(obj.maxResponseHeaderSize)
          }

          if ((obj.maxHeaderCount != null && obj.maxHeaderCount !== 0)) {
            w.uint32(72)
            w.int32(obj.maxHeaderCount)
          }

          if ((obj.maxConcurrentStreams != null && obj.maxConcurrentStreams !== 0)) {
            w.uint32(80)
            w.int32(obj.maxConcurrentStreams)
          }

          if (obj.closePolicy != null && __ConnectionClosePolicyValues[obj.closePolicy] !== 0) {
            w.uint32(88)
            http.ConnectionManagement.ConnectionClosePolicy.codec().encode(obj.closePolicy, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            tcpNodelay: false,
            sendBufferSize: 0,
            receiveBufferSize: 0,
            connectTimeoutMs: 0,
            tcpKeepalive: false,
            maxRequestHeaderSize: 0,
            maxResponseHeaderSize: 0,
            maxHeaderCount: 0,
            maxConcurrentStreams: 0,
            closePolicy: ConnectionClosePolicy.NORMAL
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.connectionPool = http.ConnectionPool.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.connectionPool
                })
                break
              }
              case 2: {
                obj.tcpNodelay = reader.bool()
                break
              }
              case 3: {
                obj.sendBufferSize = reader.int32()
                break
              }
              case 4: {
                obj.receiveBufferSize = reader.int32()
                break
              }
              case 5: {
                obj.connectTimeoutMs = reader.int32()
                break
              }
              case 6: {
                obj.tcpKeepalive = reader.bool()
                break
              }
              case 7: {
                obj.maxRequestHeaderSize = reader.int32()
                break
              }
              case 8: {
                obj.maxResponseHeaderSize = reader.int32()
                break
              }
              case 9: {
                obj.maxHeaderCount = reader.int32()
                break
              }
              case 10: {
                obj.maxConcurrentStreams = reader.int32()
                break
              }
              case 11: {
                obj.closePolicy = http.ConnectionManagement.ConnectionClosePolicy.codec().decode(reader)
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

    export const encode = (obj: Partial<ConnectionManagement>): Uint8Array => {
      return encodeMessage(obj, ConnectionManagement.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnectionManagement>): ConnectionManagement => {
      return decodeMessage(buf, ConnectionManagement.codec(), opts)
    }
  }

  export interface HopByHopHeadersConfig {
    additionalHopByHopHeaders: string[]
    stripConnectionHeader: boolean
    stripHopByHopHeaders: boolean
  }

  export namespace HopByHopHeadersConfig {
    let _codec: Codec<HopByHopHeadersConfig>

    export const codec = (): Codec<HopByHopHeadersConfig> => {
      if (_codec == null) {
        _codec = message<HopByHopHeadersConfig>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.additionalHopByHopHeaders != null) {
            for (const value of obj.additionalHopByHopHeaders) {
              w.uint32(10)
              w.string(value)
            }
          }

          if ((obj.stripConnectionHeader != null && obj.stripConnectionHeader !== false)) {
            w.uint32(16)
            w.bool(obj.stripConnectionHeader)
          }

          if ((obj.stripHopByHopHeaders != null && obj.stripHopByHopHeaders !== false)) {
            w.uint32(24)
            w.bool(obj.stripHopByHopHeaders)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            additionalHopByHopHeaders: [],
            stripConnectionHeader: false,
            stripHopByHopHeaders: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.additionalHopByHopHeaders != null && obj.additionalHopByHopHeaders.length === opts.limits.additionalHopByHopHeaders) {
                  throw new MaxLengthError('Decode error - map field "additionalHopByHopHeaders" had too many elements')
                }

                obj.additionalHopByHopHeaders.push(reader.string())
                break
              }
              case 2: {
                obj.stripConnectionHeader = reader.bool()
                break
              }
              case 3: {
                obj.stripHopByHopHeaders = reader.bool()
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

    export const encode = (obj: Partial<HopByHopHeadersConfig>): Uint8Array => {
      return encodeMessage(obj, HopByHopHeadersConfig.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopByHopHeadersConfig>): HopByHopHeadersConfig => {
      return decodeMessage(buf, HopByHopHeadersConfig.codec(), opts)
    }
  }

  export interface RetryConfig {
    maxRetries: number
    retryStatusCodes: number[]
    retryMethods: string[]
    retryDelayMs: number
    retryOnNetworkErrors: boolean
    retryOnTimeout: boolean
    onlyRetryIdempotent: boolean
  }

  export namespace RetryConfig {
    let _codec: Codec<RetryConfig>

    export const codec = (): Codec<RetryConfig> => {
      if (_codec == null) {
        _codec = message<RetryConfig>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.maxRetries != null && obj.maxRetries !== 0)) {
            w.uint32(8)
            w.int32(obj.maxRetries)
          }

          if (obj.retryStatusCodes != null) {
            for (const value of obj.retryStatusCodes) {
              w.uint32(16)
              w.int32(value)
            }
          }

          if (obj.retryMethods != null) {
            for (const value of obj.retryMethods) {
              w.uint32(26)
              w.string(value)
            }
          }

          if ((obj.retryDelayMs != null && obj.retryDelayMs !== 0)) {
            w.uint32(32)
            w.int32(obj.retryDelayMs)
          }

          if ((obj.retryOnNetworkErrors != null && obj.retryOnNetworkErrors !== false)) {
            w.uint32(40)
            w.bool(obj.retryOnNetworkErrors)
          }

          if ((obj.retryOnTimeout != null && obj.retryOnTimeout !== false)) {
            w.uint32(48)
            w.bool(obj.retryOnTimeout)
          }

          if ((obj.onlyRetryIdempotent != null && obj.onlyRetryIdempotent !== false)) {
            w.uint32(56)
            w.bool(obj.onlyRetryIdempotent)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            maxRetries: 0,
            retryStatusCodes: [],
            retryMethods: [],
            retryDelayMs: 0,
            retryOnNetworkErrors: false,
            retryOnTimeout: false,
            onlyRetryIdempotent: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.maxRetries = reader.int32()
                break
              }
              case 2: {
                if (opts.limits?.retryStatusCodes != null && obj.retryStatusCodes.length === opts.limits.retryStatusCodes) {
                  throw new MaxLengthError('Decode error - map field "retryStatusCodes" had too many elements')
                }

                obj.retryStatusCodes.push(reader.int32())
                break
              }
              case 3: {
                if (opts.limits?.retryMethods != null && obj.retryMethods.length === opts.limits.retryMethods) {
                  throw new MaxLengthError('Decode error - map field "retryMethods" had too many elements')
                }

                obj.retryMethods.push(reader.string())
                break
              }
              case 4: {
                obj.retryDelayMs = reader.int32()
                break
              }
              case 5: {
                obj.retryOnNetworkErrors = reader.bool()
                break
              }
              case 6: {
                obj.retryOnTimeout = reader.bool()
                break
              }
              case 7: {
                obj.onlyRetryIdempotent = reader.bool()
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

    export const encode = (obj: Partial<RetryConfig>): Uint8Array => {
      return encodeMessage(obj, RetryConfig.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RetryConfig>): RetryConfig => {
      return decodeMessage(buf, RetryConfig.codec(), opts)
    }
  }

  export interface TimeoutConfig {
    connectTimeoutMs: number
    readTimeoutMs: number
    writeTimeoutMs: number
    idleTimeoutMs: number
    responseTimeoutMs: number
    keepAliveTimeoutMs: number
  }

  export namespace TimeoutConfig {
    let _codec: Codec<TimeoutConfig>

    export const codec = (): Codec<TimeoutConfig> => {
      if (_codec == null) {
        _codec = message<TimeoutConfig>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.connectTimeoutMs != null && obj.connectTimeoutMs !== 0)) {
            w.uint32(8)
            w.int32(obj.connectTimeoutMs)
          }

          if ((obj.readTimeoutMs != null && obj.readTimeoutMs !== 0)) {
            w.uint32(16)
            w.int32(obj.readTimeoutMs)
          }

          if ((obj.writeTimeoutMs != null && obj.writeTimeoutMs !== 0)) {
            w.uint32(24)
            w.int32(obj.writeTimeoutMs)
          }

          if ((obj.idleTimeoutMs != null && obj.idleTimeoutMs !== 0)) {
            w.uint32(32)
            w.int32(obj.idleTimeoutMs)
          }

          if ((obj.responseTimeoutMs != null && obj.responseTimeoutMs !== 0)) {
            w.uint32(40)
            w.int32(obj.responseTimeoutMs)
          }

          if ((obj.keepAliveTimeoutMs != null && obj.keepAliveTimeoutMs !== 0)) {
            w.uint32(48)
            w.int32(obj.keepAliveTimeoutMs)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            connectTimeoutMs: 0,
            readTimeoutMs: 0,
            writeTimeoutMs: 0,
            idleTimeoutMs: 0,
            responseTimeoutMs: 0,
            keepAliveTimeoutMs: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.connectTimeoutMs = reader.int32()
                break
              }
              case 2: {
                obj.readTimeoutMs = reader.int32()
                break
              }
              case 3: {
                obj.writeTimeoutMs = reader.int32()
                break
              }
              case 4: {
                obj.idleTimeoutMs = reader.int32()
                break
              }
              case 5: {
                obj.responseTimeoutMs = reader.int32()
                break
              }
              case 6: {
                obj.keepAliveTimeoutMs = reader.int32()
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

    export const encode = (obj: Partial<TimeoutConfig>): Uint8Array => {
      return encodeMessage(obj, TimeoutConfig.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TimeoutConfig>): TimeoutConfig => {
      return decodeMessage(buf, TimeoutConfig.codec(), opts)
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
