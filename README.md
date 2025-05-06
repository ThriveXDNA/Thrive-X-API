# Thrive X Fitness API

A comprehensive fitness and nutrition API that provides AI-powered content including workout plans, meal plans, exercise details, and more.

## Serverless Deployment Architecture

This API is designed to work with Vercel's serverless architecture, with the following structure:

- `api/` - Contains serverless function endpoints
  - `index.js` - Main API handler
  - `webhook.js` - Dedicated webhook handler for Stripe
  - `workout.js` - Dedicated endpoint for workout plans
  - `utils/` - Shared utilities
    - `database.js` - Supabase connection pooling

- `src/` - Original source code and controllers
  - `api/` - API controllers
  - `routes/` - Route definitions
  - `utils/` - Utility functions

## Features

- AI-powered workout plan generation
- Personalized meal planning
- Exercise details and instructions
- Natural remedies
- Food ingredient analysis
- Food plate analysis
- Subscription management with Stripe
- API key authentication
- Email verification

## Deployment to Vercel

### Prerequisites

1. A Vercel account
2. A Supabase project
3. A Stripe account
4. An Anthropic API key

### Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.example` file to `.env` for local development:
   ```
   cp .env.example .env
   ```
4. Fill in your environment variables in the `.env` file

### Local Development

Run the development server:

```
npm run dev
```

### Deploy to Vercel

1. **Install Vercel CLI** (optional but helpful for debugging):
   ```
   npm install -g vercel
   ```

2. **Configure Environment Variables in Vercel Dashboard**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to "Settings" > "Environment Variables"
   - Add all the environment variables from your `.env` file

3. **Deploy to Vercel**:
   ```
   vercel
   ```
   Or connect your GitHub repository for automatic deployments.

4. **Configure Stripe Webhooks**:
   - In your Stripe dashboard, add a webhook endpoint pointing to:
     ```
     https://your-vercel-domain.vercel.app/fitness/api/webhook
     ```

## Serverless Architecture Optimizations

This codebase has been optimized for Vercel's serverless architecture with the following improvements:

1. **Connection Pooling**: Supabase client is initialized once and reused across function invocations using a singleton pattern.

2. **Path-Based Routing**: The `vercel.json` configuration maps specific routes to dedicated serverless functions.

3. **Webhook Handling**: Webhook endpoints use raw body parsers to properly handle Stripe signatures.

4. **Memory and Duration Settings**: Serverless functions are configured with appropriate memory and timeout settings.

## Subscription Plans

- **Core**: $14.99/month or $149.90/year (500 requests/month)
- **Elite**: $49.99/month or $479.90/year (2000 requests/month)
- **Ultimate**: $129.99/month or $1169.90/year (5000 requests/month)

## API Endpoints

Base URL: `https://your-vercel-domain.vercel.app/fitness/api`

### Fitness Endpoints

- `POST /workout` - Generate personalized workout plans
- `POST /meal-plan` - Create customized meal plans
- `POST /exercise` - Get detailed exercise information
- `POST /natural-remedies` - Retrieve natural remedies for symptoms
- `POST /food-plate` - Analyze food plate composition
- `POST /food-ingredient` - Get detailed food ingredient information

### Authentication Endpoints

- `POST /auth/validate` - Validate API key
- `POST /check-email-verified` - Check if user's email is verified
- `POST /send-verification-code` - Send verification code to user's email
- `POST /verify-code` - Verify email with code
- `POST /resend-verification-code` - Resend verification code

### Subscription Endpoints

- `POST /create-checkout-session` - Create Stripe checkout session
- `GET /config` - Get API configuration (e.g., Stripe publishable key)

## Authentication

All API requests must include an API key in the headers:

```
X-API-Key: your_api_key
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (email not verified or subscription inactive)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Server Error
