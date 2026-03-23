'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type Plan = {
  id: string
  name: string
  price: number
  priceId: string
  description: string
  features: readonly string[]
  highlighted: boolean
}

type Props = {
  plans: readonly Plan[]
  currentPlan: string | null
}

export default function PricingClient({ plans, currentPlan }: Props) {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(priceId: string, planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Checkout failed')
      }
      router.push(data.url)
    } catch (err) {
      console.error('Checkout error:', err instanceof Error ? err.message : String(err))
      setLoading(null)
    }
  }

  return (
    <div
      className="min-h-screen py-20 px-4"
      style={{ backgroundColor: '#FDFBF7' }}
    >
      {/* Nav */}
      <div className="max-w-5xl mx-auto mb-16">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <Image
            src="/ClassicLogo.png"
            alt="Wedflow"
            width={40}
            height={40}
            style={{ height: '40px', width: 'auto' }}
            priority
          />
          <span
            style={{
              color: '#1C3B2B',
              fontFamily: 'var(--newsreader), Georgia, serif',
              fontSize: '1.25rem',
              fontWeight: 600,
            }}
          >
            Wedflow
          </span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ color: '#1C3B2B' }}
          >
            Simple, transparent pricing
          </h1>
          <Link
            href="/"
            className="inline-block text-sm mb-4 hover:underline"
            style={{ color: '#1C3B2B' }}
          >
            ← Back to home
          </Link>
          <p className="text-lg" style={{ color: '#4a5568' }}>
            Pick the plan that fits your wedding. Cancel anytime.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className="text-sm font-medium"
              style={{ color: annual ? '#9ca3af' : '#1C3B2B' }}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual((v) => !v)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              style={{ backgroundColor: annual ? '#1C3B2B' : '#d1d5db' }}
              aria-label="Toggle annual billing"
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: annual ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: annual ? '#1C3B2B' : '#9ca3af' }}
            >
              Annual
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: '#C4714A', color: '#fff' }}
              >
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const displayPrice = annual
              ? Math.round(plan.price * 0.8)
              : plan.price

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-8 flex flex-col"
                style={{
                  backgroundColor: plan.highlighted ? '#1C3B2B' : '#fff',
                  border: plan.highlighted
                    ? '2px solid #1C3B2B'
                    : '1px solid #e5e7eb',
                  boxShadow: plan.highlighted
                    ? '0 20px 40px rgba(28,59,43,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span
                      className="rounded-full px-4 py-1 text-sm font-semibold"
                      style={{ backgroundColor: '#C4714A', color: '#fff' }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: plan.highlighted ? '#FDFBF7' : '#1C3B2B' }}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span
                      className="text-4xl font-bold"
                      style={{ color: plan.highlighted ? '#FDFBF7' : '#1C3B2B' }}
                    >
                      ${displayPrice}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: plan.highlighted ? '#a3c4a8' : '#9ca3af' }}
                    >
                      /mo
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: plan.highlighted ? '#c8deca' : '#6b7280' }}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        style={{ color: plan.highlighted ? '#C4714A' : '#1C3B2B' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className="text-sm"
                        style={{ color: plan.highlighted ? '#FDFBF7' : '#374151' }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div
                    className="w-full rounded-xl py-3 text-center text-sm font-semibold"
                    style={{
                      backgroundColor: plan.highlighted ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
                      color: plan.highlighted ? '#FDFBF7' : '#1C3B2B',
                    }}
                  >
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.priceId, plan.id)}
                    disabled={loading === plan.id}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                    style={
                      plan.highlighted
                        ? { backgroundColor: '#C4714A', color: '#fff' }
                        : { backgroundColor: '#1C3B2B', color: '#FDFBF7' }
                    }
                  >
                    {loading === plan.id ? 'Redirecting…' : 'Get started'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm mt-10" style={{ color: '#9ca3af' }}>
          All plans include a 7-day free trial. No card required to start.
        </p>
      </div>
    </div>
  )
}
