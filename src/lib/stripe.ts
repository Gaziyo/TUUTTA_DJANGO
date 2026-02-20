import { loadStripe } from '@stripe/stripe-js';

// The publishable key should be in your .env file
// VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default stripePromise;
