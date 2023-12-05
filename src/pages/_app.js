import "bootstrap/dist/css/bootstrap.min.css"; // Import bootstrap CSS
import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react';
import localFont from 'next/font/local'
import { useEffect } from "react";


export default function App({ Component, pageProps }) {

  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return(
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}