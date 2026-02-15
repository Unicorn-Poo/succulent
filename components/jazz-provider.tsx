"use client";

import { JazzReactProvider } from "jazz-tools/react";
import { PassphraseAuthBasicUI } from "./organisms/passphrase-ui";
import { wordlist } from "@/utils/passphrase-wordlist";
import { MyAppAccount } from "@/app/schema";
import { useState, useEffect } from "react";

function clearJazzStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.toLowerCase().includes("jazz") || k.includes("cojson"))
      .forEach((k) => localStorage.removeItem(k));
    // Also clear IndexedDB databases used by jazz
    if (window.indexedDB) {
      indexedDB.databases?.().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name && (db.name.includes("jazz") || db.name.includes("cojson"))) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  } catch (e) {
    console.error("Failed to clear storage:", e);
  }
}

function JazzLoadingFallback({ children }: { children: React.ReactNode }) {
  const [showTimeout, setShowTimeout] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // If children are being rendered, we've loaded
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoaded) setShowTimeout(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [hasLoaded]);

  if (hasLoaded) return <>{children}</>;

  if (showTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connection timed out
          </h2>
          <p className="text-muted-foreground mb-6">
            Having trouble connecting. This can happen if your session data is
            corrupted or out of date.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                clearJazzStorage();
                window.location.reload();
              }}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              Clear session & retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Connecting...</p>
      </div>
    </div>
  );
}

export function JazzAndAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready) setTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <>
      <JazzReactProvider
        sync={{
          peer: `wss://cloud.jazz.tools/?key=${process.env.NEXT_PUBLIC_JAZZ_API_KEY}` as `wss://${string}`,
        }}
        AccountSchema={MyAppAccount}
      >
        <SetReady onReady={() => setReady(true)} />
        <PassphraseAuthBasicUI appName="Succulent" wordlist={wordlist}>
          {children}
        </PassphraseAuthBasicUI>
      </JazzReactProvider>

      {!ready && (
        <div className="min-h-screen bg-background flex items-center justify-center fixed inset-0 z-[9999]">
          <div className="text-center max-w-md p-8">
            {timedOut ? (
              <>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-destructive text-xl">!</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Connection timed out
                </h2>
                <p className="text-muted-foreground mb-6">
                  Having trouble connecting. This can happen if your session
                  data is corrupted or out of date.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => {
                      clearJazzStorage();
                      window.location.reload();
                    }}
                    className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Clear session & retry
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Connecting...</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Invisible component that fires once the Jazz context is ready */
function SetReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}
