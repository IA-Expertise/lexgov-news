# LexGov News

A Next.js 14 news application migrated from Vercel to Replit.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## Project Structure

```
src/
  app/          # Next.js App Router pages and API routes
  components/   # Shared React components
  config/       # App configuration
  lib/          # Utility functions and helpers
  mocks/        # Mock data
```

## Running the App

The dev server runs on port 5000 via the "Start application" workflow.

- **Dev**: `npm run dev` (port 5000)
- **Build**: `npm run build`
- **Start (prod)**: `npm run start` (port 5000)

## Replit Configuration

- Node.js 20 runtime
- Port 5000 bound to 0.0.0.0 for Replit's preview proxy
- Workflow: "Start application" → `npm run dev`
