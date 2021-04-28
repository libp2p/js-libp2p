export function createBoxStream(nonce: Uint8Array, psk: Uint8Array): any;
export function createUnboxStream(nonce: Uint8Array, psk: Uint8Array): any;
export function decodeV1PSK(pskBuffer: Uint8Array): {
    tag?: string;
    codecName?: string;
    psk: Uint8Array;
};
//# sourceMappingURL=crypto.d.ts.map