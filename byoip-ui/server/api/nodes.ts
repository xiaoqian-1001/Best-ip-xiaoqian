import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const url = 'https://raw.githubusercontent.com/yu-929/Selected-by-Monte-Carlo/refs/heads/main/good.txt'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const text = await res.text()
    return text.trim().split('\n').map(line => {
      const [addr, rest] = line.split('#')
      const [ip, port] = addr.split(':')
      const [region, speedStr] = rest.split(' ')
      const speed = parseFloat(speedStr)
      return { ip, port, region, speed, full: `${ip}:${port}` }
    })
  } finally {
    clearTimeout(timer)
  }
})