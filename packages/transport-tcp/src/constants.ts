// p2p multi-address code
export const CODE_P2P = 421
export const CODE_CIRCUIT = 290
export const CODE_UNIX = 400

// Time to wait for a connection to close gracefully before destroying it manually
export const CLOSE_TIMEOUT = 500

// Close the socket if there is no activity after this long in ms
export const SOCKET_TIMEOUT = 2 * 60000 // 2 mins
