'use client';

import Link from 'next/link';
import { useAccount } from 'jazz-tools/react';
import { MyAppAccount } from '@/app/schema';
import { Button } from '@/components/atoms/button';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useSubscription } from '@/utils/subscriptionManager';
import { useState } from 'react';

export function Navigation() {
  const { me, logOut } = useAccount(MyAppAccount);
  const [showDropdown, setShowDropdown] = useState(false);
  const subscription = useSubscription(me);
  const { currentTier, currentPlan } = me ? subscription : { currentTier: 'free' as const, currentPlan: null };
  const isAdmin = me?.profile?.email && ['admin@succulent.app', 'sammi@succulent.app'].includes(me.profile.email);

  if (!me) {
    return (
      <nav className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">
            🌱 Succulent
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/auth/signin">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">
          🌱 Succulent
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/account" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:text-gray-300 dark:hover:text-gray-100">
            Account
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Plan Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          currentTier === 'free' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-800 dark:text-gray-300' :
          currentTier === 'premium' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:bg-green-900/30 dark:text-green-400' :
          currentTier === 'business' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 dark:bg-purple-900/30 dark:text-purple-400' :
          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        }`}>
          {currentPlan?.name || 'Free'}
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <Link href="/admin">
            <Button variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 text-sm">
              <Shield size={14} className="mr-1" />
              Admin
            </Button>
          </Link>
        )}

        {/* Account Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2"
          >
            <User size={16} />
            <span className="hidden md:inline">{me.profile?.name || 'Account'}</span>
          </Button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{me.profile?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{me.profile?.email}</p>
                </div>
                
                <Link href="/account" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  <User size={14} className="mr-2" />
                  Account Settings
                </Link>
                
                <Link href="/account?tab=subscription" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  <Settings size={14} className="mr-2" />
                  Subscription
                </Link>
                
                <button
                  onClick={logOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 