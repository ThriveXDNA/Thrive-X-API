import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Check for required environment variable
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version
  maxNetworkRetries: 3, // Automatically retry requests that fail due to network issues
});

export default stripe;