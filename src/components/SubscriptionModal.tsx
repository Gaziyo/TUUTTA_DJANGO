import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Shield } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripePromise from '../lib/stripe';
import { useStore } from '../store';
import { logger } from '../lib/logger';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency?: string;
    features: string[];
    recommended?: boolean;
}

const PLANS: SubscriptionPlan[] = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Basic access to tutor', '5 file uploads per day', 'Standard response speed', 'Community support']
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 1999, // in cents
        currency: 'usd',
        features: ['Unlimited file uploads', 'Priority response speed', 'Advanced model access (GPT-4)', 'Voice mode', 'Email support'],
        recommended: true
    },
    {
        id: 'enterprise',
        name: 'Team',
        price: 4999, // in cents
        currency: 'usd',
        features: ['Everything in Pro', 'Team collaboration', 'Admin dashboard', 'Custom integrations', 'Dedicated account manager']
    }
];

const CheckoutForm = ({ plan, onSuccess, onError }: { plan: SubscriptionPlan, onSuccess: () => void, onError: (msg: string) => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL where the user is redirected after the payment.
                // For this modal flow, we might handle it without redirect if using 'if_required' or similar, 
                // but typically redirect is safer. For SPA, we can redirect to current URL with a query param.
                return_url: window.location.origin + '?payment_success=true',
            },
            redirect: 'if_required'
        });

        if (error) {
            setErrorMessage(error.message || 'An unexpected error occurred.');
            onError(error.message || 'Payment failed');
            setIsLoading(false);
        } else {
            // Payment successful!
            onSuccess();
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {errorMessage && (
                <div className="text-red-500 text-sm">{errorMessage}</div>
            )}
            <button
                type="submit"
                disabled={!stripe || isLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center justify-center transition-colors"
            >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency }).format(plan.price / 100)}`}
            </button>
        </form>
    );
};

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
    const { user } = useStore();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedPlan(null);
            setClientSecret(null);
            setIsSuccess(false);
            setLoadingPayment(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectPlan = async (planId: string) => {
        setSelectedPlan(planId);
        if (planId === 'free') return; // No payment needed

        const plan = PLANS.find(p => p.id === planId);
        if (!plan) return;

        setLoadingPayment(true);
        try {
            const response = await fetch('/.netlify/functions/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: plan.price,
                    currency: plan.currency,
                    planId: plan.id
                }),
            });

            const data = await response.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                console.error('Failed to init payment:', data.error);
                alert('Failed to initialize payment: ' + (data.error || 'Unknown error'));
                setSelectedPlan(null);
            }
        } catch (err: unknown) {
            console.error('Error fetching payment intent:', err);
            alert(err instanceof Error ? err.message : 'Payment initialization failed.');
            setSelectedPlan(null);
        } finally {
            setLoadingPayment(false);
        }
    };

    const handlePaymentSuccess = () => {
        setIsSuccess(true);
        // Update user subscription in store/backend
        // In a real app, this should be verified on backend via webhook
        if (selectedPlan && user) {
            // Mock update for immediate UI feedback
            logger.debug(`Upgrading user ${user.id} to ${selectedPlan}`);
            // Here we would call store action to update user profile
        }
        setTimeout(() => {
            onClose();
        }, 3000);
    };

    const handleClose = () => {
        onClose();
    };

    const selectedPlanData = PLANS.find(p => p.id === selectedPlan);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors z-10"
                >
                    <X className="h-6 w-6" />
                </button>

                {isSuccess ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Thank you for subscribing to the {selectedPlanData?.name} plan. Your account has been upgraded.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Plan Selection (Left Side if Checkout active, or Full Width) */}
                        <div className={`p-8 md:p-10 ${clientSecret ? 'hidden md:block md:w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}>
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upgrade Your Experience</h2>
                                <p className="text-gray-600 dark:text-gray-400">Choose the plan that best fits your learning journey.</p>
                            </div>

                            <div className={`grid gap-6 ${clientSecret ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
                                {PLANS.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedPlan === plan.id
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-gray-800'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                            } ${plan.id === 'free' && clientSecret ? 'hidden' : ''}`}
                                        onClick={() => !clientSecret && handleSelectPlan(plan.id)}
                                    >
                                        {plan.recommended && (
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                                Most Popular
                                            </div>
                                        )}
                                        <div className="text-center mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                            <div className="mt-2 flex items-baseline justify-center">
                                                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                                    {plan.price === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency || 'USD' }).format(plan.price / 100)}
                                                </span>
                                                {plan.price > 0 && <span className="text-gray-500 dark:text-gray-400 ml-1">/mo</span>}
                                            </div>
                                        </div>
                                        <ul className="space-y-3 mb-6">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                                                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {!clientSecret && (
                                            <button
                                                className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${plan.id === selectedPlan
                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                {plan.id === selectedPlan ? 'Selected' : 'Select Plan'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Section - Only shown when client secret exists */}
                        {clientSecret && selectedPlanData && (
                            <div className="w-full md:w-1/2 p-8 md:p-10 bg-gray-50 dark:bg-gray-900 overflow-y-auto max-h-[90vh]">
                                <div className="mb-8">
                                    <button
                                        onClick={() => {
                                            setClientSecret(null);
                                            setSelectedPlan(null);
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center mb-4"
                                    >
                                        ← Back to plans
                                    </button>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Payment</h3>
                                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{selectedPlanData.name} Plan</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Detailed billing</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 dark:text-white">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedPlanData.currency || 'USD' }).format(selectedPlanData.price / 100)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                                        </div>
                                    </div>
                                </div>

                                {stripePromise ? (
                                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' /* can be night/flat */ } }}>
                                        <CheckoutForm
                                            plan={selectedPlanData}
                                            onSuccess={handlePaymentSuccess}
                                            onError={(msg) => logger.debug(msg)}
                                        />
                                    </Elements>
                                ) : (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                        Stripe is not configured. Set `VITE_STRIPE_PUBLISHABLE_KEY` to enable payments.
                                    </div>
                                )}

                                <div className="mt-6 flex items-center justify-center text-xs text-gray-400 space-x-2">
                                    <Shield className="h-4 w-4" />
                                    <span>Payments secured by Stripe</span>
                                </div>
                            </div>
                        )}

                        {/* Loading Overlay */}
                        {loadingPayment && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-20">
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">Preparing checkout...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionModal;
