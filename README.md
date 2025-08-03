# AI Trading Bot Frontend

This is the frontend for the AI-powered trading bot application. It provides a user interface for:

- User registration and login
- Starting and stopping trading bots
- Viewing live trading logs via WebSocket
- Running backtests
- (Optional) Saving encrypted API keys

## Live Deployment

Deployed on Vercel:  
https://your-vercel-project.vercel.app

## Technology Stack

- React (via Vite)
- Axios (API requests)
- WebSocket (real-time logs)
- React Router (optional if routing is implemented)

## Getting Started (Local)

1. Clone the repository:

   git clone https://github.com/your-username/tradingbot-frontend.git

2. Install dependencies:

   npm install

3. create a .env file based on the example

   cp .env.example .env

4. update your .env

   VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_WS_URL=ws://localhost:8000

5. start deployment server

   npm run dev

6. Visit http://localhost:5173 in your browser.
