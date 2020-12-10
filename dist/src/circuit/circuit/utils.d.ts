export type StreamHandler = import("./stream-handler")<any>;
export type CircuitStatus = 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400;
/**
 * Validate incomming HOP/STOP message
 *
 * @param {*} msg - A CircuitRelay unencoded protobuf message
 * @param {StreamHandler} streamHandler
 */
export function validateAddrs(msg: any, streamHandler: import("./stream-handler")<any>): void;
//# sourceMappingURL=utils.d.ts.map