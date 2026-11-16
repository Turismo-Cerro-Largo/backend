import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        setupFiles: ['src/configuracion/db-node.ts'],
        include: ['tests/*.test.ts'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            './temp/**',
        ],
    },
})
