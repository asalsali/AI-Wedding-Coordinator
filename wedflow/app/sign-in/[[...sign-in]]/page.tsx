import Image from 'next/image'
import SignInForm from './SignInForm'

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel — forest green, desktop only */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center"
        style={{ backgroundColor: '#1C3B2B', padding: '48px' }}
      >
        <Image
          src="/WedFlowlogo.png"
          alt="Wedflow"
          width={56}
          height={56}
          priority
          style={{ marginBottom: '8px' }}
        />
        <h1
          className="wf-serif"
          style={{
            color: '#FDFBF7',
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          Wedflow
        </h1>
        <p
          className="wf-serif"
          style={{
            color: 'rgba(253,251,247,0.65)',
            fontSize: '18px',
            fontStyle: 'italic',
            textAlign: 'center',
            maxWidth: '280px',
            lineHeight: 1.5,
          }}
        >
          Your wedding, beautifully coordinated.
        </p>
      </div>

      {/* Right panel — cream */}
      <div
        className="w-full md:w-1/2 flex flex-col items-center justify-center"
        style={{ backgroundColor: '#FDFBF7', padding: '48px 24px', minHeight: '100vh' }}
      >
        {/* Mobile logo — hidden on desktop */}
        <div
          className="flex md:hidden flex-col items-center"
          style={{ marginBottom: '40px' }}
        >
          <Image
            src="/WedFlowlogo.png"
            alt="Wedflow"
            width={44}
            height={44}
            style={{ marginBottom: '4px' }}
          />
          <span
            className="wf-serif"
            style={{ color: '#1C3B2B', fontSize: '24px', fontWeight: 700 }}
          >
            Wedflow
          </span>
        </div>

        <SignInForm />
      </div>
    </div>
  )
}
