import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function Leaderboard() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('ecomera_token');
  const authHeader = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/leaderboard`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      setLeaders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#FFFFFF';
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Sidebar />

      <main style={{
        flex: 1,
        padding: '40px',
        overflowY: 'auto',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {/* Header */}
          <div style={{
            marginBottom: '40px',
          }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#FFFFFF',
            }}>
              Manager Leaderboard
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#888',
            }}>
              Top performing managers ranked by score. Score = (Approved × 2) + (Purchased × 5) + (Profitable Weeks × 10)
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#888',
            }}>
              Loading leaderboard...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              padding: '20px',
              backgroundColor: '#1E1E1E',
              border: '1px solid #CD7F32',
              borderRadius: '8px',
              color: '#888',
              marginBottom: '20px',
            }}>
              Error: {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && leaders.length === 0 && !error && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              color: '#888',
            }}>
              No leaderboard data available yet.
            </div>
          )}

          {/* Leaderboard Table */}
          {!loading && leaders.length > 0 && (
            <div style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#0A0A0A',
                    borderBottom: '1px solid #1E1E1E',
                  }}>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Rank
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Manager Name
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Approved
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Purchased
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Profitable Weeks
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Revenue
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Profit
                    </th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#FFD700',
                    }}>
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((leader, index) => {
                    const rank = index + 1;
                    const medalColor = getMedalColor(rank);
                    const medalEmoji = getMedalEmoji(rank);
                    const score = (leader.approved * 2) + (leader.purchased * 5) + (leader.profitable_weeks * 10);

                    return (
                      <tr
                        key={leader.id}
                        style={{
                          borderBottom: '1px solid #1E1E1E',
                          backgroundColor: rank <= 3 ? `${medalColor}15` : '#0A0A0A',
                        }}
                      >
                        <td style={{
                          padding: '16px',
                          fontWeight: '700',
                          color: medalColor,
                        }}>
                          {medalEmoji && <span style={{ marginRight: '8px' }}>{medalEmoji}</span>}
                          #{rank}
                        </td>
                        <td style={{
                          padding: '16px',
                          color: '#FFFFFF',
                        }}>
                          {leader.name}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#888',
                        }}>
                          {leader.approved}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#888',
                        }}>
                          {leader.purchased}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#888',
                        }}>
                          {leader.profitable_weeks}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#888',
                        }}>
                          ${(leader.revenue || 0).toLocaleString()}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#88FF88',
                          fontWeight: '600',
                        }}>
                          ${(leader.profit || 0).toLocaleString()}
                        </td>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: medalColor,
                        }}>
                          {score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Score Formula Info */}
          <div style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#888',
            lineHeight: '1.6',
          }}>
            <strong style={{ color: '#FFD700' }}>Scoring Formula:</strong><br />
            Score = (Approved × 2) + (Purchased × 5) + (Profitable Weeks × 10)
          </div>
        </div>
      </main>
    </div>
  );
}
