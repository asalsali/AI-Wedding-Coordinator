'use client';

import { useEffect, useState } from 'react';
import { subscribeToPush, getPushPermissionState } from '@/lib/push/subscribe';

export function NotificationPrompt() {
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    getPushPermissionState().then((state) => {
      setPermissionState(state);
      // Show prompt only if permission hasn't been decided yet
      if (state === 'default') {
        setShowPrompt(true);
      }
    });
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToPush();
      setPermissionState('granted');
      setShowPrompt(false);
    } catch {
      // Permission denied or subscription failed
      setPermissionState(await getPushPermissionState());
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || permissionState === 'granted') return null;

  if (permissionState === 'denied') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="font-[family-name:var(--plus-jakarta)] text-sm text-amber-800">
          Notifications are blocked. To receive alerts when guests need your attention,
          enable notifications in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1C3B2B]/10 bg-[#1C3B2B]/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1C3B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
          <svg
            className="w-4 h-4 text-[#1C3B2B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--plus-jakarta)] text-sm font-medium text-[#1C3B2B]">
            Get notified when guests need your attention
          </p>
          <p className="font-[family-name:var(--plus-jakarta)] text-xs text-[#1C3B2B]/60 mt-1">
            We&apos;ll only notify you for messages that need a personal response.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-11">
        <button
          onClick={handleEnable}
          disabled={isSubscribing}
          className="font-[family-name:var(--plus-jakarta)] px-3 py-1.5 bg-[#1C3B2B] text-[#FDFBF7] rounded-lg text-xs font-medium disabled:opacity-50"
        >
          {isSubscribing ? 'Enabling...' : 'Enable notifications'}
        </button>
        <button
          onClick={handleDismiss}
          className="font-[family-name:var(--plus-jakarta)] px-3 py-1.5 text-[#1C3B2B]/60 text-xs"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
