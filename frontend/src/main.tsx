import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/themeProvider.tsx';
import {
  createJazzReactApp,
  usePasskeyAuth,
  PasskeyAuthBasicUI,
} from 'jazz-react';
import { SucculentAccount } from './dataModel.ts';

export const Jazz = createJazzReactApp({
  AccountSchema: SucculentAccount,
});
export const { useCoState, useAccount, useAcceptInvite } = Jazz;

export function JazzAndAuth({ children }: { children: React.ReactNode }) {
  const [auth, authState] = usePasskeyAuth({
    appName: 'succulent',
    appHostname: window.location.hostname.endsWith('succulent.jazz.tools')
      ? 'succulent.jazz.tools'
      : undefined,
  });

  return (
    <>
      <Jazz.Provider
        auth={auth}
        // storage="singleTabOPFS"
        // replace `you@example.com` with your email as a temporary API key
        peer="wss://mesh.jazz.tools/?key=frontend@succulent.social"
      >
        {children}
      </Jazz.Provider>
      {authState.state !== 'signedIn' && (
        <PasskeyAuthBasicUI state={authState} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <ThemeProvider>
    <JazzAndAuth>
      <App />
    </JazzAndAuth>
  </ThemeProvider>
  // </React.StrictMode>
);
