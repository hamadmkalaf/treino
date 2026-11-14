// Gera os ícones PNG do PWA (halter estilizado) sem dependências externas.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BG = [11, 15, 20]
const FG = [180, 240, 74]

function crc32(buf) {
  let c
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  // retângulos do halter em coordenadas 0..1: [x0, y0, x1, y1]
  const rects = [
    [0.3, 0.46, 0.7, 0.54], // barra
    [0.2, 0.3, 0.3, 0.7], // anilha interna esq.
    [0.7, 0.3, 0.8, 0.7], // anilha interna dir.
    [0.13, 0.38, 0.2, 0.62], // anilha externa esq.
    [0.8, 0.38, 0.87, 0.62], // anilha externa dir.
  ]
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      const on = rects.some(([a, b, c, d]) => u >= a && u < c && v >= b && v < d)
      const [r, g, bl] = on ? FG : BG
      const i = row + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = bl
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
writeFileSync('public/apple-touch-icon.png', png(180))
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#0b0f14"/><g fill="#b4f04a"><rect x="30" y="46" width="40" height="8"/><rect x="20" y="30" width="10" height="40"/><rect x="70" y="30" width="10" height="40"/><rect x="13" y="38" width="7" height="24"/><rect x="80" y="38" width="7" height="24"/></g></svg>\n`,
)
console.log('ícones gerados em public/')
