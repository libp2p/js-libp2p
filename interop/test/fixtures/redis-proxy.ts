export async function redisProxy (commands: any[]): Promise<any> {
  const res = await fetch(`http://localhost:${process.env.REDIS_PROXY_PORT}`, {
    method: 'POST',
    body: JSON.stringify(commands)
  })

  if (!res.ok) {
    throw new Error('Redis command failed')
  }

  return res.json()
}
