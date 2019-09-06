<a name="0.18.0"></a>
# [0.18.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.17.2...v0.18.0) (2019-09-06)


### Features

* emit self default to false ([#89](https://github.com/libp2p/js-libp2p-floodsub/issues/89)) ([39ff708](https://github.com/libp2p/js-libp2p-floodsub/commit/39ff708))


### BREAKING CHANGES

* messages are not self emitted by default anymore. You need to set the emitSelf option to true to use it



<a name="0.17.2"></a>
## [0.17.2](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.17.1...v0.17.2) (2019-09-03)


### Features

* pass options to base protocol constructor ([#87](https://github.com/libp2p/js-libp2p-floodsub/issues/87)) ([daa97f8](https://github.com/libp2p/js-libp2p-floodsub/commit/daa97f8))



<a name="0.17.1"></a>
## [0.17.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.17.0...v0.17.1) (2019-07-25)


### Features

* optional self emit ([#85](https://github.com/libp2p/js-libp2p-floodsub/issues/85)) ([a9e73d7](https://github.com/libp2p/js-libp2p-floodsub/commit/a9e73d7))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.16.1...v0.17.0) (2019-07-08)


### Features

* add strict signing validation for messages ([#84](https://github.com/libp2p/js-libp2p-floodsub/issues/84) ([eed2bc5](https://github.com/libp2p/js-libp2p-floodsub/commit/eed2bc5))


### BREAKING CHANGES

* If messages are not being signed, this change will result in them being dropped. A previous release of floodsub added signing by default, but any Floodsub version older than v0.16.0 will have their messages dropped. This is inline with the latest go pubsub behavior.



<a name="0.16.1"></a>
## [0.16.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.16.0...v0.16.1) (2019-05-08)


### Bug Fixes

* _emitMessages should not emit normalized messages ([#79](https://github.com/libp2p/js-libp2p-floodsub/issues/79)) ([917b7f1](https://github.com/libp2p/js-libp2p-floodsub/commit/917b7f1))



<a name="0.16.0"></a>
# [0.16.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.8...v0.16.0) (2019-05-07)


### Bug Fixes

* use pubsub seenCache ([#75](https://github.com/libp2p/js-libp2p-floodsub/issues/75)) ([19d9a96](https://github.com/libp2p/js-libp2p-floodsub/commit/19d9a96))


### Features

* add support for signing ([#78](https://github.com/libp2p/js-libp2p-floodsub/issues/78)) ([4feadeb](https://github.com/libp2p/js-libp2p-floodsub/commit/4feadeb))


### BREAKING CHANGES

* publish now takes a callback as it needs to sign messages



<a name="0.15.8"></a>
## [0.15.8](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.7...v0.15.8) (2019-02-14)



<a name="0.15.7"></a>
## [0.15.7](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.6...v0.15.7) (2019-01-09)


### Bug Fixes

* reduce bundle size ([#67](https://github.com/libp2p/js-libp2p-floodsub/issues/67)) ([3ff955e](https://github.com/libp2p/js-libp2p-floodsub/commit/3ff955e))



<a name="0.15.6"></a>
## [0.15.6](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.5...v0.15.6) (2019-01-04)



<a name="0.15.5"></a>
## [0.15.5](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.4...v0.15.5) (2018-12-15)


### Bug Fixes

* crash when disconnect happens during dial ([#65](https://github.com/libp2p/js-libp2p-floodsub/issues/65)) ([894e3cc](https://github.com/libp2p/js-libp2p-floodsub/commit/894e3cc))



<a name="0.15.4"></a>
## [0.15.4](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.3...v0.15.4) (2018-12-15)


### Bug Fixes

* allow dials even after error ([#66](https://github.com/libp2p/js-libp2p-floodsub/issues/66)) ([8f3c4e5](https://github.com/libp2p/js-libp2p-floodsub/commit/8f3c4e5))



<a name="0.15.3"></a>
## [0.15.3](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.2...v0.15.3) (2018-12-06)


### Bug Fixes

* prevent double dialing same peer ([#63](https://github.com/libp2p/js-libp2p-floodsub/issues/63)) ([3303ad0](https://github.com/libp2p/js-libp2p-floodsub/commit/3303ad0))



<a name="0.15.2"></a>
## [0.15.2](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.1...v0.15.2) (2018-11-28)


### Features

* emit event when a remote peer's subscriptions change ([#61](https://github.com/libp2p/js-libp2p-floodsub/issues/61)) ([7611b2e](https://github.com/libp2p/js-libp2p-floodsub/commit/7611b2e))



<a name="0.15.1"></a>
## [0.15.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.15.0...v0.15.1) (2018-10-23)


### Bug Fixes

* ignore message false positive ([#59](https://github.com/libp2p/js-libp2p-floodsub/issues/59)) ([55916fe](https://github.com/libp2p/js-libp2p-floodsub/commit/55916fe))


### Features

* breakout BaseProtocol ([#57](https://github.com/libp2p/js-libp2p-floodsub/issues/57)) ([c4a108d](https://github.com/libp2p/js-libp2p-floodsub/commit/c4a108d))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.14.1...v0.15.0) (2018-04-05)



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.14.0...v0.14.1) (2018-02-12)



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.13.1...v0.14.0) (2018-02-10)


### Features

* use latest libp2p ([22af5cc](https://github.com/libp2p/js-libp2p-floodsub/commit/22af5cc))



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.13.0...v0.13.1) (2017-12-05)


### Bug Fixes

* remove peer once the peer closes. should fix peer leak ([#52](https://github.com/libp2p/js-libp2p-floodsub/issues/52)) ([6e6c507](https://github.com/libp2p/js-libp2p-floodsub/commit/6e6c507))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.12.1...v0.13.0) (2017-11-22)


### Bug Fixes

* various floodsub issues ([#51](https://github.com/libp2p/js-libp2p-floodsub/issues/51)) ([45c9b11](https://github.com/libp2p/js-libp2p-floodsub/commit/45c9b11))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.12.0...v0.12.1) (2017-11-20)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.11.1...v0.12.0) (2017-11-16)


### Bug Fixes

* Published message field names ([#49](https://github.com/libp2p/js-libp2p-floodsub/issues/49)) ([b8f66cd](https://github.com/libp2p/js-libp2p-floodsub/commit/b8f66cd))



<a name="0.11.1"></a>
## [0.11.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.11.0...v0.11.1) (2017-09-07)


### Features

* replace protocol-buffers with protons ([#48](https://github.com/libp2p/js-libp2p-floodsub/issues/48)) ([d5b7e23](https://github.com/libp2p/js-libp2p-floodsub/commit/d5b7e23))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.10.1...v0.11.0) (2017-07-23)



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.10.0...v0.10.1) (2017-07-21)


### Features

* update deps and stop using swarm directly ([281771e](https://github.com/libp2p/js-libp2p-floodsub/commit/281771e))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.9.4...v0.10.0) (2017-07-07)


### Bug Fixes

* _dialPeer always calls back ([bccffd6](https://github.com/libp2p/js-libp2p-floodsub/commit/bccffd6))
* no more dep on ipfs-nodejs ([551fc4c](https://github.com/libp2p/js-libp2p-floodsub/commit/551fc4c))



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.9.3...v0.9.4) (2017-05-16)


### Bug Fixes

* avoid race condition on unsubscribe ([8cf5498](https://github.com/libp2p/js-libp2p-floodsub/commit/8cf5498))



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.9.2...v0.9.3) (2017-05-12)


### Bug Fixes

* check if peer exists first ([6b18a4f](https://github.com/libp2p/js-libp2p-floodsub/commit/6b18a4f))



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.9.1...v0.9.2) (2017-05-12)


### Bug Fixes

* race condition ([8dd9f3b](https://github.com/libp2p/js-libp2p-floodsub/commit/8dd9f3b))
* really nasty race condition that would only happen on travis while running js-ipfs tests ([09220b9](https://github.com/libp2p/js-libp2p-floodsub/commit/09220b9))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.9.0...v0.9.1) (2017-05-04)


### Bug Fixes

* use async setImmediate, make browserify happy ([9ec264b](https://github.com/libp2p/js-libp2p-floodsub/commit/9ec264b))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.8.1...v0.9.0) (2017-04-03)


### Features

* new libp2p apis ([21d8ff5](https://github.com/libp2p/js-libp2p-floodsub/commit/21d8ff5))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.8.0...v0.8.1) (2017-03-29)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.5...v0.8.0) (2017-03-27)


### Features

* update to latest libp2p-api ([798c2ae](https://github.com/libp2p/js-libp2p-floodsub/commit/798c2ae))



<a name="0.7.5"></a>
## [0.7.5](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.4...v0.7.5) (2017-03-21)



<a name="0.7.4"></a>
## [0.7.4](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.3...v0.7.4) (2017-02-20)



<a name="0.7.3"></a>
## [0.7.3](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.2...v0.7.3) (2017-02-09)


### Features

* change window to self for webworker support ([61d396f](https://github.com/libp2p/js-libp2p-floodsub/commit/61d396f))



<a name="0.7.2"></a>
## [0.7.2](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.1...v0.7.2) (2017-01-29)



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.7.0...v0.7.1) (2017-01-11)


### Bug Fixes

* do not end not started streams ([fb8cb95](https://github.com/libp2p/js-libp2p-floodsub/commit/fb8cb95))


### Features

* match expectation on start (that dials are done) ([b802af9](https://github.com/libp2p/js-libp2p-floodsub/commit/b802af9))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.6.0...v0.7.0) (2017-01-09)


### Features

* add start and stop to FloodSub ([c7d1c57](https://github.com/libp2p/js-libp2p-floodsub/commit/c7d1c57))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.5.0...v0.6.0) (2016-12-21)


### Features

* emit full messages, instead of just data ([#13](https://github.com/libp2p/js-libp2p-floodsub/issues/13)) ([300bf95](https://github.com/libp2p/js-libp2p-floodsub/commit/300bf95))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.4.1...v0.5.0) (2016-12-18)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.4.0...v0.4.1) (2016-12-11)


### Bug Fixes

* pass subscriptions immediately on new peer connection ([#10](https://github.com/libp2p/js-libp2p-floodsub/issues/10)) ([078383a](https://github.com/libp2p/js-libp2p-floodsub/commit/078383a))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.3.1...v0.4.0) (2016-11-28)



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.3.0...v0.3.1) (2016-11-17)


### Features

* remove fs as a dependency + update aegir ([e6ae36b](https://github.com/libp2p/js-libp2p-floodsub/commit/e6ae36b))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.2.0...v0.3.0) (2016-09-14)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-floodsub/compare/v0.1.0...v0.2.0) (2016-09-14)



<a name="0.1.0"></a>
# 0.1.0 (2016-09-14)



