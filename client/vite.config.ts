import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace with your repo name
const repo = 'avalon-voice-agent';

export default defineConfig({
  base: `/${repo}/`,
  plugins: [react()],
})
