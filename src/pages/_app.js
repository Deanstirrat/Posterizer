import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react';
import localFont from 'next/font/local'

export default function App({ Component, pageProps }) {
  return(
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}