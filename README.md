# Journey Funnel

A Next.js application for analyzing and optimizing user journey funnels with TypeScript support.

## Features

- TypeScript integration with strict type checking
- Centralized type system for consistent data modeling
- API routes for journey calculations and optimization
- Modern UI with Tailwind CSS
- ESLint configuration with TypeScript support

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/components` - React components
- `/pages` - Next.js pages and API routes
- `/styles` - Global styles and Tailwind CSS configuration
- `/types` - TypeScript type definitions
- `/public` - Static assets

## API Routes

- `/api/calculate` - Performs journey calculations
- `/api/optimize` - Optimizes journey parameters
- `/api/backsolve` - Backsolves journey metrics
- `/api/assessQuestion` - Assesses journey questions

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- ESLint
- PostCSS

## Environment Variables

For full functionality, the following environment variables are required:

### Required for Competitor Analysis
```bash
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

The competitor analysis feature requires a Firecrawl API key to scrape competitor websites. Without this key:
- The "Generate Optimized Content" feature will still work using industry best practices
- Competitor URL analysis will be unavailable
- Content generation will fall back to predefined patterns

To get a Firecrawl API key:
1. Visit [firecrawl.dev](https://firecrawl.dev)
2. Sign up for an account
3. Generate an API key from your dashboard
4. Add it to your `.env.local` file as `FIRECRAWL_API_KEY=your_key_here`

## Development

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000` (or the next available port).
