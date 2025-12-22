"use client";

import Link from "next/link";
import Image from "next/image";
import { useAccount, usePassphraseAuth } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { Button } from "@/components/atoms/button";
import { User, Settings, LogOut, Shield, Menu, X } from "lucide-react";
import { useSubscription } from "@/utils/subscriptionManager";
import { useAuthModal } from "@/components/organisms/passphrase-ui";
import { useState, useEffect } from "react";
import { wordlist } from "@/utils/passphrase-wordlist";

export function Navigation() {
  const { me, logOut } = useAccount(MyAppAccount);
  const auth = usePassphraseAuth({ wordlist });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const subscription = useSubscription(me);
  const { currentTier, currentPlan } = me
    ? subscription
    : { currentTier: "free" as const, currentPlan: null };
  const isAdmin =
    me?.profile?.email &&
    ["admin@succulent.app", "sammi@succulent.app"].includes(me.profile.email);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
      setShowMobileMenu(false);
    };
    if (showDropdown || showMobileMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown, showMobileMenu]);

  const authModal = useAuthModal();

  // Check actual auth state - not just if me exists (Jazz creates anonymous accounts)
  const isActuallySignedIn = auth.state === "signedIn";

  // Handle sign out - works for both signed in and anonymous accounts
  const handleSignOut = async () => {
    try {
      await logOut();
      // Clear any Jazz storage to fully reset
      if (typeof window !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.includes("jazz"))
          .forEach((k) => localStorage.removeItem(k));
      }
      setShowDropdown(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!isActuallySignedIn) {
    return (
      <nav className="flex items-center justify-between px-4 py-3 sm:p-4 bg-card border-b dark:border-border">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/succulent-namemark.png"
              alt="Succulent"
              width={140}
              height={32}
              className="h-7 sm:h-8 w-auto"
              priority
            />
          </Link>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="outline"
            size="1"
            className="sm:text-base"
            onClick={() => authModal?.setShowAuthModal(true)}
          >
            Sign In
          </Button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-card border-b dark:border-border">
      <div className="flex items-center justify-between px-4 py-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/succulent-namemark.png"
              alt="Succulent"
              width={140}
              height={32}
              className="h-7 sm:h-8 w-auto"
              priority
            />
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/account"
              className="text-muted-foreground hover:text-foreground"
            >
              Account
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Plan Badge - hidden on very small screens */}
          <div
            className={`hidden sm:block px-2 py-1 rounded-full text-xs font-medium ${
              currentTier === "free"
                ? "bg-muted text-foreground"
                : currentTier === "premium"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : currentTier === "business"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
            }`}
          >
            {currentPlan?.name || "Free"}
          </div>

          {/* Admin Badge - hidden on mobile */}
          {isAdmin && (
            <Link href="/admin" className="hidden sm:block">
              <Button
                variant="outline"
                size="1"
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Shield size={14} className="mr-1" />
                Admin
              </Button>
            </Link>
          )}

          {/* Account Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="1"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 min-h-[44px] min-w-[44px] justify-center"
            >
              <User size={16} />
              <span className="hidden sm:inline">
                {me.profile?.name || "Account"}
              </span>
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg border border-border z-50">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-border dark:border-border">
                    <p className="text-sm font-medium text-foreground">
                      {me.profile?.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {me.profile?.email}
                    </p>
                    {/* Show plan badge in dropdown on mobile */}
                    <div
                      className={`sm:hidden mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        currentTier === "free"
                          ? "bg-muted text-foreground"
                          : currentTier === "premium"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : currentTier === "business"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                      }`}
                    >
                      {currentPlan?.name || "Free"}
                    </div>
                  </div>

                  <Link
                    href="/account"
                    className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted"
                  >
                    <User size={16} className="mr-3" />
                    Account Settings
                  </Link>

                  <Link
                    href="/account?tab=subscription"
                    className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted"
                  >
                    <Settings size={16} className="mr-3" />
                    Subscription
                  </Link>

                  {/* Admin link in dropdown for mobile */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="sm:hidden flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-muted"
                    >
                      <Shield size={16} className="mr-3" />
                      Admin Panel
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-muted"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
