export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    description:
      'Your AI wedding secretary answers the questions guests ask most. Venue, dress code, parking, registry. One number, instant replies, so you do not have to.',
    features: [
      'Dedicated wedding phone number',
      'AI auto-replies for routine questions',
      '6 pre-built FAQ templates',
      'Guest inbox dashboard',
      'Up to 200 guest messages per month',
    ],
    highlighted: false,
  },
  {
    id: 'essential',
    name: 'Essential',
    price: 49,
    priceId: process.env.STRIPE_ESSENTIAL_PRICE_ID!,
    description:
      'Everything in Starter plus your secretary handles sensitive messages with care. WedFlow drafts replies in your voice for you to review before sending.',
    features: [
      'Everything in Starter',
      'Escalation with AI drafted replies',
      'Unlimited custom FAQs',
      'Partner dashboard access',
      'Email notifications for escalations',
      'Unlimited guest messages',
    ],
    highlighted: true,
  },
  {
    id: 'concierge',
    name: 'Concierge',
    price: 79,
    priceId: process.env.STRIPE_CONCIERGE_PRICE_ID!,
    description:
      'The full white-glove experience. Everything in Essential plus a dedicated setup call, priority support, and early access to new features.',
    features: [
      'Everything in Essential',
      'Full guest phone number visibility',
      'Dedicated setup call',
      'Priority support',
      'Early access to new features',
      'Custom tone fine-tuning',
    ],
    highlighted: false,
  },
] as const
