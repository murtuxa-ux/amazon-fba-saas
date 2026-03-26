import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const COLORS = {
  darkBg: '#0A0A0A',
  darkCard1: '#111111',
  darkCard2: '#0D0D1A',
  gold: '#FFD700',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#1E1E1E',
};

export default function EcomEraLandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [statCounters, setStatCounters] = useState({
    teams: 0,
    products: 0,
    roi: 0,
    rating: 0,
  });

  // Scroll-based stat counter animation
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero-stats');
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setStatCounters({
            teams: 500,
            products: 2000000,
            roi: 35,
            rating: 4.9,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (path) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const faqItems = [
    {
      q: 'Is there a free trial?',
      a: 'Yes! 14-day free trial with full access to all features. No credit card required.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Absolutely. Cancel with one click, no questions asked.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'Visa, Mastercard, AMEX, and PayPal.',
    },
    {
      q: 'Do you offer refunds?',
      a: 'Yes, 30-day money-back guarantee if you\'re not satisfied.',
    },
    {
      q: 'How many team members can I add?',
      a: 'Depends on your plan. Scout: 1 user, Growth: 5, Professional: 15, Enterprise: unlimited.',
    },
    {
      q: 'Do you integrate with Amazon SP-API?',
      a: 'SP-API integration is coming in Q3 2026. Currently we use Keepa for real-time Amazon data.',
    },
  ];

  const pricingTiers = [
    {
      name: 'Scout',
      price: annualBilling ? 232 : 29,
      period: annualBilling ? '/year' : '/mo',
      description: 'For solo sellers getting started',
      features: ['1 User', 'Basic Product Scouting', 'Weekly Reports', 'Email Support'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Growth',
      price: annualBilling ? 632 : 79,
      period: annualBilling ? '/year' : '/mo',
      description: 'For growing wholesale businesses',
      features: ['5 Users', 'AI Analytics', 'Supplier Management', 'Priority Support'],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Professional',
      price: annualBilling ? 1192 : 149,
      period: annualBilling ? '/year' : '/mo',
      description: 'For established teams',
      features: ['15 Users', 'Advanced Analytics', 'Custom Reports', '24/7 Support'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Enterprise',
      price: annualBilling ? 2392 : 299,
      period: annualBilling ? '/year' : '/mo',
      description: 'For large-scale operations',
      features: ['Unlimited Users', 'White-label', 'API Access', 'Dedicated Manager'],
      cta: 'Contact Sales',
    },
  ];

  const features = [
    {
      emoji: '🔍',
      title: 'AI Product Scout',
      description: 'Scan thousands of ASINs in seconds. Our AI scores every product on profitability, competition, and risk.',
    },
    {
      emoji: '📊',
      title: 'Smart Analytics',
      description: 'Real-time dashboards showing ROI, BSR trends, market shifts, and profit margins at a glance.',
    },
    {
      emoji: '👥',
      title: 'Team Collaboration',
      description: 'Built for wholesale teams. Role-based access, task assignment, and performance leaderboards.',
    },
    {
      emoji: '🏭',
      title: 'Supplier Management',
      description: 'Track supplier relationships, approval rates, response times, and priority scores.',
    },
    {
      emoji: '💰',
      title: 'Pricing Optimizer',
      description: 'AI-driven price recommendations. Know exactly when to buy and at what margin.',
    },
    {
      emoji: '📈',
      title: 'Market Intelligence',
      description: 'Category analysis, competitor tracking, and trend forecasting powered by real Keepa data.',
    },
    {
      emoji: '📋',
      title: 'Automated Reports',
      description: 'Weekly, monthly, and executive reports generated automatically. Export to CSV or PDF.',
    },
    {
      emoji: '🔔',
      title: 'Smart Alerts',
      description: 'Price drops, BSR changes, new opportunities — get notified before your competition.',
    },
    {
      emoji: '🛡️',
      title: 'Risk Analyzer',
      description: 'Identify high-risk products before buying. IP issues, review manipulation, and seasonal volatility detection.',
    },
  ];

  const testimonials = [
    {
      text: 'Ecom Era cut our product research time from 8 hours to 30 minutes. We went from analyzing 50 products a week to 500.',
      author: 'Ahmed K.',
      role: 'FBA Wholesale Manager',
      initials: 'AK',
    },
    {
      text: 'The AI scoring is incredible. Our hit rate went from 20% to 65% within the first month. Best investment we\'ve made.',
      author: 'Sarah M.',
      role: 'Account Manager',
      initials: 'SM',
    },
    {
      text: 'Finally a tool built FOR wholesale teams, not adapted from private label. The team features alone are worth the price.',
      author: 'James R.',
      role: 'Operations Director',
      initials: 'JR',
    },
  ];

  const comparisonData = [
    { feature: 'Wholesale-First', ecomEra: true, helium: false, jungle: false, seller: false },
    { feature: 'Bulk Price List Analysis', ecomEra: true, helium: false, jungle: false, seller: false },
    { feature: 'Team Collaboration', ecomEra: true, helium: true, jungle: false, seller: false },
    { feature: 'AI Product Scoring', ecomEra: true, helium: true, jungle: true, seller: true },
    { feature: 'Supplier Management', ecomEra: true, helium: false, jungle: false, seller: false },
    { feature: 'Buy Box Tracking', ecomEra: true, helium: true, jungle: true, seller: true },
  ];

  return (
    <div style={{ backgroundColor: COLORS.darkBg, color: COLORS.textPrimary, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navigation Bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: `${COLORS.darkBg}dd`,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '1rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: COLORS.gold,
              cursor: 'pointer',
              letterSpacing: '2px',
            }}
            onClick={() => handleNavigation('/')}
          >
            ECOM ERA
          </div>

          {/* Desktop Navigation Links */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
            }}
          >
            <a href="#features" style={{ color: COLORS.textSecondary, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}>Features</a>
            <a href="#pricing" style={{ color: COLORS.textSecondary, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}>Pricing</a>
            <a href="#testimonials" style={{ color: COLORS.textSecondary, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}>Testimonials</a>
            <a href="#faq" style={{ color: COLORS.textSecondary, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.3s' }}>FAQ</a>
          </div>

          {/* Desktop Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => handleNavigation('/login')}
              style={{
                backgroundColor: 'transparent',
                color: COLORS.textSecondary,
                border: `1px solid ${COLORS.border}`,
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.95rem',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = COLORS.gold;
                e.target.style.borderColor = COLORS.gold;
              }}
              onMouseLeave={(e) => {
                e.target.style.color = COLORS.textSecondary;
                e.target.style.borderColor = COLORS.border;
              }}
            >
              Login
            </button>
            <button
              onClick={() => handleNavigation('/signup')}
              style={{
                backgroundColor: COLORS.gold,
                color: '#000',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.95rem',
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          background: `linear-gradient(135deg, ${COLORS.darkBg} 0%, ${COLORS.darkCard2} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient Orbs Background */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: `radial-gradient(circle, ${COLORS.blue}15 0%, transparent 70%)`,
            borderRadius: '50%',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '400px',
            height: '400px',
            background: `radial-gradient(circle, ${COLORS.gold}10 0%, transparent 70%)`,
            borderRadius: '50%',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: COLORS.darkCard1,
              border: `1px solid ${COLORS.gold}`,
              borderRadius: '20px',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              color: COLORS.gold,
            }}
          >
            🏆 #1 Amazon FBA Wholesale Tool
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              lineHeight: '1.2',
              fontWeight: '700',
              marginBottom: '1.5rem',
              color: COLORS.textPrimary,
            }}
          >
            Scale Your Amazon Wholesale Business with AI-Powered Intelligence
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.3rem)',
              color: COLORS.textSecondary,
              lineHeight: '1.6',
              marginBottom: '2.5rem',
              maxWidth: '800px',
              margin: '0 auto 2.5rem',
            }}
          >
            The all-in-one platform trusted by 500+ wholesale teams to find winning products, manage suppliers, and maximize ROI — 10x faster than manual research.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginBottom: '4rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => handleNavigation('/signup')}
              style={{
                backgroundColor: COLORS.gold,
                color: '#000',
                border: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 10px 30px ${COLORS.gold}40`;
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Start Free 14-Day Trial
            </button>
            <button
              style={{
                backgroundColor: 'transparent',
                color: COLORS.gold,
                border: `2px solid ${COLORS.gold}`,
                padding: '1rem 2.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = `${COLORS.gold}15`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Watch Demo
            </button>
          </div>

          {/* Stats Row */}
          <div
            id="hero-stats"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '2rem',
              padding: '2rem',
              backgroundColor: `${COLORS.darkCard1}40`,
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: COLORS.gold }}>{statCounters.teams}+</div>
              <div style={{ fontSize: '0.9rem', color: COLORS.textSecondary, marginTop: '0.5rem' }}>Teams</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: COLORS.blue }}>
                {(statCounters.products / 1000000).toFixed(1)}M+
              </div>
              <div style={{ fontSize: '0.9rem', color: COLORS.textSecondary, marginTop: '0.5rem' }}>Products Analyzed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: COLORS.green }}>{statCounters.roi}%</div>
              <div style={{ fontSize: '0.9rem', color: COLORS.textSecondary, marginTop: '0.5rem' }}>Avg ROI Increase</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: COLORS.gold }}>{statCounters.rating}</div>
              <div style={{ fontSize: '0.9rem', color: COLORS.textSecondary, marginTop: '0.5rem' }}>Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section
        style={{
          padding: '4rem 2rem',
          backgroundColor: COLORS.darkCard1,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, marginBottom: '3rem', fontSize: '1.1rem' }}>
            Trusted by wholesale teams worldwide
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '2rem',
              textAlign: 'center',
            }}
          >
            {['Amazon FBA Co.', 'WholesalePro', 'BulkSmart', 'SupplyChain Plus', 'FBA Empire', 'Wholesale Kings'].map((brand, idx) => (
              <div
                key={idx}
                style={{
                  color: COLORS.textSecondary,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  opacity: '0.6',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '1';
                  e.target.style.color = COLORS.gold;
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '0.6';
                  e.target.style.color = COLORS.textSecondary;
                }}
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkBg,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '1rem',
              color: COLORS.textPrimary,
            }}
          >
            Powerful Features Built for Wholesale
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: COLORS.textSecondary,
              marginBottom: '4rem',
              fontSize: '1.1rem',
              maxWidth: '600px',
              margin: '0 auto 4rem',
            }}
          >
            Everything you need to discover profitable products and scale your wholesale business
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? COLORS.darkCard1 : COLORS.darkCard2,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  padding: '2rem',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.gold;
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 10px 30px ${COLORS.gold}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.emoji}</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.8rem', color: COLORS.textPrimary }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.95rem', color: COLORS.textSecondary, lineHeight: '1.6' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkCard1,
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '4rem',
              color: COLORS.textPrimary,
            }}
          >
            How It Works
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '3rem',
              maxWidth: '1000px',
              margin: '0 auto',
            }}
          >
            {[
              {
                step: 1,
                title: 'Upload Your Price List',
                description: 'Drop your supplier spreadsheet and our AI matches UPCs to ASINs instantly.',
              },
              {
                step: 2,
                title: 'AI Analyzes Every Product',
                description: 'Get profitability scores, competition analysis, and risk levels in seconds.',
              },
              {
                step: 3,
                title: 'Make Winning Decisions',
                description: 'Buy with confidence. Track inventory, monitor prices, and maximize ROI.',
              },
            ].map((item, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: `3px solid ${COLORS.gold}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: COLORS.gold,
                    margin: '0 auto 1.5rem',
                    backgroundColor: `${COLORS.gold}10`,
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1rem', color: COLORS.textPrimary }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.95rem', color: COLORS.textSecondary, lineHeight: '1.6' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkBg,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '1rem',
              color: COLORS.textPrimary,
            }}
          >
            Trusted by Wholesale Teams
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: COLORS.textSecondary,
              marginBottom: '4rem',
              fontSize: '1.1rem',
              maxWidth: '600px',
              margin: '0 auto 4rem',
            }}
          >
            See what our customers have to say about transforming their wholesale business
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: COLORS.darkCard1,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  padding: '2rem',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.gold;
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  {'⭐'.repeat(5)}
                </div>
                <p style={{ fontSize: '1rem', color: COLORS.textPrimary, lineHeight: '1.7', marginBottom: '1.5rem' }}>
                  "{testimonial.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: COLORS.gold,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                    }}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: COLORS.textPrimary }}>
                      {testimonial.author}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: COLORS.textSecondary }}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkCard1,
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '4rem',
              color: COLORS.textPrimary,
            }}
          >
            Why Ecom Era vs The Competition
          </h2>

          <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: COLORS.darkBg,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: '1.5rem', textAlign: 'left', color: COLORS.textPrimary, fontWeight: '600' }}>
                    Feature
                  </th>
                  <th
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: COLORS.gold,
                      fontWeight: '600',
                      borderLeft: `3px solid ${COLORS.gold}`,
                    }}
                  >
                    Ecom Era
                  </th>
                  <th style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textSecondary, fontWeight: '600' }}>
                    Helium 10
                  </th>
                  <th style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textSecondary, fontWeight: '600' }}>
                    Jungle Scout
                  </th>
                  <th style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textSecondary, fontWeight: '600' }}>
                    Seller Assistant
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${COLORS.border}`,
                      backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.darkCard2}50`,
                    }}
                  >
                    <td style={{ padding: '1.5rem', color: COLORS.textPrimary, fontWeight: '500' }}>
                      {row.feature}
                    </td>
                    <td style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.green, borderLeft: `3px solid ${COLORS.gold}` }}>
                      {row.ecomEra ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '1.5rem', textAlign: 'center', color: row.helium ? COLORS.green : COLORS.red }}>
                      {row.helium ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '1.5rem', textAlign: 'center', color: row.jungle ? COLORS.green : COLORS.red }}>
                      {row.jungle ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '1.5rem', textAlign: 'center', color: row.seller ? COLORS.green : COLORS.red }}>
                      {row.seller ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkBg,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '2rem',
              color: COLORS.textPrimary,
            }}
          >
            Simple, Transparent Pricing
          </h2>

          {/* Billing Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1.5rem',
              marginBottom: '4rem',
            }}
          >
            <span style={{ color: !annualBilling ? COLORS.textPrimary : COLORS.textSecondary }}>
              Monthly
            </span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              style={{
                backgroundColor: annualBilling ? COLORS.gold : COLORS.darkCard1,
                border: 'none',
                width: '50px',
                height: '28px',
                borderRadius: '14px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  backgroundColor: annualBilling ? '#000' : COLORS.gold,
                  borderRadius: '50%',
                  top: '2px',
                  left: annualBilling ? '24px' : '2px',
                  transition: 'all 0.3s',
                }}
              />
            </button>
            <span style={{ color: annualBilling ? COLORS.textPrimary : COLORS.textSecondary }}>
              Annual <span style={{ color: COLORS.green }}>Save 20%</span>
            </span>
          </div>

          {/* Pricing Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto',
            }}
          >
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: tier.popular ? `${COLORS.gold}10` : COLORS.darkCard1,
                  border: `2px solid ${tier.popular ? COLORS.gold : COLORS.border}`,
                  borderRadius: '12px',
                  padding: '2rem',
                  position: 'relative',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 15px 40px ${COLORS.gold}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {tier.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: COLORS.gold,
                      color: '#000',
                      padding: '0.4rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}

                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: COLORS.textPrimary }}>
                  {tier.name}
                </h3>
                <p style={{ color: COLORS.textSecondary, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  {tier.description}
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '700', color: COLORS.gold }}>
                    ${tier.price}
                  </span>
                  <span style={{ color: COLORS.textSecondary, marginLeft: '0.5rem' }}>
                    {tier.period}
                  </span>
                </div>

                <button
                  onClick={() => handleNavigation('/signup')}
                  style={{
                    width: '100%',
                    backgroundColor: tier.popular ? COLORS.gold : 'transparent',
                    color: tier.popular ? '#000' : COLORS.gold,
                    border: `2px solid ${COLORS.gold}`,
                    padding: '0.8rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    transition: 'all 0.3s',
                    fontSize: '0.95rem',
                  }}
                  onMouseEnter={(e) => {
                    if (!tier.popular) {
                      e.target.style.backgroundColor = `${COLORS.gold}15`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!tier.popular) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {tier.cta}
                </button>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tier.features.map((feature, fidx) => (
                    <li
                      key={fidx}
                      style={{
                        padding: '0.5rem 0',
                        color: COLORS.textSecondary,
                        fontSize: '0.9rem',
                        borderBottom: fidx < tier.features.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                      }}
                    >
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <a
              href="#pricing"
              style={{
                color: COLORS.gold,
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.8';
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
                e.target.style.textDecoration = 'none';
              }}
            >
              View full feature comparison →
            </a>
          </div>
        </div>
      </section>

      {/* Limited Time Offer */}
      <section
        style={{
          padding: '3rem 2rem',
          background: `linear-gradient(135deg, ${COLORS.gold}20 0%, ${COLORS.blue}10 100%)`,
          borderTop: `2px solid ${COLORS.gold}`,
          borderBottom: `2px solid ${COLORS.gold}`,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem', color: COLORS.gold }}>
            🔥 Launch Special: Get 30% off your first 3 months with code LAUNCH30
          </h3>
          <p style={{ color: COLORS.textSecondary, fontSize: '1rem' }}>
            Offer ends soon — 127 teams joined this month
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkBg,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '4rem',
              color: COLORS.textPrimary,
            }}
          >
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: expandedFAQ === idx ? COLORS.darkCard1 : 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  transition: 'all 0.3s',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  style={{
                    width: '100%',
                    padding: '1.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: COLORS.textPrimary,
                    fontSize: '1rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = COLORS.gold;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = COLORS.textPrimary;
                  }}
                >
                  {item.q}
                  <span
                    style={{
                      transform: expandedFAQ === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                      fontSize: '1.2rem',
                    }}
                  >
                    ▼
                  </span>
                </button>

                {expandedFAQ === idx && (
                  <div
                    style={{
                      padding: '0 1.5rem 1.5rem',
                      color: COLORS.textSecondary,
                      lineHeight: '1.7',
                      borderTop: `1px solid ${COLORS.border}`,
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

      {/* Final CTA Section */}
      <section
        style={{
          padding: '5rem 2rem',
          backgroundColor: COLORS.darkCard1,
          textAlign: 'center',
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: COLORS.textPrimary,
            }}
          >
            Ready to 10x Your Wholesale Business?
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              color: COLORS.textSecondary,
              marginBottom: '2rem',
              lineHeight: '1.6',
            }}
          >
            Join 500+ teams already using Ecom Era to find winning products faster.
          </p>

          <button
            onClick={() => handleNavigation('/signup')}
            style={{
              backgroundColor: COLORS.gold,
              color: '#000',
              border: 'none',
              padding: '1.2rem 3rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              marginBottom: '2rem',
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = `0 15px 40px ${COLORS.gold}40`;
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Start Free 14-Day Trial
          </button>

          <p style={{ color: COLORS.textSecondary, fontSize: '0.95rem' }}>
            No credit card required · Cancel anytime · 30-day money-back guarantee
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: COLORS.darkBg,
          borderTop: `1px solid ${COLORS.border}`,
          padding: '3rem 2rem',
          color: COLORS.textSecondary,
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand Column */}
          <div>
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: COLORS.gold,
                marginBottom: '0.5rem',
                letterSpacing: '1px',
              }}
            >
              ECOM ERA
            </div>
            <p style={{ fontSize: '0.9rem', color: COLORS.textSecondary }}>
              AI-powered wholesale platform for Amazon FBA teams
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{ color: COLORS.textPrimary, marginBottom: '1rem', fontWeight: '600' }}>Product</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#features" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Features</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#pricing" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Pricing</a>
              </li>
              <li>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Blog</a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 style={{ color: COLORS.textPrimary, marginBottom: '1rem', fontWeight: '600' }}>Support</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Help Center</a>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Contact</a>
              </li>
              <li>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Status</a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 style={{ color: COLORS.textPrimary, marginBottom: '1rem', fontWeight: '600' }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Privacy Policy</a>
              </li>
              <li>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 style={{ color: COLORS.textPrimary, marginBottom: '1rem', fontWeight: '600' }}>Follow</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>Twitter</a>
              </li>
              <li>
                <a href="#" style={{ color: COLORS.textSecondary, textDecoration: 'none' }}>LinkedIn</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: '2rem',
            textAlign: 'center',
            color: COLORS.textSecondary,
            fontSize: '0.9rem',
          }}
        >
          © 2026 Ecom Era. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
