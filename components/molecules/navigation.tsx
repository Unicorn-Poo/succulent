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
      <nav className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-green-600">
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
    <nav className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold text-green-600">
          🌱 Succulent
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/account" className="text-gray-600 hover:text-gray-900">
            Account
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Plan Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          currentTier === 'free' ? 'bg-gray-100 text-gray-700' :
          currentTier === 'premium' ? 'bg-green-100 text-green-700' :
          currentTier === 'business' ? 'bg-purple-100 text-purple-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          {currentPlan?.name || 'Free'}
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <Link href="/admin">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-sm">
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
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{me.profile?.name}</p>
                  <p className="text-xs text-gray-500">{me.profile?.email}</p>
                </div>
                
                <Link href="/account" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <User size={14} className="mr-2" />
                  Account Settings
                </Link>
                
                <Link href="/account?tab=subscription" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Settings size={14} className="mr-2" />
                  Subscription
                </Link>
                
                <button
                  onClick={logOut}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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