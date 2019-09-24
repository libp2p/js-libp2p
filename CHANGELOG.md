<a name="0.26.2"></a>
## [0.26.2](https://github.com/libp2p/js-libp2p/compare/v0.26.1...v0.26.2) (2019-09-24)


### Bug Fixes

* pubsub promisify ([#456](https://github.com/libp2p/js-libp2p/issues/456)) ([ae6af20](https://github.com/libp2p/js-libp2p/commit/ae6af20))



<a name="0.26.1"></a>
## [0.26.1](https://github.com/libp2p/js-libp2p/compare/v0.26.0...v0.26.1) (2019-08-21)


### Bug Fixes

* avoid using superstruct interface ([aa95ab9](https://github.com/libp2p/js-libp2p/commit/aa95ab9))
* improve config defaults ([#409](https://github.com/libp2p/js-libp2p/issues/409)) ([3eef695](https://github.com/libp2p/js-libp2p/commit/3eef695)), closes [#406](https://github.com/libp2p/js-libp2p/issues/406)
* pubsub configuration ([#404](https://github.com/libp2p/js-libp2p/issues/404)) ([b0f124b](https://github.com/libp2p/js-libp2p/commit/b0f124b)), closes [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401)
* reference files directly to avoid npm install failures ([#408](https://github.com/libp2p/js-libp2p/issues/408)) ([b3deb35](https://github.com/libp2p/js-libp2p/commit/b3deb35))
* reject rather than throw in get peer info ([#410](https://github.com/libp2p/js-libp2p/issues/410)) ([60b0cbc](https://github.com/libp2p/js-libp2p/commit/60b0cbc)), closes [#400](https://github.com/libp2p/js-libp2p/issues/400)



<a name="0.26.0"></a>
# [0.26.0](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.3...v0.26.0) (2019-08-07)



<a name="0.26.0-rc.3"></a>
# [0.26.0-rc.3](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.2...v0.26.0-rc.3) (2019-08-06)


### Bug Fixes

* promisified methods ([#398](https://github.com/libp2p/js-libp2p/issues/398)) ([ff7a6c8](https://github.com/libp2p/js-libp2p/commit/ff7a6c8))



<a name="0.26.0-rc.2"></a>
# [0.26.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.1...v0.26.0-rc.2) (2019-08-01)


### Bug Fixes

* dont override methods of created instance ([#394](https://github.com/libp2p/js-libp2p/issues/394)) ([3e95e6f](https://github.com/libp2p/js-libp2p/commit/3e95e6f))
* pubsub default config ([#393](https://github.com/libp2p/js-libp2p/issues/393)) ([f4f3f0f](https://github.com/libp2p/js-libp2p/commit/f4f3f0f))


### Chores

* update switch ([#395](https://github.com/libp2p/js-libp2p/issues/395)) ([684f283](https://github.com/libp2p/js-libp2p/commit/684f283))


### BREAKING CHANGES

* switch configuration has changed.
'blacklistTTL' is now 'denyTTL' and 'blackListAttempts' is now 'denyAttempts'



<a name="0.26.0-rc.1"></a>
# [0.26.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.0...v0.26.0-rc.1) (2019-07-31)



<a name="0.26.0-rc.0"></a>
# [0.26.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.25.5...v0.26.0-rc.0) (2019-07-31)


### Bug Fixes

* make subscribe comply with ipfs interface ([#389](https://github.com/libp2p/js-libp2p/issues/389)) ([9554b05](https://github.com/libp2p/js-libp2p/commit/9554b05))


### Features

* integrate gossipsub by default ([#365](https://github.com/libp2p/js-libp2p/issues/365)) ([791f39a](https://github.com/libp2p/js-libp2p/commit/791f39a))
* promisify all api methods that accept callbacks ([#381](https://github.com/libp2p/js-libp2p/issues/381)) ([df6ef45](https://github.com/libp2p/js-libp2p/commit/df6ef45))


### BREAKING CHANGES

* new configuration for deciding the implementation of pubsub to be used.
In this context, the experimental flags were also removed. See the README for the latest usage.
* The ipfs interface specified that options
should be provided after the handler, not before.
https://github.com/ipfs/interface-js-ipfs-core/blob/v0.109.0/SPEC/PUBSUB.md#pubsubsubscribe

This corrects the order of parameters. See the jsdocs examples
for subscribe to see how it should be used.



<a name="0.25.5"></a>
## [0.25.5](https://github.com/libp2p/js-libp2p/compare/v0.25.4...v0.25.5) (2019-07-12)


### Bug Fixes

* peer routing for delegate router ([#377](https://github.com/libp2p/js-libp2p/issues/377)) ([905c911](https://github.com/libp2p/js-libp2p/commit/905c911)), closes [/github.com/libp2p/go-libp2p-core/blob/6e566d10f4a5447317a66d64c7459954b969bdab/routing/query.go#L15-L24](https://github.com//github.com/libp2p/go-libp2p-core/blob/6e566d10f4a5447317a66d64c7459954b969bdab/routing/query.go/issues/L15-L24)



<a name="0.25.4"></a>
## [0.25.4](https://github.com/libp2p/js-libp2p/compare/v0.25.3...v0.25.4) (2019-06-07)


### Features

* add createLibp2p to generate a PeerInfo instance ([#367](https://github.com/libp2p/js-libp2p/issues/367)) ([04faf18](https://github.com/libp2p/js-libp2p/commit/04faf18))
* pass libp2p as option to transport creation ([#363](https://github.com/libp2p/js-libp2p/issues/363)) ([b06ca1b](https://github.com/libp2p/js-libp2p/commit/b06ca1b))



<a name="0.25.3"></a>
## [0.25.3](https://github.com/libp2p/js-libp2p/compare/v0.25.2...v0.25.3) (2019-05-07)


### Features

* sign pubsub messages ([#362](https://github.com/libp2p/js-libp2p/issues/362)) ([40978a1](https://github.com/libp2p/js-libp2p/commit/40978a1))



<a name="0.25.2"></a>
## [0.25.2](https://github.com/libp2p/js-libp2p/compare/v0.25.1...v0.25.2) (2019-04-17)


### Bug Fixes

* dht config ([#359](https://github.com/libp2p/js-libp2p/issues/359)) ([f3801f0](https://github.com/libp2p/js-libp2p/commit/f3801f0))



<a name="0.25.1"></a>
## [0.25.1](https://github.com/libp2p/js-libp2p/compare/v0.25.0...v0.25.1) (2019-04-16)


### Bug Fixes

* bail when discovering self ([#357](https://github.com/libp2p/js-libp2p/issues/357)) ([f28dffb](https://github.com/libp2p/js-libp2p/commit/f28dffb))



<a name="0.25.0"></a>
# [0.25.0](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.6...v0.25.0) (2019-04-12)


### Bug Fixes

* allow switch to be configured ([#354](https://github.com/libp2p/js-libp2p/issues/354)) ([eb5aa03](https://github.com/libp2p/js-libp2p/commit/eb5aa03))



<a name="0.25.0-rc.6"></a>
# [0.25.0-rc.6](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.5...v0.25.0-rc.6) (2019-04-11)


### Bug Fixes

* connection emits ([#352](https://github.com/libp2p/js-libp2p/issues/352)) ([313b1ea](https://github.com/libp2p/js-libp2p/commit/313b1ea))
* remove unneeded peerbook puts ([#348](https://github.com/libp2p/js-libp2p/issues/348)) ([e5f19e8](https://github.com/libp2p/js-libp2p/commit/e5f19e8))


### Features

* auto dial discovered peers ([#349](https://github.com/libp2p/js-libp2p/issues/349)) ([01aa447](https://github.com/libp2p/js-libp2p/commit/01aa447))



<a name="0.25.0-rc.5"></a>
# [0.25.0-rc.5](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.4...v0.25.0-rc.5) (2019-03-21)


### Bug Fixes

* disable dht by default [#338](https://github.com/libp2p/js-libp2p/issues/338) ([#339](https://github.com/libp2p/js-libp2p/issues/339)) ([e52ce66](https://github.com/libp2p/js-libp2p/commit/e52ce66))


### Features

* update to the latest switch ([#336](https://github.com/libp2p/js-libp2p/issues/336)) ([eee60ed](https://github.com/libp2p/js-libp2p/commit/eee60ed))



<a name="0.25.0-rc.4"></a>
# [0.25.0-rc.4](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.3...v0.25.0-rc.4) (2019-03-06)



<a name="0.25.0-rc.3"></a>
# [0.25.0-rc.3](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.2...v0.25.0-rc.3) (2019-02-26)



<a name="0.25.0-rc.2"></a>
# [0.25.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.1...v0.25.0-rc.2) (2019-02-26)


### Bug Fixes

* make the config less restrictive ([#329](https://github.com/libp2p/js-libp2p/issues/329)) ([5f92acd](https://github.com/libp2p/js-libp2p/commit/5f92acd))



<a name="0.25.0-rc.1"></a>
# [0.25.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.0...v0.25.0-rc.1) (2019-02-21)


### Bug Fixes

* bundle-size ([#298](https://github.com/libp2p/js-libp2p/issues/298)) ([d497961](https://github.com/libp2p/js-libp2p/commit/d497961))
* emit peer discovery for dht discovery ([9e7a080](https://github.com/libp2p/js-libp2p/commit/9e7a080))


### Features

* support unsubscribe all for pubsub ([#321](https://github.com/libp2p/js-libp2p/issues/321)) ([6e76aad](https://github.com/libp2p/js-libp2p/commit/6e76aad))



<a name="0.24.4"></a>
## [0.24.4](https://github.com/libp2p/js-libp2p/compare/v0.24.3...v0.24.4) (2019-01-04)



<a name="0.24.3"></a>
## [0.24.3](https://github.com/libp2p/js-libp2p/compare/v0.24.2...v0.24.3) (2018-12-14)


### Bug Fixes

* not started yet ([#297](https://github.com/libp2p/js-libp2p/issues/297)) ([fdfb7b4](https://github.com/libp2p/js-libp2p/commit/fdfb7b4))



<a name="0.24.2"></a>
## [0.24.2](https://github.com/libp2p/js-libp2p/compare/v0.24.1...v0.24.2) (2018-12-04)


### Bug Fixes

* use symbol instead of constructor name ([#292](https://github.com/libp2p/js-libp2p/issues/292)) ([53ed3bd](https://github.com/libp2p/js-libp2p/commit/53ed3bd))



<a name="0.24.1"></a>
## [0.24.1](https://github.com/libp2p/js-libp2p/compare/v0.24.0...v0.24.1) (2018-12-03)


### Features

* allow configurable validators and selectors to the dht ([#288](https://github.com/libp2p/js-libp2p/issues/288)) ([7d12eb9](https://github.com/libp2p/js-libp2p/commit/7d12eb9))



<a name="0.24.0"></a>
# [0.24.0](https://github.com/libp2p/js-libp2p/compare/v0.24.0-rc.3...v0.24.0) (2018-11-16)

### Bug Fixes

* add maxtimeout to dht get ([#248](https://github.com/libp2p/js-libp2p/issues/248)) ([69f7264](https://github.com/libp2p/js-libp2p/commit/69f7264))
* dht get options ([4460e82](https://github.com/libp2p/js-libp2p/commit/4460e82))
* dont call callback before it's properly set ([17b5f73](https://github.com/libp2p/js-libp2p/commit/17b5f73))
* improve get peer info errors ([714b6ec](https://github.com/libp2p/js-libp2p/commit/714b6ec))
* start kad dht random walk ([#251](https://github.com/libp2p/js-libp2p/issues/251)) ([dd934b9](https://github.com/libp2p/js-libp2p/commit/dd934b9))

### Features

* add datastore to config ([40e840d](https://github.com/libp2p/js-libp2p/commit/40e840d))
* add delegated peer and content routing support ([#242](https://github.com/libp2p/js-libp2p/issues/242)) ([a95389a](https://github.com/libp2p/js-libp2p/commit/a95389a))
* add maxNumProviders to findprovs ([#283](https://github.com/libp2p/js-libp2p/issues/283)) ([970deec](https://github.com/libp2p/js-libp2p/commit/970deec))
* conditionally emit errors ([f71fdfd](https://github.com/libp2p/js-libp2p/commit/f71fdfd))
* enable relay by default (no hop) ([#254](https://github.com/libp2p/js-libp2p/issues/254)) ([686379e](https://github.com/libp2p/js-libp2p/commit/686379e))
* make libp2p a state machine ([#257](https://github.com/libp2p/js-libp2p/issues/257)) ([0b75f99](https://github.com/libp2p/js-libp2p/commit/0b75f99))
* use package-table vs custom script ([a63432e](https://github.com/libp2p/js-libp2p/commit/a63432e))

<a name="0.23.1"></a>
## [0.23.1](https://github.com/libp2p/js-libp2p/compare/v0.23.0...v0.23.1) (2018-08-13)


### Bug Fixes

* callback with error for invalid or non-peer multiaddr ([#232](https://github.com/libp2p/js-libp2p/issues/232)) ([c8a86db](https://github.com/libp2p/js-libp2p/commit/c8a86db))



<a name="0.23.0"></a>
# [0.23.0](https://github.com/libp2p/js-libp2p/compare/v0.22.0...v0.23.0) (2018-07-27)


### Bug Fixes

* start and stop connection manager with libp2p ([6106915](https://github.com/libp2p/js-libp2p/commit/6106915))


### Features

* add check for protector and enforced pnet ([2b7cc55](https://github.com/libp2p/js-libp2p/commit/2b7cc55))



<a name="0.22.0"></a>
# [0.22.0](https://github.com/libp2p/js-libp2p/compare/v0.21.0...v0.22.0) (2018-06-29)


### Bug Fixes

* add null property guards ([80f0b60](https://github.com/libp2p/js-libp2p/commit/80f0b60))
* do not mutate the config object ([ac5cacb](https://github.com/libp2p/js-libp2p/commit/ac5cacb))
* remove .only ([be9eafe](https://github.com/libp2p/js-libp2p/commit/be9eafe))
* remove peer discovery module config checks ([4ad70ef](https://github.com/libp2p/js-libp2p/commit/4ad70ef))
* typo in fixture and fail for correct reason ([1af5ba9](https://github.com/libp2p/js-libp2p/commit/1af5ba9))


### Features

* enable peer discovery modules by default ([e320854](https://github.com/libp2p/js-libp2p/commit/e320854))



<a name="0.21.0"></a>
# [0.21.0](https://github.com/libp2p/js-libp2p/compare/v0.20.4...v0.21.0) (2018-06-28)


### Bug Fixes

* lock wrtc to 0.1.1 ([6507379](https://github.com/libp2p/js-libp2p/commit/6507379))


### Features

* (BREAKING CHANGE) overhaul libp2p config and constructor ([6905f1b](https://github.com/libp2p/js-libp2p/commit/6905f1b))
* set and hook up libp2p-connection-manager ([#184](https://github.com/libp2p/js-libp2p/issues/184)) ([d597204](https://github.com/libp2p/js-libp2p/commit/d597204))



<a name="0.20.4"></a>
## [0.20.4](https://github.com/libp2p/js-libp2p/compare/v0.20.2...v0.20.4) (2018-04-30)



<a name="0.20.3"></a>
## [0.20.3](https://github.com/libp2p/js-libp2p/compare/v0.20.2...v0.20.3) (2018-04-30)



<a name="0.20.2"></a>
## [0.20.2](https://github.com/libp2p/js-libp2p/compare/v0.20.1...v0.20.2) (2018-04-10)



<a name="0.20.1"></a>
## [0.20.1](https://github.com/libp2p/js-libp2p/compare/v0.20.0...v0.20.1) (2018-04-10)



<a name="0.20.0"></a>
# [0.20.0](https://github.com/libp2p/js-libp2p/compare/v0.19.2...v0.20.0) (2018-04-06)


### Features

* use class-is for type checks ([bb0c990](https://github.com/libp2p/js-libp2p/commit/bb0c990))



<a name="0.19.2"></a>
## [0.19.2](https://github.com/libp2p/js-libp2p/compare/v0.19.0...v0.19.2) (2018-03-28)



<a name="0.19.1"></a>
## [0.19.1](https://github.com/libp2p/js-libp2p/compare/v0.19.0...v0.19.1) (2018-03-28)



<a name="0.19.0"></a>
# [0.19.0](https://github.com/libp2p/js-libp2p/compare/v0.18.0...v0.19.0) (2018-03-15)



<a name="0.18.0"></a>
# [0.18.0](https://github.com/libp2p/js-libp2p/compare/v0.17.0...v0.18.0) (2018-02-19)



<a name="0.17.0"></a>
# [0.17.0](https://github.com/libp2p/js-libp2p/compare/v0.16.5...v0.17.0) (2018-02-16)


### Bug Fixes

* use correct reference to floodSub ([947eaf1](https://github.com/libp2p/js-libp2p/commit/947eaf1))


### Features

* add pubsub to libp2p ([0c543b7](https://github.com/libp2p/js-libp2p/commit/0c543b7))



<a name="0.16.5"></a>
## [0.16.5](https://github.com/libp2p/js-libp2p/compare/v0.16.4...v0.16.5) (2018-02-14)



<a name="0.16.4"></a>
## [0.16.4](https://github.com/libp2p/js-libp2p/compare/v0.16.3...v0.16.4) (2018-02-09)



<a name="0.16.3"></a>
## [0.16.3](https://github.com/libp2p/js-libp2p/compare/v0.16.2...v0.16.3) (2018-02-08)



<a name="0.16.2"></a>
## [0.16.2](https://github.com/libp2p/js-libp2p/compare/v0.16.1...v0.16.2) (2018-02-07)



<a name="0.16.1"></a>
## [0.16.1](https://github.com/libp2p/js-libp2p/compare/v0.16.0...v0.16.1) (2018-02-07)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/libp2p/js-libp2p/compare/v0.15.2...v0.16.0) (2018-02-07)


### Features

* add explicit error for case peer id not included in multiaddr ([#155](https://github.com/libp2p/js-libp2p/issues/155)) ([bd8a35a](https://github.com/libp2p/js-libp2p/commit/bd8a35a))
* dialProtocol and small refactor ([6651401](https://github.com/libp2p/js-libp2p/commit/6651401))
* use libp2p-switch ([23e8293](https://github.com/libp2p/js-libp2p/commit/23e8293))



<a name="0.15.2"></a>
## [0.15.2](https://github.com/libp2p/js-libp2p/compare/v0.15.1...v0.15.2) (2018-01-28)



<a name="0.15.1"></a>
## [0.15.1](https://github.com/libp2p/js-libp2p/compare/v0.15.0...v0.15.1) (2018-01-16)


### Bug Fixes

* typo in DHT setup ([#151](https://github.com/libp2p/js-libp2p/issues/151)) ([61bebd1](https://github.com/libp2p/js-libp2p/commit/61bebd1))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p/compare/v0.14.3...v0.15.0) (2018-01-07)



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p/compare/v0.14.2...v0.14.3) (2017-12-15)



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p/compare/v0.14.1...v0.14.2) (2017-12-15)



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p/compare/v0.14.0...v0.14.1) (2017-12-15)


### Bug Fixes

* prevent "The libp2p node is not started yet" when stopping ([#138](https://github.com/libp2p/js-libp2p/issues/138)) ([c88eaf4](https://github.com/libp2p/js-libp2p/commit/c88eaf4))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p/compare/v0.13.3...v0.14.0) (2017-12-14)


### Bug Fixes

* remove innactive multiaddrs ([#131](https://github.com/libp2p/js-libp2p/issues/131)) ([1b7360f](https://github.com/libp2p/js-libp2p/commit/1b7360f))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/libp2p/js-libp2p/compare/v0.13.2...v0.13.3) (2017-12-01)



<a name="0.13.2"></a>
## [0.13.2](https://github.com/libp2p/js-libp2p/compare/v0.13.1...v0.13.2) (2017-11-27)


### Features

* Bring libp2p-websocket-star to the Transports family! 🌟 ([#122](https://github.com/libp2p/js-libp2p/issues/122)) ([95f029e](https://github.com/libp2p/js-libp2p/commit/95f029e))



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p/compare/v0.13.0...v0.13.1) (2017-11-12)



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p/compare/v0.12.4...v0.13.0) (2017-10-26)


### Features

* enable and test Circuit Relay ([29cc0af](https://github.com/libp2p/js-libp2p/commit/29cc0af))



<a name="0.12.4"></a>
## [0.12.4](https://github.com/libp2p/js-libp2p/compare/v0.12.3...v0.12.4) (2017-09-07)



<a name="0.12.3"></a>
## [0.12.3](https://github.com/libp2p/js-libp2p/compare/v0.12.2...v0.12.3) (2017-09-07)



<a name="0.12.2"></a>
## [0.12.2](https://github.com/libp2p/js-libp2p/compare/v0.12.0...v0.12.2) (2017-09-07)



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p/compare/v0.12.0...v0.12.1) (2017-09-07)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p/compare/v0.11.0...v0.12.0) (2017-09-03)


### Features

* p2p addrs situation ([#119](https://github.com/libp2p/js-libp2p/issues/119)) ([cad173e](https://github.com/libp2p/js-libp2p/commit/cad173e))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p/compare/v0.10.2...v0.11.0) (2017-07-22)



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p/compare/v0.10.1...v0.10.2) (2017-07-21)


### Bug Fixes

* circle ci, thanks victor! ([4224c1f](https://github.com/libp2p/js-libp2p/commit/4224c1f))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p/compare/v0.10.0...v0.10.1) (2017-07-10)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p/compare/v0.9.1...v0.10.0) (2017-07-07)


### Bug Fixes

* added missing dep async ([45b0f61](https://github.com/libp2p/js-libp2p/commit/45b0f61))


### Features

* state events and query changes ([#100](https://github.com/libp2p/js-libp2p/issues/100)) ([73f2f6d](https://github.com/libp2p/js-libp2p/commit/73f2f6d))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p/compare/v0.9.0...v0.9.1) (2017-04-16)


### Bug Fixes

* do not use assert in async funcs ([#88](https://github.com/libp2p/js-libp2p/issues/88)) ([2e326e1](https://github.com/libp2p/js-libp2p/commit/2e326e1))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p/compare/v0.8.0...v0.9.0) (2017-04-06)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p/compare/v0.7.0...v0.8.0) (2017-03-31)


### Bug Fixes

* addition of ipfs id appendix must come before transport filtering ([291e79f](https://github.com/libp2p/js-libp2p/commit/291e79f))
* avoid deleting nodes from peerBook ([300936f](https://github.com/libp2p/js-libp2p/commit/300936f))
* correct method on peer-book ([031ecb3](https://github.com/libp2p/js-libp2p/commit/031ecb3))


### Features

* append peer id to multiaddr if not there ([59ea9c3](https://github.com/libp2p/js-libp2p/commit/59ea9c3))
* not remove peer from peerBook on disconnect ([a4b41b0](https://github.com/libp2p/js-libp2p/commit/a4b41b0))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p/compare/v0.6.2...v0.7.0) (2017-03-29)


### Features

* update events to conform with [#74](https://github.com/libp2p/js-libp2p/issues/74) ([f73c045](https://github.com/libp2p/js-libp2p/commit/f73c045))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p/compare/v0.6.1...v0.6.2) (2017-03-28)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p/compare/v0.6.0...v0.6.1) (2017-03-27)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p/compare/v0.5.5...v0.6.0) (2017-03-27)


### Bug Fixes

* last touches ([2c23d9a](https://github.com/libp2p/js-libp2p/commit/2c23d9a))


### Features

* new super simplified API ([a6623c1](https://github.com/libp2p/js-libp2p/commit/a6623c1))



<a name="0.5.5"></a>
## [0.5.5](https://github.com/libp2p/js-libp2p/compare/v0.5.4...v0.5.5) (2017-03-21)



