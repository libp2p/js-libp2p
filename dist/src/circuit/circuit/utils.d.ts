export type StreamHandler = import("./stream-handler");
export type CircuitStatus = 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400;
export type CircuitMessage = {
    type?: 4 | 1 | 2 | 3 | undefined;
    dstPeer?: import("../../types").CircuitPeer | undefined;
    srcPeer?: import("../../types").CircuitPeer | undefined;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
};
export type CircuitRequest = {
    type: import("../../types").CircuitType;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
/**
 * Validate incomming HOP/STOP message
 *
 * @param {CircuitRequest} msg - A CircuitRelay unencoded protobuf message
 * @param {StreamHandler} streamHandler
 */
export function validateAddrs(msg: CircuitRequest, streamHandler: StreamHandler): void;
//# sourceMappingURL=utils.d.ts.map