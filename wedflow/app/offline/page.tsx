'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#1C3B2B]/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#1C3B2B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--newsreader)] text-2xl font-semibold text-[#1C3B2B] mb-3">
          You&apos;re offline
        </h1>
        <p className="font-[family-name:var(--plus-jakarta)] text-[#1C3B2B]/70 mb-8">
          Reconnect to the internet to manage your messages and wedding circle.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="font-[family-name:var(--plus-jakarta)] px-6 py-3 bg-[#1C3B2B] text-[#FDFBF7] rounded-lg text-sm font-medium hover:bg-[#1C3B2B]/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
