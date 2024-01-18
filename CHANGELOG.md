# Changelog

## 1.0.0 (2024-01-18)


### ⚠ BREAKING CHANGES

* Legacy RSA operations are now in @libp2p/rsa, streaming AES-CTR ciphers are in @libp2p/aes-ctr
* the `kadDHT` function returns a single DHT - see the readme for how to configure amino/lan as before
* requires libp2p v1
* remove unnecessary async from crypto methods ([#1963](https://github.com/libp2p/js-libp2p/issues/1963))
* the `minSendBytes` option has been removed from Mplex since the transport can now decide how to optimise sending data
* removed EventEmitter re-export - please use TypedEventEmitter instead
* remove per-peer parallel dialling ([#2090](https://github.com/libp2p/js-libp2p/issues/2090)) (#2251)
* the `perfService` export is now just `perf`
* imports from `libp2p/fetch` should be updated to `@libp2p/fetch`
* imports from `libp2p/circuit-relay` should be updated to `@libp2p/circuit-relay-v2`
* imports from `libp2p/plaintext` should be changed to `@libp2p/plaintext`
* imports from `libp2p/dcutr` now need to be from `@libp2p/dcutr`
* imports from `libp2p/identify` need to change to `@libp2p/identify`
* imports from `libp2p/ping` must be updated to `@libp2p/ping`
* imports from `libp2p/upnp-nat` should be updated to `@libp2p/upnp-nat`
* update release config ([#2195](https://github.com/libp2p/js-libp2p/issues/2195))
* the `isStarted` method has been removed from the `Startable` interface
* the `.protocols` property has been removed from the `PeerInfo` interface
* move autonat into separate package ([#2107](https://github.com/libp2p/js-libp2p/issues/2107))
* remove libp2p.keychain ([#2084](https://github.com/libp2p/js-libp2p/issues/2084))
* remove min/max from topologies ([#2158](https://github.com/libp2p/js-libp2p/issues/2158))
* remove dialler language ([#2143](https://github.com/libp2p/js-libp2p/issues/2143))
* `measurePerformance` now returns an async generator that yields `PerfOutput`s and no longer accepts the `startTime` parameter
* the addStream and removeStream methods have been removed from the connection interface
* the `.close`, `closeRead` and `closeWrite` methods on the `Stream` interface are now asynchronous
* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules ([#1833](https://github.com/libp2p/js-libp2p/issues/1833))

### Features

* **@libp2p/protocol-perf:** Implement perf protocol ([#1604](https://github.com/libp2p/js-libp2p/issues/1604)) ([3345f28](https://github.com/libp2p/js-libp2p/commit/3345f28b3b13fbe6b4e333466488e9d0bc677322))
* add `negotiateFully` option when opening streams ([#2331](https://github.com/libp2p/js-libp2p/issues/2331)) ([5d1f68e](https://github.com/libp2p/js-libp2p/commit/5d1f68e9257820c34aec07cf5c94b8f71ed8a69e))
* add component logger ([#2198](https://github.com/libp2p/js-libp2p/issues/2198)) ([fb8a6f1](https://github.com/libp2p/js-libp2p/commit/fb8a6f1887e71852217355f65c2b22566dd26749)), closes [#2105](https://github.com/libp2p/js-libp2p/issues/2105)
* add mock stream pair ([#2069](https://github.com/libp2p/js-libp2p/issues/2069)) ([e3ab192](https://github.com/libp2p/js-libp2p/commit/e3ab1929b505df6d50b5a6ddc50cd2669f54b894))
* add node.js/electron support for webrtc transport ([#1905](https://github.com/libp2p/js-libp2p/issues/1905)) ([72e81dc](https://github.com/libp2p/js-libp2p/commit/72e81dc1ab66fe0bbcafe3261ec20e2a28aaad5f))
* add private key to libp2p components ([#2348](https://github.com/libp2p/js-libp2p/issues/2348)) ([092861e](https://github.com/libp2p/js-libp2p/commit/092861e23271921b3cef2e673f6f0c9b0c3ab325))
* add tracked list to utils ([#2338](https://github.com/libp2p/js-libp2p/issues/2338)) ([581574d](https://github.com/libp2p/js-libp2p/commit/581574d6d6d94e2d44530f1c959fd1fcededf095))
* add versions of peer lists/sets/maps that report their sizes ([#2300](https://github.com/libp2p/js-libp2p/issues/2300)) ([57944fa](https://github.com/libp2p/js-libp2p/commit/57944fa494c1f7df4bb07d1cc58c5f7e95229bc2))
* allow joining jobs in peer queues ([#2316](https://github.com/libp2p/js-libp2p/issues/2316)) ([9eff7ef](https://github.com/libp2p/js-libp2p/commit/9eff7eff0ea6f54bc6c24a8bc4736ba0e2807c8b))
* allow stream muxers and connection encrypters to yield lists ([#2256](https://github.com/libp2p/js-libp2p/issues/2256)) ([4a474d5](https://github.com/libp2p/js-libp2p/commit/4a474d54d3299e0ac30fa143b57436b3cf45e426))
* collect dial/listen metrics in webrtc and webtransport ([#2061](https://github.com/libp2p/js-libp2p/issues/2061)) ([6cb80f7](https://github.com/libp2p/js-libp2p/commit/6cb80f7d3b308aff955f4de247680a3c9c26993b))
* enable manual identify ([#1784](https://github.com/libp2p/js-libp2p/issues/1784)) ([06f4901](https://github.com/libp2p/js-libp2p/commit/06f4901a367ef8e6b9f74bc9b896cdb091c31b12))
* **libp2p:** add autodial retry threshold config option ([#1943](https://github.com/libp2p/js-libp2p/issues/1943)) ([4ef9c79](https://github.com/libp2p/js-libp2p/commit/4ef9c79cd1705f25170467d9268b89ba18d7e2a0))
* **libp2p:** direct connection through relay protocol (DCUtR) ([#1928](https://github.com/libp2p/js-libp2p/issues/1928)) ([87dc7e9](https://github.com/libp2p/js-libp2p/commit/87dc7e9fc17becc4b5c3ce4f3febd28cf9f25c6e))
* mark connections with limits as transient ([#1890](https://github.com/libp2p/js-libp2p/issues/1890)) ([a1ec46b](https://github.com/libp2p/js-libp2p/commit/a1ec46b5f5606b7bdf3e5b085013fb88e26439f9))
* measure transfer perf over time ([#2067](https://github.com/libp2p/js-libp2p/issues/2067)) ([78db573](https://github.com/libp2p/js-libp2p/commit/78db573f9e8f28cd3d0a89f36094f5d566482b9f))
* merge stat properties into stream/connection objects ([#1856](https://github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://github.com/libp2p/js-libp2p/issues/1849)
* support streaming hashes for key sign/verify ([#2255](https://github.com/libp2p/js-libp2p/issues/2255)) ([ac7bc38](https://github.com/libp2p/js-libp2p/commit/ac7bc3839ae3d8253e9141c52be2c7c0c66a1d60))
* use single DHT only by default ([#2322](https://github.com/libp2p/js-libp2p/issues/2322)) ([c003789](https://github.com/libp2p/js-libp2p/commit/c00378909453ee58080aa4d30ba1f4794cff581b))


### Bug Fixes

* **@libp2p/crypto:** improve unsupported key type message ([#2051](https://github.com/libp2p/js-libp2p/issues/2051)) ([d9159dd](https://github.com/libp2p/js-libp2p/commit/d9159dd5985241160f791acda164bb2e6408dd90))
* **@libp2p/interface-compliance-tests:** add aegir to deps ([#1983](https://github.com/libp2p/js-libp2p/issues/1983)) ([8977862](https://github.com/libp2p/js-libp2p/commit/89778624908a536e3253ee4fe1a0d287e1aad2e9)), closes [#1974](https://github.com/libp2p/js-libp2p/issues/1974)
* **@libp2p/kad-dht:** update timeout ref type ([02b8932](https://github.com/libp2p/js-libp2p/commit/02b89323130f6d70a0f804f7f1a6adba81ea4d0a))
* **@libp2p/mdns:** do not send TXT records that are too long ([#2014](https://github.com/libp2p/js-libp2p/issues/2014)) ([4f19234](https://github.com/libp2p/js-libp2p/commit/4f19234ecd7701795543715dbadf537f5c2f1ccb)), closes [#2012](https://github.com/libp2p/js-libp2p/issues/2012)
* **@libp2p/protocol-perf:** ensure only client calls measure performance ([#1960](https://github.com/libp2p/js-libp2p/issues/1960)) ([8716555](https://github.com/libp2p/js-libp2p/commit/871655515cc89af3eacad855db475d3f1ada2005))
* **@libp2p/protocol-perf:** use noise for encryption ([#1992](https://github.com/libp2p/js-libp2p/issues/1992)) ([24c1c24](https://github.com/libp2p/js-libp2p/commit/24c1c2489cd58397c4691d382d6260d56791dbce)), closes [#1991](https://github.com/libp2p/js-libp2p/issues/1991)
* **@libp2p/utils:** switch to @chainsafe/is-ip ([#1957](https://github.com/libp2p/js-libp2p/issues/1957)) ([18567b7](https://github.com/libp2p/js-libp2p/commit/18567b7cfcca605b2d586cef9275554099959bc8)), closes [#1926](https://github.com/libp2p/js-libp2p/issues/1926)
* **@libp2p/webrtc:** close data-channel on muxer stream end ([#1976](https://github.com/libp2p/js-libp2p/issues/1976)) ([7517082](https://github.com/libp2p/js-libp2p/commit/7517082d0ae5dcd8f3f2d13aee2a13067836a2be))
* **@libp2p/webrtc:** set max message size in alignment with spec ([#2050](https://github.com/libp2p/js-libp2p/issues/2050)) ([122f1e6](https://github.com/libp2p/js-libp2p/commit/122f1e67d4c0aa8c4c8f50aa24a0c0dbe00411fa))
* **@libp2p/webrtc:** update stream logger name to webrtc ([#2035](https://github.com/libp2p/js-libp2p/issues/2035)) ([0d228f9](https://github.com/libp2p/js-libp2p/commit/0d228f9f078b65fd5aa48ec644946e5c74ed2741))
* **@libp2p/webrtc:** use correct udp port in remote address ([#2055](https://github.com/libp2p/js-libp2p/issues/2055)) ([0ce318e](https://github.com/libp2p/js-libp2p/commit/0ce318ecea222dc01776a3534d96351675ba9e0d))
* **@libp2p/webrtc:** use stream logger instead of global logger ([#2042](https://github.com/libp2p/js-libp2p/issues/2042)) ([88c47f5](https://github.com/libp2p/js-libp2p/commit/88c47f51f9d67a6261e4ac65c494cd1e6e4ed8dd))
* **@libp2p/websockets:** do not throw error event ([#1950](https://github.com/libp2p/js-libp2p/issues/1950)) ([a1fbb7e](https://github.com/libp2p/js-libp2p/commit/a1fbb7e2a4d4ad26cbdae3db8cb4b8398e8dd010))
* **@libp2p/webtransport:** be more thorough about closing sessions ([#1969](https://github.com/libp2p/js-libp2p/issues/1969)) ([90e793e](https://github.com/libp2p/js-libp2p/commit/90e793eb2ec2c18bbca9416df92d824b5ebbccb4)), closes [#1896](https://github.com/libp2p/js-libp2p/issues/1896)
* **@libp2p/webtransport:** handle dialing circuit addresses ([#2054](https://github.com/libp2p/js-libp2p/issues/2054)) ([20d5f22](https://github.com/libp2p/js-libp2p/commit/20d5f2200ee2a538a923f9e1df517c2bffad9105))
* **@libp2p/webtransport:** maximum call stack size exceeded on abort ([#1947](https://github.com/libp2p/js-libp2p/issues/1947)) ([5e85154](https://github.com/libp2p/js-libp2p/commit/5e85154b2953867e77e31a4fb823b20cb0620092))
* **@libp2p/webtransport:** remove custom WebTransport types ([#2022](https://github.com/libp2p/js-libp2p/issues/2022)) ([0634e3b](https://github.com/libp2p/js-libp2p/commit/0634e3b704e98892bd55dfd1506963d31ad4fd0b))
* **@libp2p/webtransport:** remove filters export ([#2018](https://github.com/libp2p/js-libp2p/issues/2018)) ([3282563](https://github.com/libp2p/js-libp2p/commit/328256339b1539bb048f41cd22542234b2b7a44f))
* add events bus to pubsub compliance tests ([#1824](https://github.com/libp2p/js-libp2p/issues/1824)) ([883082c](https://github.com/libp2p/js-libp2p/commit/883082ca284b346cd5c232236356773d97b78d8b))
* add missing events dep to fix browser bundlers ([#2134](https://github.com/libp2p/js-libp2p/issues/2134)) ([f670307](https://github.com/libp2p/js-libp2p/commit/f670307a90fe6665f10630823dd7058aab2a1c2f)), closes [#2110](https://github.com/libp2p/js-libp2p/issues/2110)
* add pubsub and floodsub to manifests ([a4a10fd](https://github.com/libp2p/js-libp2p/commit/a4a10fd4451ffc7d00f5bad28d3607c67b8805d7))
* add pubsub interfaces to @libp2p/interface ([#1857](https://github.com/libp2p/js-libp2p/issues/1857)) ([2e561fe](https://github.com/libp2p/js-libp2p/commit/2e561fe9d2d3a4e7c38bd0bf4baf41978c4d9438))
* add status property ([#2269](https://github.com/libp2p/js-libp2p/issues/2269)) ([a32e70b](https://github.com/libp2p/js-libp2p/commit/a32e70bac126a0746dff9f7c87a4d6211a00fa7a))
* align dependency versions and update project config ([#2357](https://github.com/libp2p/js-libp2p/issues/2357)) ([8bbd436](https://github.com/libp2p/js-libp2p/commit/8bbd43628343f995804eea3102d0571ddcebc5c4))
* allow DHT self-query to time out ([#2169](https://github.com/libp2p/js-libp2p/issues/2169)) ([ce0e38d](https://github.com/libp2p/js-libp2p/commit/ce0e38d28240303f7afc7f37de441b067e3e855e))
* allow dialing a peer when we only have transient connections ([#2187](https://github.com/libp2p/js-libp2p/issues/2187)) ([dd400cd](https://github.com/libp2p/js-libp2p/commit/dd400cd57bd4943469af1ffc67b235a46c2b206c))
* allow keys to do sync sign/verify ([#2258](https://github.com/libp2p/js-libp2p/issues/2258)) ([dd7d17c](https://github.com/libp2p/js-libp2p/commit/dd7d17cc478dfcba02211a47789439b7d7ab9627))
* allow mss lazy select on read ([#2246](https://github.com/libp2p/js-libp2p/issues/2246)) ([d8f5bc2](https://github.com/libp2p/js-libp2p/commit/d8f5bc211185a963c2a5182d58d73629457bc78d))
* allow no transports in config ([#2293](https://github.com/libp2p/js-libp2p/issues/2293)) ([16588d2](https://github.com/libp2p/js-libp2p/commit/16588d27c8ca9c52686146160234534ee3dac915))
* allow specifiying maxOutboundStreams in connection.newStream ([#1817](https://github.com/libp2p/js-libp2p/issues/1817)) ([b348fba](https://github.com/libp2p/js-libp2p/commit/b348fbaa7e16fd40f9a93e83a92c8152ad9e97e9))
* append peer id to connection remote addr if not present ([#2182](https://github.com/libp2p/js-libp2p/issues/2182)) ([3bdaad3](https://github.com/libp2p/js-libp2p/commit/3bdaad3956cb015af1657f3f23061b47463953da))
* append peer id to dial addresses before filtering ([#2199](https://github.com/libp2p/js-libp2p/issues/2199)) ([bafccd6](https://github.com/libp2p/js-libp2p/commit/bafccd6b8e90c2cf1c616aeeb5001ade940c523a))
* **circuit-relay:** respect applyDefaultLimit when it is false ([#2139](https://github.com/libp2p/js-libp2p/issues/2139)) ([df2153e](https://github.com/libp2p/js-libp2p/commit/df2153e268a72edd00c7663ce9d196d5547e994d))
* close early WebRTC streams properly ([#2200](https://github.com/libp2p/js-libp2p/issues/2200)) ([f4fac96](https://github.com/libp2p/js-libp2p/commit/f4fac961ccf60fe2c08799f6c55bbc0012d1779f))
* close maconn stream after reading/writing ([#2236](https://github.com/libp2p/js-libp2p/issues/2236)) ([9c67c5b](https://github.com/libp2p/js-libp2p/commit/9c67c5b3d0ab63c7a1a62f363ae732b300ef6b87))
* close streams gracefully ([#1864](https://github.com/libp2p/js-libp2p/issues/1864)) ([b36ec7f](https://github.com/libp2p/js-libp2p/commit/b36ec7f24e477af21cec31effc086a6c611bf271)), closes [#1793](https://github.com/libp2p/js-libp2p/issues/1793) [#656](https://github.com/libp2p/js-libp2p/issues/656)
* close webrtc streams without data loss ([#2073](https://github.com/libp2p/js-libp2p/issues/2073)) ([7d8b155](https://github.com/libp2p/js-libp2p/commit/7d8b15517a480e01a8ebd427ab0093509b78d5b0))
* consolidate interface modules ([#1833](https://github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))
* copy monorepo packages to multidim docker image ([#1842](https://github.com/libp2p/js-libp2p/issues/1842)) ([327e5cb](https://github.com/libp2p/js-libp2p/commit/327e5cbd26328cc3d4c118298ca57099b2634df4))
* crash during DHT query abort when reading is slow ([#2225](https://github.com/libp2p/js-libp2p/issues/2225)) ([c960eb6](https://github.com/libp2p/js-libp2p/commit/c960eb659d2deff0c29cb2f5fe2a506310b8f971)), closes [#2216](https://github.com/libp2p/js-libp2p/issues/2216)
* **crypto:** limit RSA key size to &lt;= 8192 bits ([#1931](https://github.com/libp2p/js-libp2p/issues/1931)) ([58421e1](https://github.com/libp2p/js-libp2p/commit/58421e112e7217b36dea27e995f5cfe804387187))
* datachannel label should be an empty string ([#2204](https://github.com/libp2p/js-libp2p/issues/2204)) ([dfbe0cc](https://github.com/libp2p/js-libp2p/commit/dfbe0cc05be428f3c1de36e10d28e3d1777e8f04))
* delay notification of early WebRTC stream creation ([#2206](https://github.com/libp2p/js-libp2p/issues/2206)) ([d25d951](https://github.com/libp2p/js-libp2p/commit/d25d95104ee4eb353ed73cc0c7200e5a9d5b18d2))
* dial relay when we are dialed via it but have no reservation ([#2252](https://github.com/libp2p/js-libp2p/issues/2252)) ([d729d66](https://github.com/libp2p/js-libp2p/commit/d729d66a54a272dfe11eda8836a555a187cc9c39))
* disable Nagle's algorithm by default ([#2242](https://github.com/libp2p/js-libp2p/issues/2242)) ([13a870c](https://github.com/libp2p/js-libp2p/commit/13a870cbef326a3a3b3c55b886c2109feaa2b628))
* do not allow autodial to run in parallel ([#1804](https://github.com/libp2p/js-libp2p/issues/1804)) ([775f892](https://github.com/libp2p/js-libp2p/commit/775f89283a08683c1b46811af3c1974f53abd30d))
* do not find peer when DHT yields peers without multiaddrs ([#2344](https://github.com/libp2p/js-libp2p/issues/2344)) ([d011f61](https://github.com/libp2p/js-libp2p/commit/d011f61304433a647431163592e7a0171010bc2a))
* do not overwrite addresses on identify push when none are sent ([#2192](https://github.com/libp2p/js-libp2p/issues/2192)) ([025c082](https://github.com/libp2p/js-libp2p/commit/025c082a4d3d08904f1f5b0209ed6f40648fb78d))
* do not overwrite signal property of options ([#2214](https://github.com/libp2p/js-libp2p/issues/2214)) ([70d5efc](https://github.com/libp2p/js-libp2p/commit/70d5efc2e901a2c419fe3f82d767f278b6d698fd))
* do not send duplicate close read/write ([#1935](https://github.com/libp2p/js-libp2p/issues/1935)) ([446fff8](https://github.com/libp2p/js-libp2p/commit/446fff878477c771634578f0a8e84737aad3d4d3))
* do not wait for stream reads and writes at the same time ([#2290](https://github.com/libp2p/js-libp2p/issues/2290)) ([10ea197](https://github.com/libp2p/js-libp2p/commit/10ea19700ae0c464734c88eb5922e2faeb27446a))
* ensure all listeners are properly closed on tcp shutdown ([#2058](https://github.com/libp2p/js-libp2p/issues/2058)) ([b57bca4](https://github.com/libp2p/js-libp2p/commit/b57bca4493e1634108fe187466024e374b76c114))
* ensure dht query is aborted on early exit ([#2341](https://github.com/libp2p/js-libp2p/issues/2341)) ([388d02b](https://github.com/libp2p/js-libp2p/commit/388d02b3366ed2d9918102e6119bdf4bf133886e))
* ensure mock stream output is uint8arraylist ([#2209](https://github.com/libp2p/js-libp2p/issues/2209)) ([8b82e68](https://github.com/libp2p/js-libp2p/commit/8b82e68e8f897f3e295ee511f1bbcbfd4cd9c652))
* export DHT record class ([#2168](https://github.com/libp2p/js-libp2p/issues/2168)) ([2f6a239](https://github.com/libp2p/js-libp2p/commit/2f6a2397f7e8ec7cf2edda7c9996be263a423661))
* export version from libp2p ([#2279](https://github.com/libp2p/js-libp2p/issues/2279)) ([8c169db](https://github.com/libp2p/js-libp2p/commit/8c169db1bcc923fa2edd3749e6669eb69d93f6b3))
* expose config for max inbound/outbound stop streams ([#1812](https://github.com/libp2p/js-libp2p/issues/1812)) ([0828dd9](https://github.com/libp2p/js-libp2p/commit/0828dd9167d0d1bd6218c7554fb9239f6fb0c19d))
* graceful close of optimistic selection with early data ([#2318](https://github.com/libp2p/js-libp2p/issues/2318)) ([a7c6a93](https://github.com/libp2p/js-libp2p/commit/a7c6a93c6717a073bd8677a714565c91515290f2))
* ignore peers with invalid multiaddrs ([#1902](https://github.com/libp2p/js-libp2p/issues/1902)) ([a41d25d](https://github.com/libp2p/js-libp2p/commit/a41d25d49696febd7fd903bbdcc95ebaeb5d4b35))
* include peer id in autodial log message ([#2075](https://github.com/libp2p/js-libp2p/issues/2075)) ([368ee26](https://github.com/libp2p/js-libp2p/commit/368ee26dbea5de8fb67d9a4596a169f327e73145))
* **libp2p:** emit peer:discovered event on internal event bus ([#2019](https://github.com/libp2p/js-libp2p/issues/2019)) ([a6be8f0](https://github.com/libp2p/js-libp2p/commit/a6be8f0f4bbd81826c2ca5d48ea6175b1fdf3ab9))
* **libp2p:** filter out dnsaddrs for different peers ([#1954](https://github.com/libp2p/js-libp2p/issues/1954)) ([a31b420](https://github.com/libp2p/js-libp2p/commit/a31b420f1920533d92e0aec4ddedcf323957bd44))
* **libp2p:** move delay dep to production dependencies ([#1977](https://github.com/libp2p/js-libp2p/issues/1977)) ([725f5df](https://github.com/libp2p/js-libp2p/commit/725f5df1782a200cf1d12e6d03a164d028a7cc3e))
* **libp2p:** only dial one address at a time for peers ([#2028](https://github.com/libp2p/js-libp2p/issues/2028)) ([73b87c5](https://github.com/libp2p/js-libp2p/commit/73b87c5a1474f9acd47989b675724ea64d02c7b9))
* **libp2p:** reduce dialer activity in browsers ([#1970](https://github.com/libp2p/js-libp2p/issues/1970)) ([d30f09f](https://github.com/libp2p/js-libp2p/commit/d30f09f29bcf34a0f1d7c7c984dad6dc34bb669a))
* **libp2p:** sort addresses to dial as public, then relay ([#2031](https://github.com/libp2p/js-libp2p/issues/2031)) ([5294f14](https://github.com/libp2p/js-libp2p/commit/5294f14caa314bb150554afff3a7ff45d2bf17ba))
* **libp2p:** update circuit relay and upgrader logs ([#2071](https://github.com/libp2p/js-libp2p/issues/2071)) ([f09ac4a](https://github.com/libp2p/js-libp2p/commit/f09ac4a7704070fd92bae8d4482d06eac45ddd2c))
* **libp2p:** update peer store with supported protocols after unhandle ([#2013](https://github.com/libp2p/js-libp2p/issues/2013)) ([63041af](https://github.com/libp2p/js-libp2p/commit/63041afefbefd246ee1d6d6a4958b1999076dc17))
* log peer data in identify correctly ([#2197](https://github.com/libp2p/js-libp2p/issues/2197)) ([fdcb801](https://github.com/libp2p/js-libp2p/commit/fdcb801ee3180b740a25e0e05a75c32dd8e4ef63))
* log upgrade messages on connection ([#2281](https://github.com/libp2p/js-libp2p/issues/2281)) ([f537b37](https://github.com/libp2p/js-libp2p/commit/f537b37316c78d26939e9c8d04bcf67599992554))
* log websocket error on graceful close failure ([#2072](https://github.com/libp2p/js-libp2p/issues/2072)) ([72319fe](https://github.com/libp2p/js-libp2p/commit/72319fe6d3b6402a92788c4c4e52eb7e0e477b3d))
* make initiator webrtc address dialable ([#2189](https://github.com/libp2p/js-libp2p/issues/2189)) ([051154d](https://github.com/libp2p/js-libp2p/commit/051154dd2d8ffadba4f8678f12341e5a4441dc66))
* make mss check logger before use ([#2261](https://github.com/libp2p/js-libp2p/issues/2261)) ([#2274](https://github.com/libp2p/js-libp2p/issues/2274)) ([cf96369](https://github.com/libp2p/js-libp2p/commit/cf963694f0253cc32ef805980c5be3397a41fae2))
* make peerid optional in peerid.equals ([#2335](https://github.com/libp2p/js-libp2p/issues/2335)) ([f1c1167](https://github.com/libp2p/js-libp2p/commit/f1c116746ab82b15b93a7875ed1b05861b8c0d32))
* make transports optional ([#2295](https://github.com/libp2p/js-libp2p/issues/2295)) ([887c6ff](https://github.com/libp2p/js-libp2p/commit/887c6ffe1b38bc9f0219b861b36d71de59095a8e))
* mark all packages side-effect free ([#2360](https://github.com/libp2p/js-libp2p/issues/2360)) ([3c96210](https://github.com/libp2p/js-libp2p/commit/3c96210cf6343b21199996918bae3a0f60220046))
* only send ip/domain observed address in identify ([#2201](https://github.com/libp2p/js-libp2p/issues/2201)) ([40855f4](https://github.com/libp2p/js-libp2p/commit/40855f4f38bf5e56ccb2890699ec0cdd60596a27))
* opt-in to toplogy notifications on transient connections ([#2049](https://github.com/libp2p/js-libp2p/issues/2049)) ([346ff5a](https://github.com/libp2p/js-libp2p/commit/346ff5a2b81bded9f9b26051501ab9d25246961c))
* perform find peer during dial if peer has no multiaddrs ([#2345](https://github.com/libp2p/js-libp2p/issues/2345)) ([444d837](https://github.com/libp2p/js-libp2p/commit/444d83751fa5137c76d0a265544bb3522da24a3c))
* query for circuit relays after start ([#2309](https://github.com/libp2p/js-libp2p/issues/2309)) ([dc56856](https://github.com/libp2p/js-libp2p/commit/dc56856f3d1d7603c3b0cc79afea7eef36a323c9))
* query routing for RSA public key ([#2350](https://github.com/libp2p/js-libp2p/issues/2350)) ([ee7ffe9](https://github.com/libp2p/js-libp2p/commit/ee7ffe9b9209d1ef0ffbd71389216b69e832b126))
* react native adjustments ([#2229](https://github.com/libp2p/js-libp2p/issues/2229)) ([3415811](https://github.com/libp2p/js-libp2p/commit/341581166fd5bd2ead6b9d9db1ffda84051b6262))
* release majors of modules that had patches during v1.0 ([#2286](https://github.com/libp2p/js-libp2p/issues/2286)) ([738dd40](https://github.com/libp2p/js-libp2p/commit/738dd40f1e1b8ed1b83693763cc91c218ec2b41b))
* remove dialler language ([#2143](https://github.com/libp2p/js-libp2p/issues/2143)) ([a321f15](https://github.com/libp2p/js-libp2p/commit/a321f15329ba9b8e6a84a5a7429784edf7fa96e9))
* remove duplicate autodial from startup ([#2289](https://github.com/libp2p/js-libp2p/issues/2289)) ([bcfa159](https://github.com/libp2p/js-libp2p/commit/bcfa15993fd533c56c7523384e4b135c4930855b))
* remove event emitter type from interfaces ([#2196](https://github.com/libp2p/js-libp2p/issues/2196)) ([f3ec538](https://github.com/libp2p/js-libp2p/commit/f3ec538451afe105a5a4513d66832965ad63debe))
* remove extra deps ([#2340](https://github.com/libp2p/js-libp2p/issues/2340)) ([53e83ee](https://github.com/libp2p/js-libp2p/commit/53e83eea50410391ec9cff4cd8097210b93894ff))
* remove min/max from topologies ([#2158](https://github.com/libp2p/js-libp2p/issues/2158)) ([511359a](https://github.com/libp2p/js-libp2p/commit/511359a86235e7abe65887dce7262b34a53bad5a))
* remove node-forge dependency from @libp2p/crypto ([#2355](https://github.com/libp2p/js-libp2p/issues/2355)) ([856ccd7](https://github.com/libp2p/js-libp2p/commit/856ccd7082a42ad0c33486e9b6885452aa886c64))
* remove protocols from PeerInfo ([#2166](https://github.com/libp2p/js-libp2p/issues/2166)) ([5468cd1](https://github.com/libp2p/js-libp2p/commit/5468cd13a76281e46b221fdbd7d4005c0d3f2252))
* remove redundant nat-api override ([#1906](https://github.com/libp2p/js-libp2p/issues/1906)) ([1f7e18b](https://github.com/libp2p/js-libp2p/commit/1f7e18b07094046f10df89a1c6eab505d4c13225))
* remove relay:removed event listener after relay is removed ([#1998](https://github.com/libp2p/js-libp2p/issues/1998)) ([ab2c1f6](https://github.com/libp2p/js-libp2p/commit/ab2c1f6731ccfe21a39482bdab217a8abd3f027b))
* remove results map on job queue clear ([#2320](https://github.com/libp2p/js-libp2p/issues/2320)) ([230afea](https://github.com/libp2p/js-libp2p/commit/230afea4b2919486bd8d61d9f0923a7761a6d2a0))
* remove stream add/remove methods from connection interface ([e26848b](https://github.com/libp2p/js-libp2p/commit/e26848b06e77bfcff4063139c9ed816f37f05cb6)), closes [#1855](https://github.com/libp2p/js-libp2p/issues/1855)
* rename event emitter class ([#2173](https://github.com/libp2p/js-libp2p/issues/2173)) ([50f912c](https://github.com/libp2p/js-libp2p/commit/50f912c2608caecc09acbcb0f46b4df4af073080))
* replace p-queue with less restrictive queue ([#2339](https://github.com/libp2p/js-libp2p/issues/2339)) ([528d737](https://github.com/libp2p/js-libp2p/commit/528d73781f416ea97af044bb49d9701f97c9eeec))
* replace rate-limiter ([#2356](https://github.com/libp2p/js-libp2p/issues/2356)) ([ddaa59a](https://github.com/libp2p/js-libp2p/commit/ddaa59a600c031fe1f41ba2097ebfcfd74eff598))
* reset dial queue shut down controller on node restart ([#2329](https://github.com/libp2p/js-libp2p/issues/2329)) ([cd8cafc](https://github.com/libp2p/js-libp2p/commit/cd8cafcd5c6aa141aba855a4de4c12336c429913)), closes [#2188](https://github.com/libp2p/js-libp2p/issues/2188)
* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))
* revert "refactor: rename event emitter class" ([#2172](https://github.com/libp2p/js-libp2p/issues/2172)) ([0ef5f7f](https://github.com/libp2p/js-libp2p/commit/0ef5f7f62d9c6d822e0a4b99cc203a1516b11f2f))
* set libp2p status to started before stopping ([#2288](https://github.com/libp2p/js-libp2p/issues/2288)) ([09dd029](https://github.com/libp2p/js-libp2p/commit/09dd02987d84770547f7dfd347fa09a0a98d3081))
* **transports:** filter circuit addresses ([#2060](https://github.com/libp2p/js-libp2p/issues/2060)) ([972b10a](https://github.com/libp2p/js-libp2p/commit/972b10a967653f60666a061bddfa46c0decfcc70))
* update interface internal and release as v1 ([#2282](https://github.com/libp2p/js-libp2p/issues/2282)) ([e7167fe](https://github.com/libp2p/js-libp2p/commit/e7167fe522973bd752e4524168f49092f4974ca0))
* update log messages ([#2324](https://github.com/libp2p/js-libp2p/issues/2324)) ([984f13e](https://github.com/libp2p/js-libp2p/commit/984f13e4223e724a358d8cc9134cbba435b08512))
* update max message size SDP attribute ([#1909](https://github.com/libp2p/js-libp2p/issues/1909)) ([e6a41f7](https://github.com/libp2p/js-libp2p/commit/e6a41f7e9b8c06babfdec9852f0e5355d3405fd0))
* update package config ([#1919](https://github.com/libp2p/js-libp2p/issues/1919)) ([8d49602](https://github.com/libp2p/js-libp2p/commit/8d49602fb6f0c906f1920d397ff28705bb0bc845))
* update project config ([9c0353c](https://github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))
* update websockets tests ([#2337](https://github.com/libp2p/js-libp2p/issues/2337)) ([28587d2](https://github.com/libp2p/js-libp2p/commit/28587d24f41f8342d9db30d83e6010def55d4268))
* updated multiaddr logging ([#1797](https://github.com/libp2p/js-libp2p/issues/1797)) ([f427cfc](https://github.com/libp2p/js-libp2p/commit/f427cfc923a4bf9fd328386897a0e7181969c854))
* use logging component everywhere ([#2228](https://github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))
* use node-datachannel WebRTC polyfill ([#2306](https://github.com/libp2p/js-libp2p/issues/2306)) ([ad6f70b](https://github.com/libp2p/js-libp2p/commit/ad6f70bf3cb354823380af95462a85654a0e6ab1))
* use optimistic protocol negotation ([#2253](https://github.com/libp2p/js-libp2p/issues/2253)) ([0b4a2ee](https://github.com/libp2p/js-libp2p/commit/0b4a2ee7983b4dc9dc0a7b705a202a4c550e7017))
* WebRTC transport unhandled promise rejection during connect ([#2299](https://github.com/libp2p/js-libp2p/issues/2299)) ([64a915a](https://github.com/libp2p/js-libp2p/commit/64a915ae97c7ac837147e3229dac793ea61666cc))
* WebRTC uncaught promise rejection on incoming connection ([#2302](https://github.com/libp2p/js-libp2p/issues/2302)) ([d105061](https://github.com/libp2p/js-libp2p/commit/d105061897b461789e0a8eef5094d9c136269952))


### Miscellaneous Chores

* update release config ([#2195](https://github.com/libp2p/js-libp2p/issues/2195)) ([ee2ed58](https://github.com/libp2p/js-libp2p/commit/ee2ed58507e57b43f643b42f4d8c3137d33184d5))


### Code Refactoring

* extract circuit relay v2 to separate module ([#2222](https://github.com/libp2p/js-libp2p/issues/2222)) ([24afba3](https://github.com/libp2p/js-libp2p/commit/24afba30004fb7f24af1f0180229bb164340f00b))
* extract DCUtR into separate module ([#2220](https://github.com/libp2p/js-libp2p/issues/2220)) ([d2c3e72](https://github.com/libp2p/js-libp2p/commit/d2c3e7235b64558c6cace414c54a42659fee2970))
* extract fetch to separate module ([#2223](https://github.com/libp2p/js-libp2p/issues/2223)) ([9b19be2](https://github.com/libp2p/js-libp2p/commit/9b19be2796c2dbbe207029199b1ac203647744e3))
* extract identify service into separate module ([#2219](https://github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* extract ping service into separate module ([#2218](https://github.com/libp2p/js-libp2p/issues/2218)) ([556282a](https://github.com/libp2p/js-libp2p/commit/556282afdc9b328fd58df1045dc7c792199be932))
* extract plaintext into separate module ([#2221](https://github.com/libp2p/js-libp2p/issues/2221)) ([a364d95](https://github.com/libp2p/js-libp2p/commit/a364d95bbd7b15a5ce6ce508321e7ff2fa40a5e5))
* extract UPnP NAT into separate module ([#2217](https://github.com/libp2p/js-libp2p/issues/2217)) ([f29b73f](https://github.com/libp2p/js-libp2p/commit/f29b73f781afcea36cba0589aafdd81e1852e194))
* move autonat into separate package ([#2107](https://github.com/libp2p/js-libp2p/issues/2107)) ([b0e8f06](https://github.com/libp2p/js-libp2p/commit/b0e8f06f0dcdbda0e367186b093e42e8bff3ee27))
* remove isStarted method from Startable ([#2145](https://github.com/libp2p/js-libp2p/issues/2145)) ([fca208f](https://github.com/libp2p/js-libp2p/commit/fca208f3763af041aa37b1cb915d2bc777acb96d))
* remove libp2p.keychain ([#2084](https://github.com/libp2p/js-libp2p/issues/2084)) ([125c84b](https://github.com/libp2p/js-libp2p/commit/125c84bb8a30ac986fb5aed0a4de23bc806d3aea))
* remove per-peer parallel dialling ([#2090](https://github.com/libp2p/js-libp2p/issues/2090)) ([#2251](https://github.com/libp2p/js-libp2p/issues/2251)) ([bb6ceb1](https://github.com/libp2p/js-libp2p/commit/bb6ceb19252de2c1441ef736127d13763837d644))
* remove unnecessary async from crypto methods ([#1963](https://github.com/libp2p/js-libp2p/issues/1963)) ([e2267d4](https://github.com/libp2p/js-libp2p/commit/e2267d437eeda3d964c77874ec757768d838981a))
* rename perf exports to remove Service ([#2227](https://github.com/libp2p/js-libp2p/issues/2227)) ([1034416](https://github.com/libp2p/js-libp2p/commit/10344168fe5f56c08a21d6b35468817e17ab0b25))
