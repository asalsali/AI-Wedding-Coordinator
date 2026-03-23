'use client'

import { useState, useEffect, useTransition } from 'react'

const C = {
  forest: '#1C3B2B',
  cream: '#FDFBF7',
  terracotta: '#C4714A',
  text: '#1A1A1A',
}
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { ToneStyle } from '@/types'
import {
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  saveOnboardingStep5,
  saveOnboardingStep6,
  saveOnboardingStep7,
  getOnboardingData,
} from './actions'

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const TOTAL_STEPS = 7

const DEFAULT_FAQS: LocalFaq[] = [
  { question: 'What is the dress code?', answer: '' },
  { question: 'What time does the ceremony start?', answer: '' },
  { question: 'Where is the venue?', answer: '' },
  { question: 'Is there parking at the venue?', answer: '' },
  { question: 'Where are you registered?', answer: '' },
  { question: 'Is there a hotel block for guests?', answer: '' },
]

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface LocalFaq {
  question: string
  answer: string
}

interface FormData {
  yourName: string
  partnerName: string
  venueName: string
  venueAddress: string
  weddingDate: string
  ceremonyTime: string
  receptionTime: string
  parkingInfo: string
  dressCode: string
  registryLinks: string[]
  hotelBlock: string
  tone: ToneStyle | null
  vibeWord: string
  sampleMessage: string
  faqs: LocalFaq[]
}

const INITIAL_FORM: FormData = {
  yourName: '',
  partnerName: '',
  venueName: '',
  venueAddress: '',
  weddingDate: '',
  ceremonyTime: '',
  receptionTime: '',
  parkingInfo: '',
  dressCode: '',
  registryLinks: [''],
  hotelBlock: '',
  tone: null,
  vibeWord: '',
  sampleMessage: '',
  faqs: DEFAULT_FAQS,
}

// ----------------------------------------------------------------
// Readiness score calculation
// ----------------------------------------------------------------

interface ReadinessResult {
  score: number
  complete: string[]
  missing: string[]
}

function calculateReadiness(data: FormData): ReadinessResult {
  let score = 0
  const complete: string[] = []
  const missing: string[] = []

  // Core fields — 10 pts each (70 pts total)
  const core: [string, boolean][] = [
    ['Venue name', !!data.venueName.trim()],
    ['Venue address', !!data.venueAddress.trim()],
    ['Wedding date', !!data.weddingDate],
    ['Ceremony time', !!data.ceremonyTime],
    ['Dress code', !!data.dressCode.trim()],
    ['Tone style', !!data.tone],
    ['Sample message', !!data.sampleMessage.trim()],
  ]

  for (const [label, filled] of core) {
    if (filled) { score += 10; complete.push(label) }
    else missing.push(label)
  }

  // Optional fields — 5 pts each (25 pts total)
  const optional: [string, boolean][] = [
    ['Reception time', !!data.receptionTime],
    ['Parking info', !!data.parkingInfo.trim()],
    ['Registry link', data.registryLinks.some((l) => l.trim())],
    ['Hotel block info', !!data.hotelBlock.trim()],
    ['Vibe word', !!data.vibeWord.trim()],
  ]

  for (const [label, filled] of optional) {
    if (filled) { score += 5; complete.push(label) }
    else missing.push(label)
  }

  // FAQs — 5 pts for at least 3 answered
  const answeredFaqs = data.faqs.filter((f) => f.answer.trim()).length
  if (answeredFaqs >= 3) { score += 5; complete.push(`${answeredFaqs} FAQs answered`) }
  else missing.push('At least 3 FAQ answers')

  return { score, complete, missing }
}

// ----------------------------------------------------------------
// NavButtons — defined outside to avoid re-creation per render
// ----------------------------------------------------------------

interface NavButtonsProps {
  onBack?: () => void
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  isPending?: boolean
}

function NavButtons({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  isPending = false,
}: NavButtonsProps) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-stone-100">
      {onBack ? (
        <button
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
        >
          &larr; Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onContinue}
        disabled={continueDisabled || isPending}
        className="px-8 py-3 text-white text-sm font-medium rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        style={{ backgroundColor: C.forest }}
      >
        {isPending ? 'Saving\u2026' : continueLabel}
      </button>
    </div>
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  // Step 7 partner modal
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [partnerSaved, setPartnerSaved] = useState(false)

  // Step 7 number provisioning
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null)
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  // Load existing progress on mount (resume support)
  useEffect(() => {
    if (!isLoaded || !user) return
    getOnboardingData(user.id).then((existing) => {
      if (!existing) return
      setCoupleId(existing.coupleId)
      setFormData((prev) => ({
        ...prev,
        yourName: existing.yourName || prev.yourName,
        partnerName: existing.partnerName || prev.partnerName,
        ...(existing.profile && {
          venueName: existing.profile.venueName,
          venueAddress: existing.profile.venueAddress,
          weddingDate: existing.profile.weddingDate,
          ceremonyTime: existing.profile.ceremonyTime,
          receptionTime: existing.profile.receptionTime,
          parkingInfo: existing.profile.parkingInfo,
          dressCode: existing.profile.dressCode,
          registryLinks:
            existing.profile.registryLinks.length > 0
              ? existing.profile.registryLinks
              : [''],
          hotelBlock: existing.profile.hotelBlock,
          tone: existing.profile.tone,
          vibeWord: existing.profile.vibeWord,
          sampleMessage: existing.profile.sampleMessage,
        }),
        ...(existing.faqs.length > 0 && { faqs: existing.faqs }),
      }))
    })
  }, [isLoaded, user])

  // Trigger number provisioning when the couple reaches Step 7
  useEffect(() => {
    if (step !== 7 || !coupleId || provisionedNumber || provisionLoading) return
    setTimeout(() => {
      setProvisionLoading(true)
      setProvisionError(null)
    }, 0)
    fetch('/onboarding/provision-number', { method: 'POST' })
      .then((res) => res.json())
      .then((data: { phoneNumber?: string; error?: string }) => {
        if (data.phoneNumber) {
          setProvisionedNumber(data.phoneNumber)
        } else {
          setProvisionError(data.error ?? 'Failed to provision your number. Please contact support.')
        }
      })
      .catch(() => setProvisionError('Network error — please refresh and try again.'))
      .finally(() => setProvisionLoading(false))
  }, [step, coupleId, provisionedNumber, provisionLoading])

  const update = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const goBack = () => { setError(null); setStep((s) => s - 1) }
  const goNext = () => setStep((s) => s + 1)

  const withSave = (fn: () => Promise<void>) => {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      }
    })
  }

  // ---- Step handlers ----

  const handleStep1 = () => {
    if (!user) return
    withSave(async () => {
      const result = await saveOnboardingStep1({
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        yourName: formData.yourName,
        partnerName: formData.partnerName,
      })
      setCoupleId(result.coupleId)
      goNext()
    })
  }

  const handleStep2 = () => {
    if (!coupleId) return
    withSave(async () => {
      await saveOnboardingStep2({
        coupleId,
        venueName: formData.venueName,
        venueAddress: formData.venueAddress,
        weddingDate: formData.weddingDate,
        ceremonyTime: formData.ceremonyTime,
        receptionTime: formData.receptionTime,
        parkingInfo: formData.parkingInfo,
      })
      goNext()
    })
  }

  const handleStep3 = () => {
    if (!coupleId) return
    withSave(async () => {
      await saveOnboardingStep3({
        coupleId,
        dressCode: formData.dressCode,
        registryLinks: formData.registryLinks,
        hotelBlock: formData.hotelBlock,
      })
      goNext()
    })
  }

  const handleStep4 = () => {
    if (!coupleId) return
    withSave(async () => {
      await saveOnboardingStep4({
        coupleId,
        tone: formData.tone,
        vibeWord: formData.vibeWord,
        sampleMessage: formData.sampleMessage,
      })
      goNext()
    })
  }

  const handleStep5 = () => {
    if (!coupleId) return
    withSave(async () => {
      await saveOnboardingStep5({
        coupleId,
        faqs: formData.faqs.map((f, i) => ({ ...f, display_order: i })),
      })
      goNext()
    })
  }

  const handleStep6 = () => {
    if (!coupleId) return
    const { score } = calculateReadiness(formData)
    withSave(async () => {
      await saveOnboardingStep6({ coupleId, readinessScore: score })
      goNext()
    })
  }

  const handleStep7 = () => {
    if (!coupleId) return
    withSave(async () => {
      await saveOnboardingStep7({ coupleId, partnerEmail })
      router.push('/dashboard')
    })
  }

  // ---- Shared style tokens ----
  const inputClass =
    'w-full px-4 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C3B2B] text-stone-900 placeholder-stone-400 bg-white'
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1.5'
  const textareaClass = `${inputClass} resize-none`

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.cream }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${C.forest} transparent transparent transparent` }} />
      </div>
    )
  }

  // ----------------------------------------------------------------
  // Step renderers
  // ----------------------------------------------------------------

  const renderStep = (): React.ReactNode => {
    switch (step) {

      // ---- Step 1: Welcome ----
      case 1: {
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>
                Let&apos;s set up your wedding
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Tell us who&apos;s getting married first.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>Your name</label>
                <input
                  type="text"
                  value={formData.yourName}
                  onChange={(e) => update('yourName', e.target.value)}
                  placeholder="Your first &amp; last name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Partner&apos;s name</label>
                <input
                  type="text"
                  value={formData.partnerName}
                  onChange={(e) => update('partnerName', e.target.value)}
                  placeholder="Their first &amp; last name"
                  className={inputClass}
                />
              </div>
            </div>

            <NavButtons
              onContinue={handleStep1}
              continueDisabled={!formData.yourName.trim() || !formData.partnerName.trim()}
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 2: Wedding Details ----
      case 2: {
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>Wedding details</h1>
              <p className="mt-2 text-sm text-stone-500">
                Guests will ask about this — let&apos;s get it right.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>Venue name</label>
                <input
                  type="text"
                  value={formData.venueName}
                  onChange={(e) => update('venueName', e.target.value)}
                  placeholder="The Grand Ballroom"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Venue address</label>
                <input
                  type="text"
                  value={formData.venueAddress}
                  onChange={(e) => update('venueAddress', e.target.value)}
                  placeholder="123 Main St, City, State 00000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Wedding date</label>
                <input
                  type="date"
                  value={formData.weddingDate}
                  onChange={(e) => update('weddingDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ceremony time</label>
                  <input
                    type="time"
                    value={formData.ceremonyTime}
                    onChange={(e) => update('ceremonyTime', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Reception time</label>
                  <input
                    type="time"
                    value={formData.receptionTime}
                    onChange={(e) => update('receptionTime', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Parking info{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <textarea
                  value={formData.parkingInfo}
                  onChange={(e) => update('parkingInfo', e.target.value)}
                  placeholder="Free parking in the main lot. Street parking available on Oak Street."
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep2}
              continueDisabled={
                !formData.venueName.trim() ||
                !formData.venueAddress.trim() ||
                !formData.weddingDate ||
                !formData.ceremonyTime
              }
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 3: Guest Essentials ----
      case 3: {
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>Guest essentials</h1>
              <p className="mt-2 text-sm text-stone-500">
                The things guests ask most — before they even text.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Dress code</label>
                <input
                  type="text"
                  value={formData.dressCode}
                  onChange={(e) => update('dressCode', e.target.value)}
                  placeholder="Black tie optional"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Registry links{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <div className="space-y-2">
                  {formData.registryLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => {
                          const updated = [...formData.registryLinks]
                          updated[i] = e.target.value
                          update('registryLinks', updated)
                        }}
                        placeholder="https://www.registry.com/your-list"
                        className={inputClass}
                      />
                      {formData.registryLinks.length > 1 && (
                        <button
                          onClick={() =>
                            update(
                              'registryLinks',
                              formData.registryLinks.filter((_, j) => j !== i),
                            )
                          }
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-[#1C3B2B] transition-colors text-xl leading-none"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      update('registryLinks', [...formData.registryLinks, ''])
                    }
                    className="text-sm font-medium transition-colors" style={{ color: C.forest }}
                  >
                    + Add another link
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Hotel block{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <textarea
                  value={formData.hotelBlock}
                  onChange={(e) => update('hotelBlock', e.target.value)}
                  placeholder="We've reserved a block at The Marriott Downtown. Use code SMITH2026 for 20% off. Book by August 1."
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep3}
              continueDisabled={!formData.dressCode.trim()}
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 4: Tone & Personality ----
      case 4: {
        const toneOptions: Array<{
          value: ToneStyle
          label: string
          description: string
        }> = [
          {
            value: 'warm',
            label: 'Warm',
            description: 'Heartfelt & welcoming — like a warm hug',
          },
          {
            value: 'elegant',
            label: 'Elegant',
            description: 'Refined & graceful — sophisticated without being cold',
          },
          {
            value: 'playful',
            label: 'Playful',
            description: 'Fun & witty — the life of the party',
          },
        ]

        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>Tone &amp; personality</h1>
              <p className="mt-2 text-sm text-stone-500">
                Your AI coordinator will match your voice. Choose how it sounds.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Base tone</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {toneOptions.map(({ value, label, description }) => (
                    <button
                      key={value}
                      onClick={() => update('tone', value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.tone === value
                          ? 'border-[#1C3B2B] bg-[#1C3B2B]/10'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="text-sm font-semibold text-stone-900 mb-1">{label}</div>
                      <div className="text-xs text-stone-500 leading-relaxed">{description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  One vibe word{' '}
                  <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.vibeWord}
                  onChange={(e) => update('vibeWord', e.target.value)}
                  placeholder="e.g. joyful, classic, whimsical, intimate"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Sample message</label>
                <p className="text-xs text-stone-400 mb-2">
                  Paste a text you&apos;d send a friend so we can match your voice.
                </p>
                <textarea
                  value={formData.sampleMessage}
                  onChange={(e) => update('sampleMessage', e.target.value)}
                  placeholder="Hey! So excited you're coming. It's going to be such a fun night — let me know if you need anything!"
                  rows={4}
                  className={textareaClass}
                />
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep4}
              continueDisabled={!formData.tone || !formData.sampleMessage.trim()}
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 5: Custom FAQs ----
      case 5: {
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>Custom FAQs</h1>
              <p className="mt-2 text-sm text-stone-500">
                Fill in your answers — your AI will use these word for word.
              </p>
            </div>

            <div className="space-y-4">
              {formData.faqs.map((faq, i) => (
                <div key={i} className="p-4 border border-stone-200 rounded-xl bg-stone-50">
                  <div className="flex items-start gap-2 mb-3">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...formData.faqs]
                        updated[i] = { ...updated[i], question: e.target.value }
                        update('faqs', updated)
                      }}
                      placeholder="Question"
                      className={`${inputClass} flex-1`}
                    />
                    {i >= DEFAULT_FAQS.length && (
                      <button
                        onClick={() =>
                          update(
                            'faqs',
                            formData.faqs.filter((_, j) => j !== i),
                          )
                        }
                        className="mt-0.5 flex-shrink-0 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-[#1C3B2B] transition-colors text-xl leading-none"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => {
                      const updated = [...formData.faqs]
                      updated[i] = { ...updated[i], answer: e.target.value }
                      update('faqs', updated)
                    }}
                    placeholder="Your answer…"
                    rows={2}
                    className={`${textareaClass} bg-white`}
                  />
                </div>
              ))}

              <button
                onClick={() =>
                  update('faqs', [...formData.faqs, { question: '', answer: '' }])
                }
                className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-sm text-stone-400 hover:border-[#1C3B2B] hover:text-[#1C3B2B] transition-colors"
              >
                + Add another FAQ
              </button>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep5}
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 6: Readiness Check ----
      case 6: {
        const { score, complete, missing } = calculateReadiness(formData)
        const canProceed = score >= 70

        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>Readiness check</h1>
              <p className="mt-2 text-sm text-stone-500">
                You need at least 70 points to go live.
              </p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-6 p-6 bg-stone-50 rounded-2xl mb-6">
              <div className="flex-shrink-0 text-center w-20">
                <div
                  className={`text-5xl font-bold tabular-nums ${
                    canProceed ? 'text-[#1C3B2B]' : 'text-stone-400'
                  }`}
                >
                  {score}
                </div>
                <div className="text-xs text-stone-400 mt-1">out of 100</div>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      canProceed ? 'bg-[#1C3B2B]' : 'bg-stone-300'
                    }`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  {canProceed
                    ? 'Ready to go live!'
                    : `Add ${70 - score} more point${70 - score === 1 ? '' : 's'} to continue`}
                </p>
              </div>
            </div>

            {/* Complete / Missing */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  Complete
                </h3>
                <ul className="space-y-1.5">
                  {complete.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-stone-700">
                      <span className="text-[#1C3B2B] font-medium">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {missing.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                    Missing
                  </h3>
                  <ul className="space-y-1.5">
                    {missing.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-stone-400">
                        <span>&middot;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Test number — UI only, coming soon */}
            <div className="p-4 border border-stone-200 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-700">Test your number</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Send a test text to yourself — available once your number is assigned.
                  </p>
                </div>
                <div className="relative group flex-shrink-0">
                  <button
                    disabled
                    className="px-4 py-2 text-sm text-stone-400 border border-stone-200 rounded-lg cursor-not-allowed"
                  >
                    Send test
                  </button>
                  <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-stone-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    Coming soon &mdash; available after go live
                  </span>
                </div>
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep6}
              continueLabel="Continue to go live"
              continueDisabled={!canProceed}
              isPending={isPending}
            />
          </div>
        )
      }

      // ---- Step 7: Go Live ----
      case 7: {
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold" style={{ color: C.forest }}>
                You&apos;re ready to go live
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Here&apos;s your dedicated wedding number.
              </p>
            </div>

            {/* Provisioned number */}
            <div className="p-6 rounded-2xl mb-6 text-center" style={{ backgroundColor: C.forest }}>
              <p className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: C.cream, opacity: 0.7 }}>
                Your wedding number
              </p>
              {provisionLoading ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${C.cream} transparent transparent transparent` }} />
                  <p className="text-sm" style={{ color: C.cream, opacity: 0.7 }}>Reserving your number&hellip;</p>
                </div>
              ) : provisionError ? (
                <div>
                  <p className="text-sm text-red-300 leading-relaxed">{provisionError}</p>
                </div>
              ) : provisionedNumber ? (
                <div>
                  <p className="text-3xl font-semibold font-mono tracking-wide" style={{ color: C.cream }}>
                    {provisionedNumber}
                  </p>
                  <p className="text-xs mt-4" style={{ color: C.cream, opacity: 0.6 }}>
                    Share this number with your guests so they can text your wedding coordinator.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Partner invite */}
            <div className="p-5 border border-stone-200 rounded-xl mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    Invite {formData.partnerName || 'your partner'}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {partnerSaved
                      ? "Saved \u2014 we\u2019ll send the invite when the feature launches."
                      : 'Give them access to the dashboard too.'}
                  </p>
                </div>
                {partnerSaved ? (
                  <span className="flex-shrink-0 text-sm font-medium" style={{ color: C.forest }}>
                    &#10003; Saved
                  </span>
                ) : (
                  <button
                    onClick={() => setShowPartnerModal(true)}
                    className="flex-shrink-0 px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                    style={{ color: C.forest, border: `1px solid ${C.forest}40` }}
                  >
                    Invite
                  </button>
                )}
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onContinue={handleStep7}
              continueLabel="Confirm &amp; go live"
              isPending={isPending}
            />
          </div>
        )
      }

      default:
        return null
    }
  }

  // ----------------------------------------------------------------
  // Root render
  // ----------------------------------------------------------------

  return (
    <main className="min-h-screen" style={{ backgroundColor: C.cream }}>
      {/* Fixed progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 border-b border-stone-100" style={{ backgroundColor: C.cream }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-stone-400 whitespace-nowrap tabular-nums">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(28,59,43,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: C.forest }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-24">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {renderStep()}
      </div>

      {/* Partner invite modal */}
      {showPartnerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPartnerModal(false)
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-stone-900 mb-1">
              Invite {formData.partnerName || 'your partner'}
            </h2>
            <p className="text-sm text-stone-400 mb-5">
              We&apos;ll send them a link to view and manage the wedding coordinator together.
              Invites are coming soon.
            </p>
            <label className={labelClass}>Partner&apos;s email</label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@example.com"
              className={inputClass}
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPartnerModal(false)}
                className="flex-1 py-2.5 text-sm text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPartnerSaved(true)
                  setShowPartnerModal(false)
                }}
                disabled={!partnerEmail.trim()}
                className="flex-1 py-2.5 text-sm text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:opacity-90"
                style={{ backgroundColor: C.forest }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
