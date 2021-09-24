## [0.10.6](https://github.com/libp2p/js-libp2p-record/compare/v0.10.5...v0.10.6) (2021-09-24)


### Bug Fixes

* auto select if only one record ([#31](https://github.com/libp2p/js-libp2p-record/issues/31)) ([53bc7f2](https://github.com/libp2p/js-libp2p-record/commit/53bc7f2627a95256337033977a05df54a534f951))



## [0.10.5](https://github.com/libp2p/js-libp2p-record/compare/v0.10.4...v0.10.5) (2021-08-18)



## [0.10.4](https://github.com/libp2p/js-libp2p-record/compare/v0.10.3...v0.10.4) (2021-07-07)



## [0.10.3](https://github.com/libp2p/js-libp2p-record/compare/v0.10.2...v0.10.3) (2021-04-22)


### Bug Fixes

* use dht selectors and validators from interfaces ([#28](https://github.com/libp2p/js-libp2p-record/issues/28)) ([7b211a5](https://github.com/libp2p/js-libp2p-record/commit/7b211a528675018abbc8e4674bedbdd5ab7b5eea))



## [0.10.2](https://github.com/libp2p/js-libp2p-record/compare/v0.10.1...v0.10.2) (2021-04-20)


### Bug Fixes

* specify pbjs root ([#27](https://github.com/libp2p/js-libp2p-record/issues/27)) ([32ddb1d](https://github.com/libp2p/js-libp2p-record/commit/32ddb1deec71543d0ef34157b6ef2d271e8408f5))



## [0.10.1](https://github.com/libp2p/js-libp2p-record/compare/v0.10.0...v0.10.1) (2021-04-07)



# [0.10.0](https://github.com/libp2p/js-libp2p-record/compare/v0.8.0...v0.10.0) (2021-02-02)


### Features

* add types and update deps ([#25](https://github.com/libp2p/js-libp2p-record/issues/25)) ([e2395de](https://github.com/libp2p/js-libp2p-record/commit/e2395de924a9c71d761c6ea3f5aab2844b252591))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-record/compare/v0.8.0...v0.9.0) (2020-08-07)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-record/compare/v0.7.3...v0.8.0) (2020-07-29)


### Bug Fixes

* support uint8arrays in place of node buffers ([#23](https://github.com/libp2p/js-libp2p-record/issues/23)) ([3b99ee1](https://github.com/libp2p/js-libp2p-record/commit/3b99ee1))


### BREAKING CHANGES

* takes Uint8Arrays as well as Node Buffers



<a name="0.7.3"></a>
## [0.7.3](https://github.com/libp2p/js-libp2p-record/compare/v0.7.2...v0.7.3) (2020-04-27)


### Bug Fixes

* remove buffer ([#21](https://github.com/libp2p/js-libp2p-record/issues/21)) ([80fb248](https://github.com/libp2p/js-libp2p-record/commit/80fb248))



<a name="0.7.2"></a>
## [0.7.2](https://github.com/libp2p/js-libp2p-record/compare/v0.7.1...v0.7.2) (2020-02-13)


### Bug Fixes

* remove use of assert module ([#18](https://github.com/libp2p/js-libp2p-record/issues/18)) ([57e24a7](https://github.com/libp2p/js-libp2p-record/commit/57e24a7))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-record/compare/v0.7.0...v0.7.1) (2020-01-03)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-record/compare/v0.6.3...v0.7.0) (2019-08-16)


### Code Refactoring

* convert from callbacks to async ([#13](https://github.com/libp2p/js-libp2p-record/issues/13)) ([42eab95](https://github.com/libp2p/js-libp2p-record/commit/42eab95))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await



<a name="0.6.3"></a>
## [0.6.3](https://github.com/libp2p/js-libp2p-record/compare/v0.6.2...v0.6.3) (2019-05-23)


### Bug Fixes

* remove leftpad ([#16](https://github.com/libp2p/js-libp2p-record/issues/16)) ([4f46885](https://github.com/libp2p/js-libp2p-record/commit/4f46885))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p-record/compare/v0.6.1...v0.6.2) (2019-02-20)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-record/compare/v0.6.0...v0.6.1) (2018-11-08)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-record/compare/v0.5.1...v0.6.0) (2018-10-18)


### Features

* new record definition ([#8](https://github.com/libp2p/js-libp2p-record/issues/8)) ([10177ae](https://github.com/libp2p/js-libp2p-record/commit/10177ae))


### BREAKING CHANGES

* having the libp2p-record protobuf definition compliant with go-libp2p-record. Author and signature were removed.



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-record/compare/v0.5.0...v0.5.1) (2017-09-07)


### Features

* replace protocol-buffers with protons ([#5](https://github.com/libp2p/js-libp2p-record/issues/5)) ([8774a4f](https://github.com/libp2p/js-libp2p-record/commit/8774a4f))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-record/compare/v0.4.0...v0.5.0) (2017-09-03)


### Features

* p2p addrs situation ([#4](https://github.com/libp2p/js-libp2p-record/issues/4)) ([bcba43c](https://github.com/libp2p/js-libp2p-record/commit/bcba43c))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-record/compare/v0.3.1...v0.4.0) (2017-07-22)



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-record/compare/v0.3.0...v0.3.1) (2017-03-29)



<a name="0.3.0"></a>
# 0.3.0 (2017-03-29)



