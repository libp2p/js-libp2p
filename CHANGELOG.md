<a name="0.14.4"></a>
## [0.14.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.3...v0.14.4) (2019-01-14)



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.2...v0.14.3) (2019-01-04)



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.1...v0.14.2) (2019-01-04)



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.0...v0.14.1) (2018-12-11)


### Bug Fixes

* typo get many option ([#63](https://github.com/libp2p/js-libp2p-kad-dht/issues/63)) ([de5a9fb](https://github.com/libp2p/js-libp2p-kad-dht/commit/de5a9fb))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.13.0...v0.14.0) (2018-12-11)


### Chores

* update options timeout property ([#62](https://github.com/libp2p/js-libp2p-kad-dht/issues/62)) ([3046b54](https://github.com/libp2p/js-libp2p-kad-dht/commit/3046b54))


### BREAKING CHANGES

* get, getMany, findProviders and findPeer do not accept a timeout number anymore. It must be a property of an object options.

Co-Authored-By: vasco-santos <vasco.santos@ua.pt>



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.12.1...v0.13.0) (2018-12-05)


### Bug Fixes

* make 'find peer query' test reliable ([#58](https://github.com/libp2p/js-libp2p-kad-dht/issues/58)) ([54336dd](https://github.com/libp2p/js-libp2p-kad-dht/commit/54336dd))


### Features

* run queries on disjoint paths ([#37](https://github.com/libp2p/js-libp2p-kad-dht/issues/37)) ([#39](https://github.com/libp2p/js-libp2p-kad-dht/issues/39)) ([742b3fb](https://github.com/libp2p/js-libp2p-kad-dht/commit/742b3fb))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.12.0...v0.12.1) (2018-11-30)


### Features

* allow configurable validators and selectors ([#57](https://github.com/libp2p/js-libp2p-kad-dht/issues/57)) ([b731a1d](https://github.com/libp2p/js-libp2p-kad-dht/commit/b731a1d))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.11.1...v0.12.0) (2018-11-22)



<a name="0.11.1"></a>
## [0.11.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.11.0...v0.11.1) (2018-11-12)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.6...v0.11.0) (2018-11-09)


### Bug Fixes

* record outdated local correction ([#49](https://github.com/libp2p/js-libp2p-kad-dht/issues/49)) ([d1869ed](https://github.com/libp2p/js-libp2p-kad-dht/commit/d1869ed))


### Features

* select first record when no selector function ([#51](https://github.com/libp2p/js-libp2p-kad-dht/issues/51)) ([683a903](https://github.com/libp2p/js-libp2p-kad-dht/commit/683a903))



<a name="0.10.6"></a>
## [0.10.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.5...v0.10.6) (2018-10-25)



<a name="0.10.5"></a>
## [0.10.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.4...v0.10.5) (2018-10-01)


### Features

* start random walk and allow configuration for disabling ([#42](https://github.com/libp2p/js-libp2p-kad-dht/issues/42)) ([abe9407](https://github.com/libp2p/js-libp2p-kad-dht/commit/abe9407))



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.3...v0.10.4) (2018-09-27)


### Bug Fixes

* find peer and providers options ([#45](https://github.com/libp2p/js-libp2p-kad-dht/issues/45)) ([bba7500](https://github.com/libp2p/js-libp2p-kad-dht/commit/bba7500))



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.2...v0.10.3) (2018-09-20)


### Bug Fixes

* dht get options ([#40](https://github.com/libp2p/js-libp2p-kad-dht/issues/40)) ([0a2f9fe](https://github.com/libp2p/js-libp2p-kad-dht/commit/0a2f9fe))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.0...v0.10.2) (2018-08-29)


### Bug Fixes

* dont read when just doing a write ([7a92139](https://github.com/libp2p/js-libp2p-kad-dht/commit/7a92139))
* make findProviders treat timeout the same as findPeer ([#35](https://github.com/libp2p/js-libp2p-kad-dht/issues/35)) ([fcdb01d](https://github.com/libp2p/js-libp2p-kad-dht/commit/fcdb01d))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.0...v0.10.1) (2018-07-13)


### Bug Fixes

* dont read when just doing a write ([7a92139](https://github.com/libp2p/js-libp2p-kad-dht/commit/7a92139))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.9.0...v0.10.0) (2018-04-05)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.8.0...v0.9.0) (2018-03-15)


### Features

* upgrade the discovery service to random-walk ([b8e0f72](https://github.com/libp2p/js-libp2p-kad-dht/commit/b8e0f72))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.7.0...v0.8.0) (2018-02-07)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.0...v0.7.0) (2018-02-07)


### Bug Fixes

* release providers resources ([#23](https://github.com/libp2p/js-libp2p-kad-dht/issues/23)) ([ff87f4b](https://github.com/libp2p/js-libp2p-kad-dht/commit/ff87f4b))


### Features

* use libp2p-switch ([054e5e5](https://github.com/libp2p/js-libp2p-kad-dht/commit/054e5e5))



<a name="0.6.3"></a>
## [0.6.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.2...v0.6.3) (2018-01-30)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.1...v0.6.2) (2018-01-30)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.0...v0.6.1) (2018-01-30)


### Bug Fixes

* release providers resources ([#23](https://github.com/libp2p/js-libp2p-kad-dht/issues/23)) ([ff87f4b](https://github.com/libp2p/js-libp2p-kad-dht/commit/ff87f4b))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.5.1...v0.6.0) (2017-11-09)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.5.0...v0.5.1) (2017-09-07)


### Features

* replace protocol-buffers with protons ([#16](https://github.com/libp2p/js-libp2p-kad-dht/issues/16)) ([de259ff](https://github.com/libp2p/js-libp2p-kad-dht/commit/de259ff))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.4.1...v0.5.0) (2017-09-03)


### Features

* p2p addrs situation ([#15](https://github.com/libp2p/js-libp2p-kad-dht/issues/15)) ([3870dd2](https://github.com/libp2p/js-libp2p-kad-dht/commit/3870dd2))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.4.0...v0.4.1) (2017-07-22)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.3.0...v0.4.0) (2017-07-22)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.2.1...v0.3.0) (2017-07-17)


### Bug Fixes

* no more circular dependency, become a good block of libp2p ([#13](https://github.com/libp2p/js-libp2p-kad-dht/issues/13)) ([810be4d](https://github.com/libp2p/js-libp2p-kad-dht/commit/810be4d))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.2.0...v0.2.1) (2017-07-13)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.1.0...v0.2.0) (2017-07-07)


### Features

* using libp2p new state methods ([#12](https://github.com/libp2p/js-libp2p-kad-dht/issues/12)) ([982f789](https://github.com/libp2p/js-libp2p-kad-dht/commit/982f789))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/4bd1fbc...v0.1.0) (2017-04-07)


### Features

* v0.1.0 ([4bd1fbc](https://github.com/libp2p/js-libp2p-kad-dht/commit/4bd1fbc))



