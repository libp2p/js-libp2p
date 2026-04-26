export function parseStunUsernameUfrags (serverUfrag: string, clientUfrag: string): { serverUfrag: string, clientUfrag: string } | undefined {
  if (serverUfrag.length === 0 || clientUfrag.length === 0) {
    return undefined
  }

  return {
    serverUfrag,
    clientUfrag
  }
}
