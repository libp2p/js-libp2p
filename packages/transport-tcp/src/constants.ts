// Time to wait for a connection to close gracefully before destroying it manually
export const CLOSE_TIMEOUT = 500

// Close the socket if there is no activity after this long in ms
export const SOCKET_TIMEOUT = 2 * 60_000 // 2 mins
