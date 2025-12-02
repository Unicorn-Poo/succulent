import { useState, useEffect } from "react";
import { usePassphraseAuth } from "jazz-tools/react";
import {
  Card,
  Tabs,
  Box,
  Heading,
  Text,
  Button,
  Badge,
  Flex,
  TextArea,
} from "@radix-ui/themes";

// Clear corrupted Jazz auth storage
function clearCorruptedAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.includes("jazz"))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error("Failed to clear Jazz storage:", e);
  }
}

export function PassphraseAuthBasicUI(props: {
  appName: string;
  wordlist: string[];
  children?: React.ReactNode;
}) {
  const [authError, setAuthError] = useState<string | null>(null);

  // Catch auth initialization errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes("Uint8Array expected") ||
        event.message?.includes("length=0")
      ) {
        console.error("Jazz auth corrupted, clearing storage...");
        clearCorruptedAuthStorage();
        setAuthError("Session corrupted. Please refresh the page.");
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  const auth = usePassphraseAuth({
    wordlist: props.wordlist,
  });

  const [step, setStep] = useState<"initial" | "create" | "login">("initial");
  const [loginPassphrase, setLoginPassphrase] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [currentPassphrase, setCurrentPassphrase] = useState(() =>
    auth.generateRandomPassphrase()
  );

  // Show error state with refresh button
  if (authError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="min-w-[400px]">
          <div className="flex flex-col gap-4">
            <Heading>Session Error</Heading>
            <Text>{authError}</Text>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (auth.state === "signedIn") {
    return props.children ?? null;
  }

  const handleCreateAccount = async () => {
    setStep("create");
  };

  const handleLogin = () => {
    setStep("login");
  };

  const handleReroll = () => {
    const newPassphrase = auth.generateRandomPassphrase();
    setCurrentPassphrase(newPassphrase);
    setIsCopied(false);
  };

  const handleBack = () => {
    setStep("initial");
    setLoginPassphrase("");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(auth.passphrase);
    setIsCopied(true);
  };

  const handleLoginSubmit = async () => {
    await auth.logIn(loginPassphrase);
    setStep("initial");
    setLoginPassphrase("");
  };

  const handleNext = async () => {
    await auth.registerNewAccount(currentPassphrase, "My Account");
    setStep("initial");
    setLoginPassphrase("");
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="min-w-[400px]">
        {step === "initial" && (
          <div className="flex flex-col gap-4">
            <Heading>{props.appName}</Heading>
            <Button
              onClick={handleCreateAccount}
              className="auth-button-primary"
            >
              Create new account
            </Button>
            <Button onClick={handleLogin} className="auth-button-secondary">
              Log in
            </Button>
          </div>
        )}

        {step === "create" && (
          <div className="flex flex-col gap-4">
            <h1 className="auth-heading">Your Passphrase</h1>
            <p className="auth-description">
              Please copy and store this passphrase somewhere safe. You'll need
              it to log in.
            </p>
            <textarea
              readOnly
              value={currentPassphrase}
              className="auth-textarea"
              rows={5}
            />
            <Button onClick={handleCopy} className="auth-button-primary">
              {isCopied ? "Copied!" : "Copy"}
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleBack} variant="soft">
                Back
              </Button>
              <Button onClick={handleReroll} variant="soft">
                Generate New Passphrase
              </Button>
              <Button onClick={handleNext}>Register</Button>
            </div>
          </div>
        )}

        {step === "login" && (
          <div className="flex flex-col gap-4">
            <h1 className="auth-heading">Log In</h1>
            <TextArea
              value={loginPassphrase}
              onChange={(e) => setLoginPassphrase(e.target.value)}
              placeholder="Enter your passphrase"
              className="auth-textarea"
              rows={5}
            />
            <div className="flex gap-2">
              <Button onClick={handleBack} variant="soft">
                Back
              </Button>
              <Button onClick={handleLoginSubmit}>Log In</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
