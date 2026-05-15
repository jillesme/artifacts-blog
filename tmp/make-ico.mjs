// Pack multiple PNGs into a single multi-resolution .ico file.
// The ICO format permits PNG-encoded entries (since Vista) so this just
// concatenates the PNG bytes with a directory header.

import fs from 'node:fs'
import path from 'node:path'

const inputs = [
  { size: 16, file: 'tmp/favicons/fav-16.png' },
  { size: 32, file: 'tmp/favicons/fav-32.png' },
  { size: 48, file: 'tmp/favicons/fav-48.png' },
  { size: 64, file: 'tmp/favicons/fav-64.png' },
]
const outPath = 'public/favicon.ico'

const images = inputs.map(({ size, file }) => ({
  size,
  data: fs.readFileSync(file),
}))

// ICONDIR header (6 bytes)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: 1 = ICO
header.writeUInt16LE(images.length, 4)

// ICONDIRENTRY for each image (16 bytes each)
const entrySize = 16
const dirSize = images.length * entrySize
let offset = header.length + dirSize

const entries = []
for (const img of images) {
  const entry = Buffer.alloc(entrySize)
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 0) // width (0 = 256)
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 1) // height
  entry.writeUInt8(0, 2)                              // palette
  entry.writeUInt8(0, 3)                              // reserved
  entry.writeUInt16LE(1, 4)                           // color planes
  entry.writeUInt16LE(32, 6)                          // bpp
  entry.writeUInt32LE(img.data.length, 8)             // image size
  entry.writeUInt32LE(offset, 12)                     // offset
  entries.push(entry)
  offset += img.data.length
}

const out = Buffer.concat([header, ...entries, ...images.map(i => i.data)])
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log(`Wrote ${outPath} (${out.length} bytes, ${images.length} sizes)`)
