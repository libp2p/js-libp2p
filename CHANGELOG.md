## [0.15.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.4...v0.15.5) (2021-04-12)



## [0.15.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.3...v0.15.4) (2021-03-31)



## [0.15.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.2...v0.15.3) (2021-02-22)



## [0.15.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.1...v0.15.2) (2021-02-09)


### Bug Fixes

* add error event handler ([#118](https://github.com/libp2p/js-libp2p-websockets/issues/118)) ([577d350](https://github.com/libp2p/js-libp2p-websockets/commit/577d3505f559b153ec9e0bbca7d31d2f164712bc))



## [0.15.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.15.0...v0.15.1) (2021-02-05)


### Bug Fixes

* incompatibility with @evanw/esbuild[#740](https://github.com/libp2p/js-libp2p-websockets/issues/740) ([#120](https://github.com/libp2p/js-libp2p-websockets/issues/120)) ([96244f0](https://github.com/libp2p/js-libp2p-websockets/commit/96244f048929c5225905327ae27a88961fe535f8))



# [0.15.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.1...v0.15.0) (2020-11-24)


### Bug Fixes

* add buffer ([#112](https://github.com/libp2p/js-libp2p-websockets/issues/112)) ([8065e07](https://github.com/libp2p/js-libp2p-websockets/commit/8065e07bad57b5732cdcec5ce3829ac2361604cf))
* catch thrown maConn errors in listener ([8bfb19a](https://github.com/libp2p/js-libp2p-websockets/commit/8bfb19a78f296c10d8e1a3c0ac608daa9ffcfefc))
* remove use of assert module ([#101](https://github.com/libp2p/js-libp2p-websockets/issues/101)) ([89d3723](https://github.com/libp2p/js-libp2p-websockets/commit/89d37232b8f603804b6ce5cd8230cc75d2dd8e28))
* replace node buffers with uint8arrays ([#115](https://github.com/libp2p/js-libp2p-websockets/issues/115)) ([a277bf6](https://github.com/libp2p/js-libp2p-websockets/commit/a277bf6bfbc7ad796e51f7646d7449c203384c06))


### Features

* custom address filter ([#116](https://github.com/libp2p/js-libp2p-websockets/issues/116)) ([711c721](https://github.com/libp2p/js-libp2p-websockets/commit/711c721b033d28b3c57c37bf9ca98d0f5d2a58b6))


### BREAKING CHANGES

* Only DNS+WSS addresses are now returned on filter by default in the browser. This can be overritten by the filter option and filters are provided in the module.



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.6...v0.14.0) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#115](https://github.com/libp2p/js-libp2p-websockets/issues/115)) ([a277bf6](https://github.com/libp2p/js-libp2p-websockets/commit/a277bf6))


### BREAKING CHANGES

* - All deps used by this module now use Uint8Arrays in place of Buffers

* chore: remove gh dep



<a name="0.13.6"></a>
## [0.13.6](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.5...v0.13.6) (2020-03-23)


### Bug Fixes

* add buffer ([#112](https://github.com/libp2p/js-libp2p-websockets/issues/112)) ([8065e07](https://github.com/libp2p/js-libp2p-websockets/commit/8065e07))



<a name="0.13.5"></a>
## [0.13.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.4...v0.13.5) (2020-02-26)


### Bug Fixes

* catch thrown maConn errors in listener ([8bfb19a](https://github.com/libp2p/js-libp2p-websockets/commit/8bfb19a))



<a name="0.13.4"></a>
## [0.13.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.3...v0.13.4) (2020-02-14)


### Bug Fixes

* remove use of assert module ([#101](https://github.com/libp2p/js-libp2p-websockets/issues/101)) ([89d3723](https://github.com/libp2p/js-libp2p-websockets/commit/89d3723))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.2...v0.13.3) (2020-02-07)



<a name="0.13.2"></a>
## [0.13.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.1...v0.13.2) (2019-12-20)



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.13.0...v0.13.1) (2019-10-30)


### Bug Fixes

* catch inbound upgrade errors ([#96](https://github.com/libp2p/js-libp2p-websockets/issues/96)) ([5b59fc3](https://github.com/libp2p/js-libp2p-websockets/commit/5b59fc3))
* support bufferlist usage ([#97](https://github.com/libp2p/js-libp2p-websockets/issues/97)) ([3bf66d0](https://github.com/libp2p/js-libp2p-websockets/commit/3bf66d0))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.3...v0.13.0) (2019-09-30)


### Code Refactoring

* async with multiaddr conn ([#92](https://github.com/libp2p/js-libp2p-websockets/issues/92)) ([ce7bf4f](https://github.com/libp2p/js-libp2p-websockets/commit/ce7bf4f))


### BREAKING CHANGES

* Switch to using async/await and async iterators. The transport and connection interfaces have changed. See the README for new usage.



<a name="0.12.3"></a>
## [0.12.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.2...v0.12.3) (2019-08-21)



<a name="0.12.2"></a>
## [0.12.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.1...v0.12.2) (2019-01-24)


### Bug Fixes

* ipv6 naming with multiaddr-to-uri package ([#81](https://github.com/libp2p/js-libp2p-websockets/issues/81)) ([93ef7c3](https://github.com/libp2p/js-libp2p-websockets/commit/93ef7c3))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.12.0...v0.12.1) (2019-01-10)


### Bug Fixes

* reduce bundle size ([68ae2c3](https://github.com/libp2p/js-libp2p-websockets/commit/68ae2c3))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.11.0...v0.12.0) (2018-04-30)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.5...v0.11.0) (2018-04-05)


### Features

* add class-is module ([#72](https://github.com/libp2p/js-libp2p-websockets/issues/72)) ([f59cf88](https://github.com/libp2p/js-libp2p-websockets/commit/f59cf88))
* Pass options to websocket server ([#66](https://github.com/libp2p/js-libp2p-websockets/issues/66)) ([709989a](https://github.com/libp2p/js-libp2p-websockets/commit/709989a))



<a name="0.10.5"></a>
## [0.10.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.4...v0.10.5) (2018-02-20)



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.2...v0.10.4) (2017-10-22)



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.2...v0.10.3) (2017-10-22)



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.1...v0.10.2) (2017-10-20)


### Features

* filter IPFS addrs correctly ([#62](https://github.com/libp2p/js-libp2p-websockets/issues/62)) ([9ddff85](https://github.com/libp2p/js-libp2p-websockets/commit/9ddff85)), closes [#64](https://github.com/libp2p/js-libp2p-websockets/issues/64)
* new aegir  ([3d3cdf1](https://github.com/libp2p/js-libp2p-websockets/commit/3d3cdf1))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.10.0...v0.10.1) (2017-07-22)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.6...v0.10.0) (2017-03-27)


### Bug Fixes

* **dial:** pass through errors from pull-ws onConnect ([8df8084](https://github.com/libp2p/js-libp2p-websockets/commit/8df8084))



<a name="0.9.6"></a>
## [0.9.6](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.5...v0.9.6) (2017-03-23)


### Bug Fixes

* address parsing ([#57](https://github.com/libp2p/js-libp2p-websockets/issues/57)) ([9fbbe3f](https://github.com/libp2p/js-libp2p-websockets/commit/9fbbe3f))



<a name="0.9.5"></a>
## [0.9.5](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.4...v0.9.5) (2017-03-23)



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.2...v0.9.4) (2017-03-21)



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.1...v0.9.2) (2017-02-09)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.9.0...v0.9.1) (2016-11-08)


### Bug Fixes

* onConnect does not follow callback pattern ([#36](https://github.com/libp2p/js-libp2p-websockets/issues/36)) ([a821c33](https://github.com/libp2p/js-libp2p-websockets/commit/a821c33))
* the fix ([0429beb](https://github.com/libp2p/js-libp2p-websockets/commit/0429beb))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.8.1...v0.9.0) (2016-11-03)


### Features

* upgrade to aegir@9 ([#33](https://github.com/libp2p/js-libp2p-websockets/issues/33)) ([e73c99e](https://github.com/libp2p/js-libp2p-websockets/commit/e73c99e))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.8.0...v0.8.1) (2016-09-06)


### Features

* **readme:** update pull-streams section ([64c57f5](https://github.com/libp2p/js-libp2p-websockets/commit/64c57f5))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.2...v0.8.0) (2016-09-06)


### Features

* **pull:** migrate to pull streams ([3f58dca](https://github.com/libp2p/js-libp2p-websockets/commit/3f58dca))
* **readme:** complete the readme, adding reference about pull-streams ([b62560e](https://github.com/libp2p/js-libp2p-websockets/commit/b62560e))



<a name="0.7.2"></a>
## [0.7.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.1...v0.7.2) (2016-08-29)


### Bug Fixes

* **style:** reduce nested callbacks ([33f5fb3](https://github.com/libp2p/js-libp2p-websockets/commit/33f5fb3))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.7.0...v0.7.1) (2016-08-03)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.6.1...v0.7.0) (2016-06-22)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.6.0...v0.6.1) (2016-05-29)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.5.0...v0.6.0) (2016-05-22)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.4...v0.5.0) (2016-05-17)



<a name="0.4.4"></a>
## [0.4.4](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.3...v0.4.4) (2016-05-08)


### Bug Fixes

* improve close handling ([cd89354](https://github.com/libp2p/js-libp2p-websockets/commit/cd89354))



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-websockets/compare/v0.4.1...v0.4.3) (2016-05-08)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.3.2...v0.4.1) (2016-04-25)



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.2...v0.3.2) (2016-04-14)



<a name="0.2.2"></a>
## [0.2.2](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.1...v0.2.2) (2016-04-14)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-websockets/compare/v0.2.0...v0.2.1) (2016-03-20)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-websockets/compare/v0.1.0...v0.2.0) (2016-03-14)



<a name="0.1.0"></a>
# 0.1.0 (2016-02-26)



