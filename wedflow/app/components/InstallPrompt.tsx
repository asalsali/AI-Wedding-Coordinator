'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'wedflow-install-dismissed';
const INSTALLED_KEY = 'wedflow-installed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (
      localStorage.getItem(DISMISSED_KEY) ||
      localStorage.getItem(INSTALLED_KEY)
    ) {
      return;
    }

    // Only show on mobile
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect if already installed
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true');
    }

    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[env(safe-area-inset-bottom,16px)]">
      <div className="mx-auto max-w-md bg-[#1C3B2B] text-[#FDFBF7] rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--plus-jakarta)] text-sm font-medium">
            Add WedFlow to your home screen
          </p>
          <p className="font-[family-name:var(--plus-jakarta)] text-xs text-[#FDFBF7]/70 mt-0.5">
            Quick access to your wedding circle
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="font-[family-name:var(--plus-jakarta)] px-3 py-1.5 bg-[#FDFBF7] text-[#1C3B2B] rounded-lg text-xs font-semibold shrink-0"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#FDFBF7]/60 hover:text-[#FDFBF7] p-1 shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
