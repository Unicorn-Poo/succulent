import { JazzReactProvider } from "jazz-tools/react";
import { JazzInspector } from "jazz-tools/inspector";
import { PassphraseAuthBasicUI } from "./organisms/passphrase-ui";
import { wordlist } from "@/utils/passphrase-wordlist";
import { MyAppAccount } from "@/app/schema";

export function JazzAndAuth({ children }: { children: React.ReactNode }) {
  return (
    <JazzReactProvider
      sync={{
        peer: "wss://cloud.jazz.tools/?key=succulent@sammii.dev",
      }}
      AccountSchema={MyAppAccount}
    >
      <PassphraseAuthBasicUI
        appName="Succulent"
        wordlist={wordlist}
      >
        {children}
      </PassphraseAuthBasicUI>
      <JazzInspector />
    </JazzReactProvider>
  );
}