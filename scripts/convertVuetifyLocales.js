// convert-locales.mjs
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inputDir = path.resolve(__dirname, '../node_modules/vuetify/lib/locale')
const outputDir = path.resolve(__dirname, '../i18n/locales/vuetify')

const files = await fs.readdir(inputDir)

await fs.mkdir(outputDir, { recursive: true })

for (const file of files) {
  console.error(file)
  if (!file.endsWith('.js') || file === 'index.js') continue

  const filePath = path.join(inputDir, file)
  const { default: locale } = await import(`file://${filePath}`)

  const outPath = path.join(outputDir, file.replace('.js', '.json'))
  await fs.writeFile(outPath, JSON.stringify(locale, null, 2), 'utf-8')
  console.log(`✔ Converted ${file} → ${path.basename(outPath)}`)
}
