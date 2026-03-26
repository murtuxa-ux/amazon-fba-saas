import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Onboarding() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const STEPS = ['Welcome', 'Organization', 'Team', 'API Setup', 'Complete'];

  const [formData, setFormData] = useState({
    orgName: '',
    marketplace: 'US',
    teamMembers: [{ name: '', email: '', role: 'scout' }],
    keepaApiKey: '',
  });

  const token = () => localStorage.getItem('ecomera_token');
  const authHeader = () => ({ Authorization: `Bearer ${token()}` });

  const handleInputChange = (e, field) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  const handleTeamMemberChange = (index, field, value) => {
    const updated = [...formData.teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, teamMembers: updated });
  };

  const addTeamMember = () => {
    setFormData({
      ...formData,
      teamMembers: [...formData.teamMembers, { name: '', email: '', role: 'scout' }],
    });
  };

  const removeTeamMember = (index) => {
    const updated = formData.teamMembers.filter((_, i) => i !== index);
    setFormData({ ...formData, teamMembers: updated });
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      // Validate current step
      if (currentStep === 1 && !formData.orgName.trim()) {
        setError('Organization name is required');
        return;
      }
      setError(null);
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save organization settings
      const settingsResponse = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_name: formData.orgName,
          marketplace: formData.marketplace,
          keepa_api_key: formData.keepaApiKey || null,
        }),
      });

      if (!settingsResponse.ok) {
        throw new Error('Failed to save settings');
      }

      // Invite team members if any
      if (formData.teamMembers.some(m => m.email.trim())) {
        for (const member of formData.teamMembers) {
          if (member.email.trim()) {
            await fetch(`${API_URL}/team/invite`, {
              method: 'POST',
              headers: {
                ...authHeader(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: member.email,
                name: member.name,
                role: member.role,
              }),
            });
          }
        }
      }

      // Mark user as onboarded
      localStorage.setItem('ecomera_onboarded', 'true');
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
      }}>
        {/* Progress Bar */}
        <div style={{
          marginBottom: '40px',
        }}>
          <div style={{
            height: '4px',
            backgroundColor: '#1E1E1E',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#FFD700',
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#888',
          }}>
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[currentStep]}</span>
          </div>
        </div>

        {/* Card Container */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '12px',
          padding: '40px',
        }}>
          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#1E1E1E',
              border: '1px solid #CD7F32',
              borderRadius: '6px',
              color: '#FFD700',
              marginBottom: '24px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '24px',
              }}>
                👋
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
              }}>
                Welcome to Ecom Era
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#888',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}>
                Let's set up your account and get you ready to manage your FBA wholesale business. This onboarding will take just a few minutes.
              </p>
              <div style={{
                backgroundColor: '#0A0A0A',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#888',
              }}>
                <p style={{ marginBottom: '12px', fontWeight: '600', color: '#FFD700' }}>Here's what we'll cover:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>Organization details</li>
                  <li style={{ marginBottom: '8px' }}>Team member invitations</li>
                  <li style={{ marginBottom: '8px' }}>Optional API setup</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '24px',
              }}>
                Organization Setup
              </h2>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#FFFFFF',
                }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.orgName}
                  onChange={(e) => handleInputChange(e, 'orgName')}
                  placeholder="e.g., My Wholesale Co."
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#FFFFFF',
                }}>
                  Primary Marketplace
                </label>
                <select
                  value={formData.marketplace}
                  onChange={(e) => handleInputChange(e, 'marketplace')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="UK">United Kingdom</option>
                  <option value="EU">European Union</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Team */}
          {currentStep === 2 && (
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '24px',
              }}>
                Invite Team Members
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#888',
                marginBottom: '24px',
              }}>
                Add your team members. You can skip this and invite them later.
              </p>
              {formData.teamMembers.map((member, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Member {index + 1}</span>
                    {index > 0 && (
                      <button
                        onClick={() => removeTeamMember(index)}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#888',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textDecoration: 'underline',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={member.email}
                    onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      marginBottom: '8px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <select
                    value={member.role}
                    onChange={(e) => handleTeamMemberChange(index, 'role', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="scout">Scout</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
              <button
                onClick={addTeamMember}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#FFD700',
                  border: '2px dashed #FFD700',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                + Add Team Member
              </button>
            </div>
          )}

          {/* Step 3: API Setup */}
          {currentStep === 3 && (
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '24px',
              }}>
                API Setup (Optional)
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#888',
                marginBottom: '20px',
              }}>
                Connect your Keepa API key for advanced product research and insights. You can skip this and add it later in settings.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#FFFFFF',
                }}>
                  Keepa API Key
                </label>
                <input
                  type="password"
                  value={formData.keepaApiKey}
                  onChange={(e) => handleInputChange(e, 'keepaApiKey')}
                  placeholder="paste your Keepa API key here"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#888',
              }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  Don't have a Keepa API key? Get one at <strong>keepa.com/en/register</strong>
                </p>
                <p style={{ margin: 0 }}>
                  You can configure this anytime in your account settings.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '56px',
                marginBottom: '24px',
              }}>
                🎉
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
              }}>
                You're All Set!
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#888',
                lineHeight: '1.6',
                marginBottom: '32px',
              }}>
                Your account is ready and you're officially part of Ecom Era. Start managing your wholesale business with AI-powered insights.
              </p>
              <div style={{
                padding: '20px',
                backgroundColor: '#0A0A0A',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '13px',
                color: '#888',
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#FFD700' }}>Next steps:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Check your email for team invitations</li>
                  <li>Explore the dashboard and settings</li>
                  <li>Start scoring your first products</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '40px',
          }}>
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: currentStep === 0 ? '#1E1E1E' : 'transparent',
                color: currentStep === 0 ? '#666' : '#FFFFFF',
                border: `1px solid ${currentStep === 0 ? '#1E1E1E' : '#1E1E1E'}`,
                borderRadius: '6px',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (currentStep > 0) {
                  e.target.style.borderColor = '#FFD700';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#1E1E1E';
              }}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = loading ? '0.6' : '1';
              }}
            >
              {currentStep === STEPS.length - 1
                ? loading ? 'Completing...' : 'Go to Dashboard'
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
