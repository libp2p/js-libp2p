<a name="0.5.4"></a>
## [0.5.4](https://github.com/libp2p/js-libp2p-keychain/compare/v0.5.3...v0.5.4) (2019-12-18)



<a name="0.5.3"></a>
## [0.5.3](https://github.com/libp2p/js-libp2p-keychain/compare/v0.5.2...v0.5.3) (2019-12-18)



<a name="0.5.2"></a>
## [0.5.2](https://github.com/libp2p/js-libp2p-keychain/compare/v0.5.1...v0.5.2) (2019-12-02)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-keychain/compare/v0.5.0...v0.5.1) (2019-09-25)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-keychain/compare/v0.4.2...v0.5.0) (2019-08-16)


*  refactor: use async/await instead of callbacks (#37) ([dda315a](https://github.com/libp2p/js-libp2p-keychain/commit/dda315a)), closes [#37](https://github.com/libp2p/js-libp2p-keychain/issues/37)


### BREAKING CHANGES

* The api now uses async/await instead of callbacks.

Co-Authored-By: Vasco Santos <vasco.santos@moxy.studio>



<a name="0.4.2"></a>
## [0.4.2](https://github.com/libp2p/js-libp2p-keychain/compare/v0.4.1...v0.4.2) (2019-06-13)


### Bug Fixes

* throw errors with correct stack trace ([#35](https://github.com/libp2p/js-libp2p-keychain/issues/35)) ([7051b9c](https://github.com/libp2p/js-libp2p-keychain/commit/7051b9c))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-keychain/compare/v0.4.0...v0.4.1) (2019-03-14)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.6...v0.4.0) (2019-02-26)


### Features

* adds support for ed25199 and secp256k1 ([#31](https://github.com/libp2p/js-libp2p-keychain/issues/31)) ([9eb11f4](https://github.com/libp2p/js-libp2p-keychain/commit/9eb11f4))



<a name="0.3.6"></a>
## [0.3.6](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.5...v0.3.6) (2019-01-10)


### Bug Fixes

* reduce bundle size ([#28](https://github.com/libp2p/js-libp2p-keychain/issues/28)) ([7eeed87](https://github.com/libp2p/js-libp2p-keychain/commit/7eeed87))



<a name="0.3.5"></a>
## [0.3.5](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.4...v0.3.5) (2019-01-10)



<a name="0.3.4"></a>
## [0.3.4](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.3...v0.3.4) (2019-01-04)



<a name="0.3.3"></a>
## [0.3.3](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.2...v0.3.3) (2018-10-25)



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.1...v0.3.2) (2018-09-18)


### Bug Fixes

* validate createKey params properly ([#26](https://github.com/libp2p/js-libp2p-keychain/issues/26)) ([8dfaab1](https://github.com/libp2p/js-libp2p-keychain/commit/8dfaab1))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-keychain/compare/v0.3.0...v0.3.1) (2018-01-29)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-keychain/compare/v0.2.1...v0.3.0) (2018-01-29)


### Bug Fixes

* deepmerge 2.0.1 fails in browser, stay with 1.5.2 ([2ce4444](https://github.com/libp2p/js-libp2p-keychain/commit/2ce4444))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-keychain/compare/v0.2.0...v0.2.1) (2017-12-28)


### Features

* generate unique options for a key chain ([#20](https://github.com/libp2p/js-libp2p-keychain/issues/20)) ([89a451c](https://github.com/libp2p/js-libp2p-keychain/commit/89a451c))



<a name="0.2.0"></a>
# 0.2.0 (2017-12-20)


### Bug Fixes

* error message ([8305d20](https://github.com/libp2p/js-libp2p-keychain/commit/8305d20))
* lint errors ([06917f7](https://github.com/libp2p/js-libp2p-keychain/commit/06917f7))
* lint errors ([ff4f656](https://github.com/libp2p/js-libp2p-keychain/commit/ff4f656))
* linting ([409a999](https://github.com/libp2p/js-libp2p-keychain/commit/409a999))
* maps an IPFS hash name to its forge equivalent ([f71d3a6](https://github.com/libp2p/js-libp2p-keychain/commit/f71d3a6)), closes [#12](https://github.com/libp2p/js-libp2p-keychain/issues/12)
* more linting ([7c44c91](https://github.com/libp2p/js-libp2p-keychain/commit/7c44c91))
* return info on removed key [#10](https://github.com/libp2p/js-libp2p-keychain/issues/10) ([f49e753](https://github.com/libp2p/js-libp2p-keychain/commit/f49e753))


### Features

* move bits from https://github.com/richardschneider/ipfs-encryption ([1a96ae8](https://github.com/libp2p/js-libp2p-keychain/commit/1a96ae8))
* use libp2p-crypto ([#18](https://github.com/libp2p/js-libp2p-keychain/issues/18)) ([c1627a9](https://github.com/libp2p/js-libp2p-keychain/commit/c1627a9))



