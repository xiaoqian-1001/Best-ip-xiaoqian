import { defineEventHandler, getQuery } from 'h3'
import * as net from 'net'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const ip = query.ip as string
  const port = parseInt(query.port as string, 10)

  if (!ip || !port) {
    return { alive: false, latency: 0 }
  }

  return new Promise((resolve) => {
    const socket = new net.Socket()
    const start = Date.now()
    socket.setTimeout(3000)
    socket.on('connect', () => {
      const latency = Date.now() - start
      socket.destroy()
      resolve({ alive: true, latency })
    })
    socket.on('error', () => {
      socket.destroy()
      resolve({ alive: false, latency: 0 })
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ alive: false, latency: 0 })
    })
    socket.connect(port, ip)
  })
})