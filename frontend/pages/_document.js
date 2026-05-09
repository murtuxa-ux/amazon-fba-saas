import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <meta name="theme-color" content="#1A1A1A" />
        <meta name="description" content="Ecom Era — Amazon FBA wholesale management platform." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
