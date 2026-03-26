import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PaymentPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');

  const plans = [
    {
      key: 'scout',
      name: 'Scout',
      desc: 'For solo sellers getting started',
      priceMonthly: 29,
      priceAnnual: 23,
      features: ['1 User', 'Basic Product Scouting', 'Weekly Reports', 'Email Support'],
      popular: false,
    },
    {
      key: 'growth',
      name: 'Growth',
      desc: 'For growing wholesale businesses',
      priceMonthly: 79,
      priceAnnual: 63,
      features: ['5 Users', 'AI Analytics', 'Supplier Management', 'Priority Support'],
      popular: true,
    },
    {
      key: 'professional',
      name: 'Professional',
      desc: 'For established teams',
      priceMonthly: 149,
      priceAnnual: 119,
      features: ['15 Users', 'Advanced Analytics', 'Custom Reports', '24/7 Support'],
      popular: false,
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      desc: 'For large-scale operations',
      priceMonthly: 299,
      priceAnnual: 239,
      features: ['Unlimited Users', 'White-label', 'API Access', 'Dedicated Manager'],
      popular: false,
    },
  ];

  useEffect(() => {
    // Read user name
    try {
      const stored = localStorage.getItem('ecomera_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserName(u.name || u.username || '');
      }
    } catch (e) {}

    // Check if plan was passed via query param
    if (router.query.plan) {
      const validPlans = ['scout', 'growth', 'professional', 'enterprise'];
      if (validPlans.includes(router.query.plan)) {
        setSelectedPlan(router.query.plan);
      }
    }

    // Check if user already has a subscription
    checkBillingStatus();
  }, [router.query]);

  const checkBillingStatus = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setCheckingStatus(false);
        return;
      }
      const res = await fetch(`${API_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.has_payment_method && data.stripe_subscription_id) {
          // Already subscribed — send to dashboard
          window.location.href = '/';
          return;
        }
      }
    } catch (e) {
      // If billing check fails, still show the payment page
    }
    setCheckingStatus(false);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billing_cycle: billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create checkout session');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan) => {
    return billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  };

  if (checkingStatus) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#888', fontSize: '16px' }}>Checking subscription status...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 40px',
        borderBottom: '1px solid #1E1E1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFD700', letterSpacing: '2px' }}>
          ECOM ERA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {userName && (
            <span style={{ color: '#888', fontSize: '14px' }}>Welcome, {userName}</span>
          )}
          <button
            onClick={() => { router.push('/'); }}
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#888',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '20px',
            color: '#FFD700',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '16px',
          }}>
            14-DAY FREE TRIAL — NO CHARGE TODAY
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            Choose Your Plan
          </h1>
          <p style={{ color: '#888', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
            Start your free trial today. Your card will only be charged after 14 days.
          </p>
        </div>

        {/* Billing Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          margin: '32px 0',
        }}>
          <span style={{ color: billingCycle === 'monthly' ? '#FFFFFF' : '#666', fontSize: '14px', fontWeight: '500' }}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: billingCycle === 'annual' ? '#FFD700' : '#333',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: billingCycle === 'annual' ? '27px' : '3px',
              transition: 'left 0.3s ease',
            }} />
          </button>
          <span style={{ color: billingCycle === 'annual' ? '#FFFFFF' : '#666', fontSize: '14px', fontWeight: '500' }}>
            Annual
            <span style={{
              marginLeft: '6px',
              padding: '2px 8px',
              backgroundColor: 'rgba(255, 215, 0, 0.15)',
              color: '#FFD700',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
            }}>
              Save 20%
            </span>
          </span>
        </div>

        {/* Plan Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.key;
            return (
              <div
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                style={{
                  backgroundColor: '#111111',
                  border: isSelected
                    ? '2px solid #FFD700'
                    : '1px solid #1E1E1E',
                  borderRadius: '12px',
                  padding: '28px 24px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 14px',
                    backgroundColor: '#FFD700',
                    color: '#0A0A0A',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Selection Indicator */}
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: isSelected ? '2px solid #FFD700' : '2px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  {isSelected && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#FFD700',
                    }} />
                  )}
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                  {plan.name}
                </h3>
                <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
                  {plan.desc}
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: isSelected ? '#FFD700' : '#FFFFFF' }}>
                    ${getPrice(plan)}
                  </span>
                  <span style={{ color: '#888', fontSize: '14px' }}>/mo</span>
                  {billingCycle === 'annual' && (
                    <div style={{ color: '#666', fontSize: '12px', textDecoration: 'line-through', marginTop: '2px' }}>
                      ${plan.priceMonthly}/mo
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '16px' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      fontSize: '13px',
                      color: '#CCC',
                    }}>
                      <span style={{ color: '#FFD700', fontSize: '14px' }}>&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#1E1E1E',
            border: '1px solid #CD7F32',
            borderRadius: '8px',
            color: '#FFD700',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '24px',
            maxWidth: '600px',
            margin: '0 auto 24px',
          }}>
            {error}
          </div>
        )}

        {/* CTA Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              padding: '16px 48px',
              backgroundColor: '#FFD700',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              minWidth: '320px',
            }}
          >
            {loading
              ? 'Redirecting to Stripe...'
              : `Start Free 14-Day Trial — ${plans.find((p) => p.key === selectedPlan)?.name} Plan`}
          </button>

          <div style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: '#666', fontSize: '13px' }}>
              &#128274; Secure payment via Stripe
            </span>
            <span style={{ color: '#666', fontSize: '13px' }}>
              &#10003; Cancel anytime
            </span>
            <span style={{ color: '#666', fontSize: '13px' }}>
              &#10003; 30-day money-back guarantee
            </span>
          </div>
        </div>

        {/* Launch Offer */}
        <div style={{
          marginTop: '40px',
          padding: '20px 32px',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 215, 0, 0.02))',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '15px', color: '#FFD700', fontWeight: '600', marginBottom: '4px' }}>
            Launch Special: Use code LAUNCH30 at checkout for 30% off your first 3 months
          </p>
          <p style={{ fontSize: '13px', color: '#888' }}>
            Promotion codes are accepted on the Stripe checkout page
          </p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: '48px', maxWidth: '600px', margin: '48px auto 0' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', textAlign: 'center', marginBottom: '24px' }}>
            Common Questions
          </h2>

          {[
            {
              q: 'When will I be charged?',
              a: 'Your 14-day free trial starts today. You will not be charged until the trial ends. Cancel anytime before the trial expires to avoid charges.',
            },
            {
              q: 'Can I change plans later?',
              a: 'Yes! You can upgrade or downgrade your plan at any time from the billing settings in your dashboard.',
            },
            {
              q: 'What happens if I cancel?',
              a: 'If you cancel during the trial, you will not be charged. If you cancel after, your access continues until the end of the billing period.',
            },
            {
              q: 'Is my payment information secure?',
              a: 'Absolutely. All payments are processed by Stripe, the industry leader in payment security. We never store your card details on our servers.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px 0',
              borderBottom: '1px solid #1E1E1E',
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>{item.q}</h4>
              <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.5' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
