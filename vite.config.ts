import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const readEnvFile = (filePath: string) => {
    if (!fs.existsSync(filePath)) return {}

    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).reduce<Record<string, string>>((accumulator, line) => {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) return accumulator

      const equalsIndex = trimmedLine.indexOf('=')
      if (equalsIndex === -1) return accumulator

      const key = trimmedLine.slice(0, equalsIndex).trim()
      const value = trimmedLine.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '')

      if (key) accumulator[key] = value
      return accumulator
    }, {})
  }

  const envFilePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), `.env.${mode}`),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), `.env.${mode}.local`),
  ]

  const fileEnv = envFilePaths.reduce<Record<string, string>>((accumulator, filePath) => {
    return { ...accumulator, ...readEnvFile(filePath) }
  }, {})

  const overridePlaceholder = (key: string) => {
    const currentValue = process.env[key]
    const envValue = fileEnv[key]

    if (!envValue) return

    if (!currentValue || /^your_/i.test(currentValue) || /placeholder/i.test(currentValue)) {
      process.env[key] = envValue
    }
  }

  overridePlaceholder('VITE_SUPABASE_URL')
  overridePlaceholder('VITE_SUPABASE_ANON_KEY')
  overridePlaceholder('VITE_GROQ_API_KEY')
  overridePlaceholder('VITE_SOCKET_URL')

  return {
    plugins: [react(), tailwindcss()],
  }
})