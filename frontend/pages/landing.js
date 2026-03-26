import React from 'react';

export default function Landing() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

  const handleGetStarted = () => {
    window.location.href = '/signup';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleViewPricing = () => {
    window.location.href = '/pricing';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #1E1E1E',
        backgroundColor: '#0A0A0A',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#FFD700',
          letterSpacing: '2px',
        }}>
          ECOM ERA
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={handleLogin}
            style={{
              padding: '10px 24px',
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              border: '1px solid #1E1E1E',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#FFD700';
              e.target.style.color = '#FFD700';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1E1E1E';
              e.target.style.color = '#FFFFFF';
            }}
          >
            Login
          </button>
          <button
            onClick={handleGetStarted}
            style={{
              padding: '10px 24px',
              backgroundColor: '#FFD700',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '900px' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: '800',
            marginBottom: '24px',
            lineHeight: '1.2',
            color: '#FFFFFF',
          }}>
            Ecom Era FBA <span style={{ color: '#FFD700' }}>Wholesale SaaS</span>
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#888',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '700px',
            margin: '0 auto 40px',
          }}>
            AI-powered Amazon wholesale management platform. Scale your FBA business with intelligent product scoring, team collaboration, and client management.
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleGetStarted}
              style={{
                padding: '14px 32px',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(255, 215, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Get Started Free
            </button>
            <button
              onClick={handleLogin}
              style={{
                padding: '14px 32px',
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                border: '2px solid #FFD700',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#FFD700';
                e.target.style.color = '#0A0A0A';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#FFFFFF';
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '80px 40px',
        backgroundColor: '#111111',
        borderTop: '1px solid #1E1E1E',
        borderBottom: '1px solid #1E1E1E',
      }}>
        <h2 style={{
          fontSize: '40px',
          fontWeight: '700',
          marginBottom: '60px',
          textAlign: 'center',
          color: '#FFFFFF',
        }}>
          Powerful Features
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {/* Feature 1: AI Product Scoring */}
          <div style={{
            padding: '32px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FFD700';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E1E1E';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              🤖
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#FFD700',
            }}>
              AI Product Scoring
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
            }}>
              Intelligent algorithm analyzes products in seconds. Get instant viability scores and profit projections.
            </p>
          </div>

          {/* Feature 2: FBA Scout */}
          <div style={{
            padding: '32px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FFD700';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E1E1E';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              🔍
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#FFD700',
            }}>
              FBA Scout
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
            }}>
              Discover high-potential wholesale opportunities. Filter by niche, profit margins, and market trends.
            </p>
          </div>

          {/* Feature 3: Team Management */}
          <div style={{
            padding: '32px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FFD700';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E1E1E';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              👥
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#FFD700',
            }}>
              Team Management
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
            }}>
              Collaborate with your team in real-time. Assign tasks, track progress, and manage workflows seamlessly.
            </p>
          </div>

          {/* Feature 4: Client Portal */}
          <div style={{
            padding: '32px',
            backgroundColor: '#0A0A0A',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FFD700';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E1E1E';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              💼
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#FFD700',
            }}>
              Client Portal
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.6',
            }}>
              Give clients visibility into their wholesale pipeline. Share reports and track approvals in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{
        padding: '80px 40px',
      }}>
        <h2 style={{
          fontSize: '40px',
          fontWeight: '700',
          marginBottom: '60px',
          textAlign: 'center',
          color: '#FFFFFF',
        }}>
          Flexible Pricing
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {/* Starter Plan */}
          <div style={{
            padding: '40px',
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF',
              }}>
                Starter
              </h3>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#FFD700',
                marginBottom: '24px',
              }}>
                $97<span style={{ fontSize: '16px', color: '#888' }}>/mo</span>
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '32px',
              }}>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Up to 100 products/month
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  AI Product Scoring
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Basic reports
                </li>
              </ul>
            </div>
            <button
              onClick={handleGetStarted}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Get Started
            </button>
          </div>

          {/* Growth Plan */}
          <div style={{
            padding: '40px',
            backgroundColor: '#111111',
            border: '2px solid #FFD700',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transform: 'scale(1.05)',
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '12px',
              }}>
                POPULAR
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF',
              }}>
                Growth
              </h3>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#FFD700',
                marginBottom: '24px',
              }}>
                $197<span style={{ fontSize: '16px', color: '#888' }}>/mo</span>
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '32px',
              }}>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Up to 500 products/month
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Advanced scoring & analytics
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Team collaboration
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Client portal access
                </li>
              </ul>
            </div>
            <button
              onClick={handleGetStarted}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Get Started
            </button>
          </div>

          {/* Enterprise Plan */}
          <div style={{
            padding: '40px',
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF',
              }}>
                Enterprise
              </h3>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#FFD700',
                marginBottom: '24px',
              }}>
                $497<span style={{ fontSize: '16px', color: '#888' }}>/mo</span>
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '32px',
              }}>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Unlimited products
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Custom integrations
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Priority support
                </li>
                <li style={{
                  fontSize: '14px',
                  color: '#888',
                  marginBottom: '12px',
                  paddingLeft: '24px',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  Dedicated account manager
                </li>
              </ul>
            </div>
            <button
              onClick={handleViewPricing}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#FFD700',
                border: '2px solid #FFD700',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px',
        borderTop: '1px solid #1E1E1E',
        textAlign: 'center',
        color: '#888',
        fontSize: '14px',
        backgroundColor: '#0A0A0A',
      }}>
        <div style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#FFD700' }}>
          ECOM ERA
        </div>
        <p>
          AI-powered Amazon wholesale management platform
        </p>
        <p style={{ marginTop: '16px', fontSize: '12px' }}>
          © 2026 Ecom Era. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
