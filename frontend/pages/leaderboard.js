import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  pageTitle: { fontSize: '32px', fontWeight: '600', marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginTop: '32px', marginBottom: '16px', color: '#FFFFFF' },

  // Tabs
  tabContainer: { display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid #1E1E1E', paddingBottom: '16px' },
  tab: (active) => ({
    padding: '8px 16px',
    backgroundColor: active ? 'transparent' : 'transparent',
    color: active ? '#FFD700' : '#AAAAAA',
    border: 'none',
    borderBottom: active ? '2px solid #FFD700' : 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? '600' : '500',
    transition: 'all 0.2s ease'
  }),

  // Podium Section
  podiumContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px', alignItems: 'flex-end' },
  podiumCard: (rank, borderColor) => ({
    backgroundColor: '#111111',
    border: `2px solid ${borderColor}`,
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    transform: rank === 1 ? 'scale(1.05)' : 'scale(1)',
  }),
  podiumRank: (rank) => {
    let bgColor = '#FFD700';
    if (rank === 2) bgColor = '#C0C0C0';
    if (rank === 3) bgColor = '#CD7F32';
    return {
      width: '60px',
      height: '60px',
      margin: '0 auto 16px',
      backgroundColor: bgColor,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      fontWeight: '700',
      color: '#000000',
    };
  },
  podiumName: { fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' },
  podiumRole: { fontSize: '12px', color: '#AAAAAA', marginBottom: '12px' },
  podiumPoints: { fontSize: '24px', fontWeight: '700', color: '#FFD700', marginBottom: '8px' },
  podiumTrend: (isUp) => ({ fontSize: '12px', color: isUp ? '#4ADE80' : '#EF4444', fontWeight: '500' }),

  // Avatar
  avatar: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1E1E1E', border: '2px solid #FFD700', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' },

  // Leaderboard Table
  tableCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1px solid #1E1E1E', fontSize: '12px', fontWeight: '600', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '12px', borderBottom: '1px solid #1E1E1E', fontSize: '14px', color: '#FFFFFF' },
  rankCell: (rank) => {
    let color = '#FFD700';
    if (rank === 2) color = '#C0C0C0';
    if (rank === 3) color = '#CD7F32';
    return { fontWeight: '700', fontSize: '16px', color: rank <= 3 ? color : '#AAAAAA', width: '40px' };
  },
  nameCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  nameAvatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1E1E1E', border: '1px solid #FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  streakCell: (streak) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: streak > 0 ? '#4ADE80' : '#EF4444',
    fontWeight: '600'
  }),

  // Department Comparison Chart
  chartCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#FFFFFF' },

  // Badge Grid
  badgeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px', marginBottom: '32px' },
  badgeCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px', textAlign: 'center' },
  badgeIcon: { width: '60px', height: '60px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', backgroundColor: '#1E1E1E', borderRadius: '50%' },
  badgeLabel: { fontSize: '12px', fontWeight: '600', color: '#AAAAAA', marginTop: '8px' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '32px', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitle: { fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#FFFFFF' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#AAAAAA', fontSize: '24px', cursor: 'pointer' },
  breakdownItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #1E1E1E', fontSize: '14px' },
};

const mockTeamData = [
  { rank: 1, name: 'Murtaza Hussain', role: 'Owner', points: 4850, revenue: '$285.3K', tasks: 156, winRate: '87%', streak: 12, avatar: '👨‍💼', department: 'Management' },
  { rank: 2, name: 'Bilal Ahmed', role: 'Wholesale AM', points: 4230, revenue: '$198.7K', tasks: 142, winRate: '82%', streak: 8, avatar: '👨‍💻', department: 'Wholesale' },
  { rank: 3, name: 'Hussain Khan', role: 'Product Hunter', points: 3980, revenue: '$167.2K', tasks: 128, winRate: '78%', streak: -1, avatar: '🔍', department: 'PL' },
  { rank: 4, name: 'Adnan Malik', role: 'PPC Specialist', points: 3750, revenue: '$142.8K', tasks: 115, winRate: '81%', streak: 5, avatar: '📊', department: 'PPC' },
  { rank: 5, name: 'Areeba Khan', role: 'PL Manager', points: 3620, revenue: '$138.4K', tasks: 108, winRate: '76%', streak: 3, avatar: '👩‍💼', department: 'PL' },
  { rank: 6, name: 'Jawwad Ali', role: 'Operations Lead', points: 3480, revenue: '$125.9K', tasks: 98, winRate: '79%', streak: 6, avatar: '⚙️', department: 'Operations' },
  { rank: 7, name: 'Samir Hassan', role: 'Wholesale Scout', points: 3210, revenue: '$105.6K', tasks: 92, winRate: '75%', streak: 2, avatar: '🎯', department: 'Wholesale' },
  { rank: 8, name: 'Fatima Shah', role: 'Data Analyst', points: 3050, revenue: '$98.2K', tasks: 85, winRate: '77%', streak: 4, avatar: '📈', department: 'Operations' },
];

const badges = [
  { id: 1, name: 'Top Seller', icon: '🏆', unlocked: true, count: 1 },
  { id: 2, name: 'Scout Master', icon: '🎯', unlocked: true, count: 3 },
  { id: 3, name: 'PPC Wizard', icon: '✨', unlocked: true, count: 2 },
  { id: 4, name: 'Revenue King', icon: '👑', unlocked: true, count: 1 },
  { id: 5, name: 'Streak Master', icon: '🔥', unlocked: true, count: 1 },
  { id: 6, name: 'Profit Pioneer', icon: '💰', unlocked: false, count: 0 },
  { id: 7, name: 'Win Machine', icon: '🎪', unlocked: true, count: 2 },
  { id: 8, name: 'Team Player', icon: '🤝', unlocked: true, count: 3 },
  { id: 9, name: 'Consistency Pro', icon: '📊', unlocked: false, count: 0 },
  { id: 10, name: 'Rising Star', icon: '⭐', unlocked: true, count: 1 },
];

const pointBreakdown = {
  scouts: 1200,
  orders: 2100,
  ppcOptimizations: 890,
  tasksCompleted: 450,
  streakBonus: 210,
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('week');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : '';
    setToken(storedToken);
  }, []);

  const departmentScores = [
    { name: 'Wholesale', score: 4230, color: '#FFD700' },
    { name: 'PL', score: 3980, color: '#4ADE80' },
    { name: 'PPC', score: 3750, color: '#3B82F6' },
    { name: 'Operations', score: 3480, color: '#F59E0B' },
  ];

  const maxScore = Math.max(...departmentScores.map(d => d.score));

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Team Leaderboard</h1>

        {/* Timeframe Tabs */}
        <div style={styles.tabContainer}>
          {['week', 'month', 'quarter', 'allTime'].map((tab) => {
            const labels = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', allTime: 'All Time' };
            return (
              <button
                key={tab}
                style={styles.tab(activeTab === tab)}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Top 3 Podium */}
        <div style={styles.podiumContainer}>
          {/* 2nd Place */}
          <div style={styles.podiumCard(2, '#C0C0C0')}>
            <div style={styles.podiumRank(2)}>2</div>
            <div style={styles.avatar}>{mockTeamData[1].avatar}</div>
            <div style={styles.podiumName}>{mockTeamData[1].name}</div>
            <div style={styles.podiumRole}>{mockTeamData[1].role}</div>
            <div style={styles.podiumPoints}>{mockTeamData[1].points.toLocaleString()}</div>
            <div style={styles.podiumTrend(mockTeamData[1].streak > 0)}>
              {mockTeamData[1].streak > 0 ? '📈' : '📉'} {Math.abs(mockTeamData[1].streak)} day streak
            </div>
          </div>

          {/* 1st Place (Center, Larger) */}
          <div style={styles.podiumCard(1, '#FFD700')}>
            <div style={styles.podiumRank(1)}>🥇</div>
            <div style={styles.avatar}>{mockTeamData[0].avatar}</div>
            <div style={styles.podiumName}>{mockTeamData[0].name}</div>
            <div style={styles.podiumRole}>{mockTeamData[0].role}</div>
            <div style={styles.podiumPoints}>{mockTeamData[0].points.toLocaleString()}</div>
            <div style={styles.podiumTrend(mockTeamData[0].streak > 0)}>
              {mockTeamData[0].streak > 0 ? '📈' : '📉'} {Math.abs(mockTeamData[0].streak)} day streak
            </div>
          </div>

          {/* 3rd Place */}
          <div style={styles.podiumCard(3, '#CD7F32')}>
            <div style={styles.podiumRank(3)}>3</div>
            <div style={styles.avatar}>{mockTeamData[2].avatar}</div>
            <div style={styles.podiumName}>{mockTeamData[2].name}</div>
            <div style={styles.podiumRole}>{mockTeamData[2].role}</div>
            <div style={styles.podiumPoints}>{mockTeamData[2].points.toLocaleString()}</div>
            <div style={styles.podiumTrend(mockTeamData[2].streak > 0)}>
              {mockTeamData[2].streak > 0 ? '📈' : '📉'} {Math.abs(mockTeamData[2].streak)} day streak
            </div>
          </div>
        </div>

        {/* Full Leaderboard Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Full Rankings</h2>
          <table style={styles.table}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1E1E1E' }}>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Points</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Win Rate</th>
                <th style={styles.th}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {mockTeamData.map((person, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedPerson(person)}
                  style={{ cursor: 'pointer', ':hover': { backgroundColor: '#1A1A1A' } }}
                >
                  <td style={{ ...styles.td, ...styles.rankCell(person.rank) }}>{person.rank}</td>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={styles.nameAvatar}>{person.avatar}</div>
                      <span>{person.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{person.department}</td>
                  <td style={styles.td}><strong>{person.points.toLocaleString()}</strong></td>
                  <td style={styles.td}>{person.revenue}</td>
                  <td style={styles.td}>{person.tasks}</td>
                  <td style={styles.td}>{person.winRate}</td>
                  <td style={styles.td}>
                    <span style={styles.streakCell(person.streak)}>
                      {person.streak > 0 ? '🔥' : '❄️'} {Math.abs(person.streak)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Department Comparison */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Department Performance Comparison</h3>
          <svg width="100%" height="300" viewBox="0 0 600 300" style={{ backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
            <g>
              {/* Grid lines */}
              {[0, 50, 100, 150, 200, 250].map((y) => (
                <line key={`hline-${y}`} x1="80" y1={y} x2="550" y2={y} stroke="#1E1E1E" strokeWidth="1" />
              ))}

              {/* Bars */}
              {departmentScores.map((dept, i) => {
                const barWidth = 80;
                const x = 100 + i * 120;
                const barHeight = (dept.score / maxScore) * 250;
                const y = 250 - barHeight;
                return (
                  <g key={`dept-${i}`}>
                    <rect x={x} y={y} width={barWidth} height={barHeight} fill={dept.color} opacity="0.8" rx="4" />
                    <text x={x + barWidth / 2} y="280" fontSize="13" fontWeight="600" fill="#FFFFFF" textAnchor="middle">{dept.name}</text>
                    <text x={x + barWidth / 2} y={y - 8} fontSize="14" fontWeight="700" fill={dept.color} textAnchor="middle">{dept.score}</text>
                  </g>
                );
              })}

              {/* Y-axis */}
              <line x1="80" y1="0" x2="80" y2="250" stroke="#1E1E1E" strokeWidth="1" />
              <line x1="80" y1="250" x2="550" y2="250" stroke="#1E1E1E" strokeWidth="1" />

              {/* Y-axis labels */}
              {[0, 1000, 2000, 3000, 4000].map((val, idx) => (
                <g key={`yaxis-${idx}`}>
                  <text x="65" y={250 - (val / maxScore) * 250 + 5} fontSize="11" fill="#AAAAAA" textAnchor="end">{val}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Achievement Badges */}
        <h2 style={styles.sectionTitle}>Achievement Badges</h2>
        <div style={styles.badgeGrid}>
          {badges.map((badge) => (
            <div key={badge.id} style={{ ...styles.badgeCard, opacity: badge.unlocked ? 1 : 0.4 }}>
              <div style={styles.badgeIcon}>{badge.icon}</div>
              <div style={styles.badgeLabel}>{badge.name}</div>
              {badge.count > 0 && <div style={{ fontSize: '11px', color: '#FFD700', marginTop: '4px', fontWeight: '700' }}>×{badge.count}</div>}
            </div>
          ))}
        </div>

        {/* Modal for Points Breakdown */}
        {selectedPerson && (
          <div style={styles.modalOverlay} onClick={() => setSelectedPerson(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeBtn} onClick={() => setSelectedPerson(null)}>✕</button>
              <h2 style={styles.modalTitle}>
                <span style={{ marginRight: '8px' }}>{selectedPerson.avatar}</span>
                {selectedPerson.name}
              </h2>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#AAAAAA', marginBottom: '4px' }}>{selectedPerson.role}</div>
                <div style={{ fontSize: '13px', color: '#AAAAAA', marginBottom: '12px' }}>{selectedPerson.department}</div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#FFFFFF' }}>Points Breakdown</h3>
              <div style={{ ...styles.breakdownItem, borderTop: '1px solid #1E1E1E', paddingTop: '16px' }}>
                <span>Scout Finds</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>1,200</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>Orders Closed</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>2,100</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>PPC Optimizations</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>890</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>Tasks Completed</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>450</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>Streak Bonus</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>210</span>
              </div>
              <div style={{ ...styles.breakdownItem, backgroundColor: '#1E1E1E', borderBottom: 'none', marginTop: '8px', fontWeight: '700' }}>
                <span>Total Points</span>
                <span style={{ color: '#FFD700', fontSize: '16px' }}>{selectedPerson.points.toLocaleString()}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '24px', marginBottom: '12px', color: '#FFFFFF' }}>Statistics</h3>
              <div style={styles.breakdownItem}>
                <span>Revenue Generated</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>{selectedPerson.revenue}</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>Win Rate</span>
                <span style={{ fontWeight: '700', color: '#FFD700' }}>{selectedPerson.winRate}</span>
              </div>
              <div style={styles.breakdownItem}>
                <span>Current Streak</span>
                <span style={{ fontWeight: '700', color: selectedPerson.streak > 0 ? '#4ADE80' : '#EF4444' }}>
                  {selectedPerson.streak > 0 ? '🔥' : '❄️'} {Math.abs(selectedPerson.streak)} days
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '24px', marginBottom: '12px', color: '#FFFFFF' }}>Badges Earned</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 7, 10].map((badgeId) => {
                  const badge = badges.find(b => b.id === badgeId);
                  return badge ? (
                    <div key={badgeId} style={{ fontSize: '24px', cursor: 'pointer', opacity: 0.9 }}>{badge.icon}</div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
