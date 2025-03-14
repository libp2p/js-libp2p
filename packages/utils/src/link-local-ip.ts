export function isLinkLocalIp (ip: string): boolean {
  if (ip.startsWith('169.254.')) {
    return true
  }

  if (ip.toLowerCase().startsWith('fe80')) {
    return true
  }

  return false
}
