import Head from 'next/head';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page not found · Ecom Era</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.code}>404</div>
          <h1 style={styles.title}>Page not found</h1>
          <p style={styles.subtitle}>
            That page doesn't exist or the link is out of date.
          </p>
          <div style={styles.actions}>
            <Link href="/" style={styles.primary}>
              Back to dashboard
            </Link>
            <Link href="/login" style={styles.secondary}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    margin: 0,
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '12px',
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  code: {
    fontSize: '64px',
    fontWeight: '700',
    color: '#FFD000',
    letterSpacing: '-2px',
    marginBottom: '16px',
    lineHeight: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
    margin: '0 0 32px 0',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  primary: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: '600',
    backgroundColor: '#FFD000',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  secondary: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: '#FFD000',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
};
