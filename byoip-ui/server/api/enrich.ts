import { defineEventHandler, readBody } from 'h3'

interface EnrichResult {
  ip: string
  as: string
  asOrg: string
  country: string
  countryCode: string
  region: string
  city: string
}

export default defineEventHandler(async (event) => {
  const ips = await readBody<{ ips: string[] }>(event)
  if (!ips?.ips?.length) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch('http://ip-api.com/batch?fields=query,as,country,countryCode,regionName,city', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips.ips),
      signal: controller.signal
    })
    const data = await res.json()
    return (data as any[]).map((item: any) => {
      let asn = ''
      let asOrg = ''
      if (item.as) {
        const parts = item.as.split(' ')
        asn = parts[0] || ''
        asOrg = parts.slice(1).join(' ') || ''
      }
      return {
        ip: item.query,
        as: asn,
        asOrg,
        country: item.country || '',
        countryCode: item.countryCode || '',
        region: item.regionName || '',
        city: item.city || ''
      } as EnrichResult
    })
  } finally {
    clearTimeout(timer)
  }
})