# Journey Calculator

This repository contains a Next.js application for running the Lead-Gen Journey Calculator. 
It can be deployed on GitHub and Vercel (via Cursor).

## Structure

- `pages/index.js`: Frontend UI for inputting journey data and displaying results.
- `pages/api/calculate.js`: API route implementing the calculation logic.
- `public/`: Static assets (currently empty).
- `package.json`: Project dependencies and scripts.

## Deployment

### GitHub

1. Commit the code to a GitHub repository.
2. Push to your GitHub remote.

### Vercel via Cursor

1. Link your GitHub repository to Vercel.
2. Vercel will detect `Next.js` and automatically deploy.
3. Navigate to your Vercel dashboard to set environment variables if needed.

## Usage

1. Run locally:
   ```
   npm install
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. Paste JSON representing your journey into the input area and click **Run Simulation**.
