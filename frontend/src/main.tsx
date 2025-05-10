import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/themeProvider.tsx';
import { PasskeyAuthBasicUI, JazzProvider } from 'jazz-react';
import { SucculentAccount } from './dataModel.ts';

export function JazzAndAuth({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JazzProvider
        sync={{ peer: 'wss://cloud.jazz.tools/?key=frontend@succulent.social' }}
        AccountSchema={SucculentAccount}
      >
        {children}
        <PasskeyAuthBasicUI appName="succulent" />
      </JazzProvider>
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
