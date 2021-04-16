## [0.10.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.2...v0.10.3) (2021-04-16)



## [0.10.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.5...v0.10.2) (2021-01-29)


### Bug Fixes

* ensure stream closes on abort or reset ([#116](https://github.com/libp2p/js-libp2p-mplex/issues/116)) ([77835b3](https://github.com/libp2p/js-libp2p-mplex/commit/77835b326fbce02e3a9bf92f0084d01e4e1d9cf9))
* replace node buffers with uint8arrays ([#114](https://github.com/libp2p/js-libp2p-mplex/issues/114)) ([d005338](https://github.com/libp2p/js-libp2p-mplex/commit/d005338154b6882a22396e921ba4a38cc4e213fc))


### BREAKING CHANGES

* - All use of node Buffers has been replaced with Uint8Arrays

* fix: keep allocUnsafe for node for performance

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



## [0.10.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.10.0...v0.10.1) (2020-10-22)


### Bug Fixes

* ensure stream closes on abort or reset ([#116](https://github.com/libp2p/js-libp2p-mplex/issues/116)) ([77835b3](https://github.com/libp2p/js-libp2p-mplex/commit/77835b326fbce02e3a9bf92f0084d01e4e1d9cf9))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.5...v0.10.0) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#114](https://github.com/libp2p/js-libp2p-mplex/issues/114)) ([d005338](https://github.com/libp2p/js-libp2p-mplex/commit/d005338))


### BREAKING CHANGES

* - All use of node Buffers has been replaced with Uint8Arrays

* fix: keep allocUnsafe for node for performance

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="0.9.5"></a>
## [0.9.5](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.4...v0.9.5) (2020-03-18)


### Bug Fixes

* add buffer ([#106](https://github.com/libp2p/js-libp2p-mplex/issues/106)) ([71f3e5b](https://github.com/libp2p/js-libp2p-mplex/commit/71f3e5b))



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.3...v0.9.4) (2020-02-13)


### Performance Improvements

* small bl ([#101](https://github.com/libp2p/js-libp2p-mplex/issues/101)) ([7da79b6](https://github.com/libp2p/js-libp2p-mplex/commit/7da79b6))



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.2...v0.9.3) (2019-11-28)


### Features

* message splitting ([#100](https://github.com/libp2p/js-libp2p-mplex/issues/100)) ([fba56a5](https://github.com/libp2p/js-libp2p-mplex/commit/fba56a5))



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.1...v0.9.2) (2019-10-28)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.9.0...v0.9.1) (2019-09-23)


### Features

* add better support for external stream metadata tracking ([#98](https://github.com/libp2p/js-libp2p-mplex/issues/98)) ([96f1ca0](https://github.com/libp2p/js-libp2p-mplex/commit/96f1ca0))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.5...v0.9.0) (2019-09-18)


### Code Refactoring

* async iterators ([#94](https://github.com/libp2p/js-libp2p-mplex/issues/94)) ([c9bede5](https://github.com/libp2p/js-libp2p-mplex/commit/c9bede5))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await while pull-streams are replaced with async iterators. The API has also been updated according to the latest `interface-stream-muxer` version, https://github.com/libp2p/interface-stream-muxer/tree/v0.7.0.

License: MIT
Signed-off-by: Alan Shaw <alan.shaw@protocol.ai>



<a name="0.8.5"></a>
## [0.8.5](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.4...v0.8.5) (2019-03-18)



<a name="0.8.4"></a>
## [0.8.4](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.3...v0.8.4) (2018-11-15)



<a name="0.8.3"></a>
## [0.8.3](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.2...v0.8.3) (2018-11-08)


### Bug Fixes

* muxer.end will no longer hang ([#86](https://github.com/libp2p/js-libp2p-mplex/issues/86)) ([e23cbaf](https://github.com/libp2p/js-libp2p-mplex/commit/e23cbaf))



<a name="0.8.2"></a>
## [0.8.2](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.1...v0.8.2) (2018-10-01)


### Bug Fixes

* improve resiliency of internals _send ([#84](https://github.com/libp2p/js-libp2p-mplex/issues/84)) ([70dafb7](https://github.com/libp2p/js-libp2p-mplex/commit/70dafb7))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-mplex/compare/v0.8.0...v0.8.1) (2018-10-01)


### Bug Fixes

* verify drain before new push ([#82](https://github.com/libp2p/js-libp2p-mplex/issues/82)) ([cd77e01](https://github.com/libp2p/js-libp2p-mplex/commit/cd77e01))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.7.0...v0.8.0) (2018-06-19)


### Bug Fixes

* add setImmediatte to the call of callback ([8cdcd0d](https://github.com/libp2p/js-libp2p-mplex/commit/8cdcd0d))
* catch Multiplexer is destroyed error into callback ([#79](https://github.com/libp2p/js-libp2p-mplex/issues/79)) ([b60205f](https://github.com/libp2p/js-libp2p-mplex/commit/b60205f))
* missing dep and readme example ([#77](https://github.com/libp2p/js-libp2p-mplex/issues/77)) ([904cd7c](https://github.com/libp2p/js-libp2p-mplex/commit/904cd7c))
* package.json deps semver ([126b966](https://github.com/libp2p/js-libp2p-mplex/commit/126b966))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.6.0...v0.7.0) (2018-04-05)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-mplex/compare/v0.5.1...v0.6.0) (2018-02-19)


### Features

* mplex is all here ([20cf80a](https://github.com/libp2p/js-libp2p-mplex/commit/20cf80a))
* support new Buffer ([c1384c3](https://github.com/libp2p/js-libp2p-mplex/commit/c1384c3))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.5.0...v0.5.1) (2017-12-14)


### Features

* porting to new aegir ([#70](https://github.com/libp2p/js-libp2p-multiplex/issues/70)) ([30fc825](https://github.com/libp2p/js-libp2p-multiplex/commit/30fc825))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.4...v0.5.0) (2017-09-03)


### Features

* p2p addrs situation ([#69](https://github.com/libp2p/js-libp2p-multiplex/issues/69)) ([d58f50e](https://github.com/libp2p/js-libp2p-multiplex/commit/d58f50e))



<a name="0.4.4"></a>
## [0.4.4](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.3...v0.4.4) (2017-07-08)



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.2...v0.4.3) (2017-03-21)



<a name="0.4.2"></a>
## [0.4.2](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.1...v0.4.2) (2017-03-21)


### Bug Fixes

* add missing setImmediate shim ([b039b81](https://github.com/libp2p/js-libp2p-multiplex/commit/b039b81)), closes [#61](https://github.com/libp2p/js-libp2p-multiplex/issues/61)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.4.0...v0.4.1) (2017-02-21)


### Bug Fixes

* correct handling of multiplex options ([fa78df4](https://github.com/libp2p/js-libp2p-multiplex/commit/fa78df4))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.6...v0.4.0) (2017-02-15)



<a name="0.3.6"></a>
## [0.3.6](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.5...v0.3.6) (2017-02-09)



<a name="0.3.5"></a>
## [0.3.5](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.4...v0.3.5) (2017-01-26)



<a name="0.3.4"></a>
## [0.3.4](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.3...v0.3.4) (2017-01-24)



<a name="0.3.3"></a>
## [0.3.3](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.2...v0.3.3) (2017-01-24)


### Bug Fixes

* check for callbacks ([9ef5553](https://github.com/libp2p/js-libp2p-multiplex/commit/9ef5553))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.1...v0.3.2) (2017-01-24)


### Bug Fixes

* dropped packed ([a7cfb8b](https://github.com/libp2p/js-libp2p-multiplex/commit/a7cfb8b))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.3.0...v0.3.1) (2017-01-20)


### Bug Fixes

* **docs:** Update readme.md's example and added files for it ([ccd94c8](https://github.com/libp2p/js-libp2p-multiplex/commit/ccd94c8))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.2.1...v0.3.0) (2017-01-20)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.2.0...v0.2.1) (2016-03-22)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-multiplex/compare/v0.1.0...v0.2.0) (2016-03-07)



<a name="0.1.0"></a>
# 0.1.0 (2016-03-07)



