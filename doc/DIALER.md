# js-libp2p Dialer

**Synopsis**
* Parallel dials to the same peer will yield the same connection/error when the first dial settles.
* All Dial Requests in js-libp2p must request a token(s) from the Dialer.
  * The number of tokens requested should be between 1 and the MAX_PER_PEER_DIALS max set in the Dialer.
  * If the number of available tokens is less than requested, the Dialer may return less than requested.
* The number of tokens a DialRequest obtains reflects the maximum number of parallel Multiaddr Dials it can make.
* If no tokens are available a DialRequest should immediately end and throw.
* As tokens are limited, DialRequests should be given a prioritized list of Multiaddrs to minimize the potential request time.
* Once a Multiaddr Dial has succeeded, all pending dials in that Dial Request should be aborted.
* If DIAL_TIMEOUT time has elapsed before any one Multiaddr Dial succeeds, all remaining dials in the DialRequest should be aborted.
* When a Multiaddr Dial is settled, if there are no more addresses to dial, its token should be released back to the dialer.
* Once the DialRequest is settled, any remaining tokens should be released to the dialer.

## Multiaddr Confidence

An effective dialing system should involve the inclusion of a Confidence system for Multiaddrs. This enables ranking of Multiaddrs so that a prioritized list can be passed to DialRequests to maximize usage of Dialer Tokens, and minimize connection times.

**Not Yet Implemented**: This system will be designed and implemented in a future update.

## Notes

* A DialRequest gets a set of tokens from the Dialer, up to the MAX_PER_PEER_DIALS max.
* A DialRequest SHOULD fail if no dial tokens are available. The DialRequest MAY proceed without tokens, but this should be reserved for High Priority actions and should be rare.
* A DialRequest MUST NOT request more tokens than it has addresses to dial. Example: If the MAX_PER_PEER_DIALS is 4 and a DialRequest has 1 address, it should only request 1 token.
* A DialRequest SHOULD execute parallel dials for each of its addresses up the total number of tokens it has.
* On a successful dial, the DialRequest MUST abort any other in progress dials, return the successful connection and release all tokens.
* A new DialRequest SHOULD be given a descending list of prioritized Multiaddrs, based on their confidence. Having higher confidence Multiaddrs first can help minimize the time a DialRequest is active.
* A failed dial to a Multiaddr SHOULD add that Multiaddr to a temporary denyList.
* A failed dial to a Multiaddr SHOULD lower the confidence of that Multiaddr.
* A successful dial to a Multiaddr SHOULD increase the confidence of that Multiaddr.
