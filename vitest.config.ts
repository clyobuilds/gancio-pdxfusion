import { defineConfig } from 'vitest/config'
import { defineConfig as defineNitroConfig } from 'nitro-test-utils/config'

export default defineConfig({
  test: {
    reporters: ['tree'],
    pool: 'threads',
    fileParallelism: false,
    maxConcurrency: 1,
    hookTimeout: 30000,
    maxWorkers: 1,
    sequence: {
      concurrent: false,
      shuffle: false
    },
    projects: [
      {
        resolve: {
          alias: {
            '~~/server': './server/'
          }
        },
        test: {
          name: 'unit',
          include: ['tests/unit/*.{test,spec}.{ts,js}'],
          environment: 'node'
        }
      },
      defineNitroConfig({
        test: {
          hookTimeout: 30000,
          pool: 'threads',
          setupFiles: ['./vitest.setup.ts'],
          name: 'API',
          fileParallelism: false,
          maxWorkers: 1,
          maxConcurrency: 1,
          sequence: {
            concurrent: false,
            shuffle: false
          },
          include: ['tests/api/*.{test,spec}.{ts,js}']
        },
        nitro: {
          global: true
        }
      })
    ]
  }
})
