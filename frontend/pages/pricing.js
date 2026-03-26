import { useState } from 'react';
import { useRouter } from 'next/router';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const BRAND_COLORS = {
    bg: '#0A0A0A',
    card: '#111111',
    altSection: '#0D0D1A',
    gold: '#FFD700',
    blue: '#3B82F6',
    green: '#10B981',
    red: '#EF4444',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#1E1E1E',
  };

  // Pricing plans data
  const plans = [
    {
      name: 'Scout',
      monthlyPrice: 29,
      description: 'Perfect for solo sellers',
      cta: 'Start Free Trial',
      popular: false,
      features: [
        '1 user',
        '200 product scouts/month',
        'Basic AI scoring',
        '5 clients',
        'CSV exports',
        'Email support',
      ],
    },
    {
      name: 'Growth',
      monthlyPrice: 79,
      description: 'For growing wholesale businesses',
      cta: 'Start Free Trial',
      popular: true,
      features: [
        '5 users',
        '1,000 product scouts/month',
        'Advanced AI scoring + recommendations',
        '25 clients',
        'CSV + PDF exports',
        'Supplier management',
        'Team collaboration',
        'Priority email support',
      ],
    },
    {
      name: 'Professional',
      monthlyPrice: 149,
      description: 'For established wholesale teams',
      cta: 'Start Free Trial',
      popular: false,
      features: [
        '15 users',
        '5,000 product scouts/month',
        'Full AI suite (scoring, market intel, competitor tracking)',
        'Unlimited clients',
        'Automated reports',
        'Inventory forecasting',
        'Pricing optimizer',
        'Risk analyzer',
        'Dedicated support',
      ],
    },
    {
      name: 'Enterprise',
      monthlyPrice: 299,
      description: 'For large-scale operations',
      cta: 'Contact Sales',
      popular: false,
      features: [
        'Unlimited users',
        '25,000 product scouts/month',
        'Everything in Professional',
        'Custom integrations',
        'API access',
        'White-label options',
        'Dedicated account manager',
        'SLA guarantee',
        'Custom onboarding',
      ],
    },
  ];

  // Feature comparison table
  const comparisonFeatures = [
    { name: 'Team Members', scout: '1', growth: '5', professional: '15', enterprise: 'Unlimited' },
    { name: 'Product Scouts/mo', scout: '200', growth: '1,000', professional: '5,000', enterprise: '25,000' },
    { name: 'AI Product Scoring', scout: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
    { name: 'AI Recommendations', scout: '✗', growth: '✓', professional: '✓', enterprise: '✓' },
    { name: 'Market Intelligence', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'Competitor Tracking', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'Supplier Management', scout: '✗', growth: '✓', professional: '✓', enterprise: '✓' },
    { name: 'Client Management', scout: '5', growth: '25', professional: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'CSV Exports', scout: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
    { name: 'PDF Reports', scout: '✗', growth: '✓', professional: '✓', enterprise: '✓' },
    { name: 'Automated Reports', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'Inventory Forecasting', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'Pricing Optimizer', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'Risk Analyzer', scout: '✗', growth: '✗', professional: '✓', enterprise: '✓' },
    { name: 'API Access', scout: '✗', growth: '✗', professional: '✗', enterprise: '✓' },
    { name: 'Custom Integrations', scout: '✗', growth: '✗', professional: '✗', enterprise: '✓' },
    { name: 'Support', scout: 'Email', growth: 'Priority Email', professional: 'Dedicated', enterprise: 'Dedicated + SLA' },
  ];

  // Competitor comparison
  const competitors = [
    { name: 'Ecom Era', startPrice: '$29', endPrice: '$299', highlight: true },
    { name: 'Helium 10', startPrice: '$79', endPrice: '$229', highlight: false },
    { name: 'Jungle Scout', startPrice: '$49', endPrice: '$349', highlight: false },
    { name: 'SmartScout', startPrice: '$29', endPrice: '$187', highlight: false },
    { name: 'Seller Assistant', startPrice: '$15.99', endPrice: '$39.99', highlight: false },
  ];

  // FAQ data
  const faqItems = [
    {
      q: 'Is there a free trial?',
      a: 'Yes, 14-day free trial with full access. No credit card required.',
    },
    {
      q: 'Can I switch plans?',
      a: 'Upgrade or downgrade anytime. Changes take effect immediately with prorated billing.',
    },
    {
      q: 'What happens when I hit my scout limit?',
      a: "You'll get a notification at 80% usage. You can upgrade instantly or wait for the monthly reset.",
    },
    {
      q: 'Do you offer annual discounts?',
      a: 'Yes! Save 20% when you pay annually. That\'s 2 months free.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, one-click cancellation. No contracts, no cancellation fees.',
    },
    {
      q: 'What payment methods?',
      a: 'Visa, Mastercard, American Express, PayPal. All payments processed securely via Stripe.',
    },
    {
      q: 'Do you offer refunds?',
      a: '30-day money-back guarantee. Full refund if you\'re not satisfied.',
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. Enterprise-grade encryption, SOC 2 compliant infrastructure, daily backups.',
    },
  ];

  const getPrice = (monthlyPrice) => {
    if (isAnnual) {
      return monthlyPrice * 10; // 10 months for price of 12 = 20% discount
    }
    return monthlyPrice;
  };

  const handleCtaClick = (planName) => {
    if (planName === 'Enterprise') {
      window.location.href = 'mailto:support@ecomera.io';
    } else {
      router.push('/signup');
    }
  };

  return (
    <div style={{ backgroundColor: BRAND_COLORS.bg, color: BRAND_COLORS.textPrimary, minHeight: '100vh' }}>
      {/* HEADER / NAV */}
      <header style={{ borderBottom: `1px solid ${BRAND_COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.1em', color: BRAND_COLORS.gold }}>
            ECOM ERA
          </div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#features" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none', cursor: 'pointer' }}>Features</a>
            <a href="#pricing" style={{ color: BRAND_COLORS.gold, fontWeight: '600', textDecoration: 'none', cursor: 'pointer' }}>Pricing</a>
            <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: BRAND_COLORS.textSecondary, cursor: 'pointer', fontSize: '1rem' }}>
              Login
            </button>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: BRAND_COLORS.gold,
                color: '#000000',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Start Free Trial
            </button>
          </nav>
        </div>
      </header>

      {/* PRICING HERO */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: '1.2' }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: '1.25rem', color: BRAND_COLORS.textSecondary, marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Annual/Monthly Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <span style={{ color: isAnnual ? BRAND_COLORS.textSecondary : BRAND_COLORS.textPrimary, fontSize: '1rem' }}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              style={{
                background: isAnnual ? BRAND_COLORS.gold : BRAND_COLORS.card,
                border: `2px solid ${BRAND_COLORS.gold}`,
                width: '70px',
                height: '40px',
                borderRadius: '20px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: isAnnual ? '37px' : '3px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: isAnnual ? '#000000' : BRAND_COLORS.gold,
                  borderRadius: '18px',
                  transition: 'all 0.3s ease',
                }}
              />
            </button>
            <span style={{ color: isAnnual ? BRAND_COLORS.textPrimary : BRAND_COLORS.textSecondary, fontSize: '1rem' }}>
              Annual
            </span>
            {isAnnual && (
              <div
                style={{
                  background: BRAND_COLORS.gold,
                  color: '#000000',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.3rem',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  marginLeft: '0.5rem',
                }}
              >
                Save 20%
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section style={{ padding: '4rem 2rem', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {plans.map((plan, idx) => (
              <div
                key={idx}
                style={{
                  flex: '1 1 calc(25% - 1.5rem)',
                  minWidth: '280px',
                  maxWidth: '320px',
                  backgroundColor: BRAND_COLORS.card,
                  border: plan.popular ? `2px solid ${BRAND_COLORS.gold}` : `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '0.75rem',
                  padding: '2rem',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: BRAND_COLORS.gold,
                      color: '#000000',
                      padding: '0.4rem 1rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                <p style={{ color: BRAND_COLORS.textSecondary, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: BRAND_COLORS.gold }}>
                      ${getPrice(plan.monthlyPrice)}
                    </span>
                    {isAnnual && (
                      <span style={{ fontSize: '1rem', color: BRAND_COLORS.textSecondary, textDecoration: 'line-through', marginLeft: '0.5rem' }}>
                        ${plan.monthlyPrice * 12}
                      </span>
                    )}
                    <span style={{ fontSize: '0.95rem', color: BRAND_COLORS.textSecondary, marginLeft: '0.3rem' }}>
                      {isAnnual ? '/year' : '/month'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCtaClick(plan.name)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    marginBottom: '2rem',
                    backgroundColor: plan.popular ? BRAND_COLORS.gold : 'transparent',
                    color: plan.popular ? '#000000' : BRAND_COLORS.gold,
                    border: `2px solid ${BRAND_COLORS.gold}`,
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!plan.popular) {
                      e.target.style.backgroundColor = BRAND_COLORS.gold;
                      e.target.style.color = '#000000';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!plan.popular) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = BRAND_COLORS.gold;
                    }
                  }}
                >
                  {plan.cta}
                </button>

                <div style={{ borderTop: `1px solid ${BRAND_COLORS.border}`, paddingTop: '1.5rem' }}>
                  {plan.features.map((feature, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem',
                        color: BRAND_COLORS.textSecondary,
                      }}
                    >
                      <span style={{ color: BRAND_COLORS.green, fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON TABLE */}
      <section style={{ padding: '4rem 2rem', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '3rem', textAlign: 'center' }}>
            Feature Comparison
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.95rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${BRAND_COLORS.border}` }}>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: BRAND_COLORS.textPrimary,
                      fontWeight: 'bold',
                      backgroundColor: BRAND_COLORS.altSection,
                    }}
                  >
                    Feature
                  </th>
                  {['Scout', 'Growth', 'Professional', 'Enterprise'].map((plan) => (
                    <th
                      key={plan}
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: plan === 'Growth' ? BRAND_COLORS.gold : BRAND_COLORS.textPrimary,
                        fontWeight: 'bold',
                        backgroundColor: plan === 'Growth' ? BRAND_COLORS.altSection : BRAND_COLORS.altSection,
                        borderRight: plan === 'Growth' ? `2px solid ${BRAND_COLORS.gold}` : `1px solid ${BRAND_COLORS.border}`,
                        borderLeft: plan === 'Growth' ? `2px solid ${BRAND_COLORS.gold}` : `1px solid ${BRAND_COLORS.border}`,
                      }}
                    >
                      {plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
                    <td
                      style={{
                        padding: '1rem',
                        color: BRAND_COLORS.textPrimary,
                        fontWeight: '500',
                        backgroundColor: BRAND_COLORS.card,
                      }}
                    >
                      {feature.name}
                    </td>
                    {['scout', 'growth', 'professional', 'enterprise'].map((plan) => {
                      const value = feature[plan];
                      const isCheckmark = value === '✓';
                      const isX = value === '✗';
                      return (
                        <td
                          key={plan}
                          style={{
                            padding: '1rem',
                            textAlign: 'center',
                            color: isCheckmark ? BRAND_COLORS.green : isX ? BRAND_COLORS.textSecondary : BRAND_COLORS.textPrimary,
                            fontWeight: isCheckmark ? 'bold' : '500',
                            backgroundColor: plan === 'growth' ? BRAND_COLORS.altSection : 'transparent',
                            borderRight: plan === 'growth' ? `2px solid ${BRAND_COLORS.gold}` : `1px solid ${BRAND_COLORS.border}`,
                            borderLeft: plan === 'growth' ? `2px solid ${BRAND_COLORS.gold}` : `1px solid ${BRAND_COLORS.border}`,
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SPECIAL OFFER BANNER */}
      <section
        style={{
          padding: '2rem',
          background: `linear-gradient(135deg, ${BRAND_COLORS.altSection}, ${BRAND_COLORS.card})`,
          borderTop: `2px solid ${BRAND_COLORS.gold}`,
          borderBottom: `2px solid ${BRAND_COLORS.gold}`,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: BRAND_COLORS.gold }}>
            🔥 Launch Special
          </h3>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            Use code <span style={{ color: BRAND_COLORS.gold, fontWeight: 'bold' }}>LAUNCH30</span> for 30% off your first 3 months
          </p>
          <p style={{ fontSize: '0.9rem', color: BRAND_COLORS.textSecondary }}>
            ✨ 127 teams joined this month
          </p>
        </div>
      </section>

      {/* MONEY-BACK GUARANTEE */}
      <section style={{ padding: '4rem 2rem', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>30-Day Money-Back Guarantee</h2>
          <p style={{ fontSize: '1.1rem', color: BRAND_COLORS.textSecondary, lineHeight: '1.8' }}>
            Try Ecom Era risk-free. If you're not completely satisfied within 30 days, we'll refund every penny. No questions asked.
          </p>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: '4rem 2rem', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '3rem', textAlign: 'center' }}>
            Frequently Asked Questions
          </h2>
          <div>
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '1rem',
                  backgroundColor: BRAND_COLORS.card,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: BRAND_COLORS.textPrimary,
                    fontSize: '1rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = BRAND_COLORS.gold)}
                  onMouseLeave={(e) => (e.target.style.color = BRAND_COLORS.textPrimary)}
                >
                  <span>{item.q}</span>
                  <span
                    style={{
                      fontSize: '1.5rem',
                      transition: 'transform 0.3s ease',
                      transform: expandedFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: BRAND_COLORS.gold,
                    }}
                  >
                    ▼
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div
                    style={{
                      padding: '0 1.5rem 1.5rem 1.5rem',
                      borderTop: `1px solid ${BRAND_COLORS.border}`,
                      color: BRAND_COLORS.textSecondary,
                      lineHeight: '1.6',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPETITOR PRICING COMPARISON */}
      <section style={{ padding: '4rem 2rem', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
            How We Compare
          </h2>
          <p style={{ textAlign: 'center', color: BRAND_COLORS.textSecondary, marginBottom: '3rem', fontSize: '1.1rem' }}>
            Only tool built wholesale-first with team collaboration
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${BRAND_COLORS.border}` }}>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: BRAND_COLORS.textPrimary,
                      fontWeight: 'bold',
                      backgroundColor: BRAND_COLORS.altSection,
                    }}
                  >
                    Tool
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      color: BRAND_COLORS.textPrimary,
                      fontWeight: 'bold',
                      backgroundColor: BRAND_COLORS.altSection,
                    }}
                  >
                    Pricing Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${BRAND_COLORS.border}`,
                      backgroundColor: comp.highlight ? BRAND_COLORS.altSection : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        padding: '1rem',
                        color: comp.highlight ? BRAND_COLORS.gold : BRAND_COLORS.textPrimary,
                        fontWeight: comp.highlight ? '700' : '500',
                      }}
                    >
                      {comp.name}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: comp.highlight ? BRAND_COLORS.gold : BRAND_COLORS.textSecondary,
                        fontWeight: comp.highlight ? '600' : '500',
                      }}
                    >
                      {comp.startPrice} - {comp.endPrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: BRAND_COLORS.altSection,
          borderBottom: `1px solid ${BRAND_COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Start Your Free Trial Today
          </h2>
          <p style={{ color: BRAND_COLORS.textSecondary, marginBottom: '2rem', fontSize: '1.1rem' }}>
            No credit card · 14-day trial · Cancel anytime
          </p>
          <button
            onClick={() => router.push('/signup')}
            style={{
              background: BRAND_COLORS.gold,
              color: '#000000',
              border: 'none',
              padding: '1rem 2.5rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BRAND_COLORS.border}`, padding: '3rem 2rem', backgroundColor: BRAND_COLORS.card }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: BRAND_COLORS.gold }}>ECOM ERA</h4>
              <p style={{ color: BRAND_COLORS.textSecondary, fontSize: '0.9rem', lineHeight: '1.6' }}>
                Wholesale-first FBA software for Amazon sellers.
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Features</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Pricing</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Security</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>About</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Blog</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Contact</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Privacy</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Terms</a>
                </li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BRAND_COLORS.border}`, paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ color: BRAND_COLORS.textSecondary, fontSize: '0.9rem' }}>
              &copy; 2026 Ecom Era. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>Twitter</a>
              <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>LinkedIn</a>
              <a href="#" style={{ color: BRAND_COLORS.textSecondary, textDecoration: 'none' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
