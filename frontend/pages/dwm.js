import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#999999' },
  tabs: { display: 'flex', borderBottom: '1px solid #1E1E1E', marginBottom: '32px', gap: '24px' },
  tab: { padding: '12px 0', fontSize: '14px', cursor: 'pointer', color: '#666666', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#FFD700', borderBottomColor: '#FFD700' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  kpiValue: { fontSize: '28px', fontWeight: '700', color: '#FFD700', marginBottom: '8px' },
  kpiLabel: { fontSize: '12px', color: '#999999', textTransform: 'uppercase', marginBottom: '8px' },
  kpiChange: { fontSize: '12px', fontWeight: '600' },
  card: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '16px' },
  checklistItem: { display: 'flex', alignItems: 'flex-start', marginBottom: '12px', padding: '12px', backgroundColor: '#0A0A0A', borderRadius: '6px' },
  checkbox: { marginRight: '12px', marginTop: '2px', cursor: 'pointer' },
  checklistLabel: { fontSize: '14px', flex: 1 },
  textarea: { width: '100%', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', padding: '12px', color: '#FFFFFF', fontSize: '14px', boxSizing: 'border-box', minHeight: '100px' },
  weekSelector: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  weekButton: { backgroundColor: '#1E1E1E', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' },
  weekDisplay: { fontSize: '14px', fontWeight: '600', minWidth: '200px' },
  editableList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  editableItem: { display: 'flex', gap: '8px', alignItems: 'flex-start' },
  editableInput: { flex: 1, backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', padding: '8px', color: '#FFFFFF', fontSize: '14px' },
  addButton: { backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  removeButton: { backgroundColor: '#F87171', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' },
  button: { backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#0A0A0A', borderBottom: '1px solid #1E1E1E' },
  tableHeaderCell: { padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #1E1E1E' },
  tableCell: { padding: '12px', fontSize: '14px' },
  chartContainer: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' },
  chartTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '16px' },
  chartBar: { display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', justifyContent: 'space-around' },
  bar: { flex: 1, backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' },
  barLabel: { fontSize: '11px', color: '#999999', marginTop: '4px', textAlign: 'center' },
  line: { width: '100%', height: '200px', position: 'relative', marginBottom: '16px' },
  monthSelector: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  monthButton: { backgroundColor: '#1E1E1E', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' },
  monthDisplay: { fontSize: '14px', fontWeight: '600', minWidth: '200px' },
  exportButton: { backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
};

export default function DWMPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyChecklist, setDailyChecklist] = useState([
    { id: 1, label: 'Check inventory levels', completed: true },
    { id: 2, label: 'Review PPC campaigns', completed: false },
    { id: 3, label: 'Respond to customer cases', completed: true },
    { id: 4, label: 'Monitor product ratings', completed: false },
    { id: 5, label: 'Update pricing strategy', completed: false },
    { id: 6, label: 'Process new orders', completed: true },
    { id: 7, label: 'Review competitor activity', completed: false },
    { id: 8, label: 'Analyze keyword performance', completed: false },
    { id: 9, label: 'Update forecasts', completed: true },
    { id: 10, label: 'Generate daily report', completed: false },
  ]);
  const [issuesBlockers, setIssuesBlockers] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [accomplishments, setAccomplishments] = useState(['Launched new product variant', 'Increased ACOS by 15%']);
  const [challenges, setChallenges] = useState(['Supply chain delay', 'Competitor price war']);
  const [nextWeekPriorities, setNextWeekPriorities] = useState(['Scale top products', 'Optimize PPC budget']);
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [newChallenge, setNewChallenge] = useState('');
  const [newPriority, setNewPriority] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('dwm_data');
    if (saved) {
      const data = JSON.parse(saved);
      setDailyChecklist(data.checklist || dailyChecklist);
      setIssuesBlockers(data.issues || '');
      setAccomplishments(data.accomplishments || accomplishments);
      setChallenges(data.challenges || challenges);
      setNextWeekPriorities(data.priorities || nextWeekPriorities);
    }
  };

  const saveToLocalStorage = (key, value) => {
    const current = JSON.parse(localStorage.getItem('dwm_data') || '{}');
    const updatedKey = key === 'checklist' ? 'checklist' : key === 'issues' ? 'issues' : key === 'accomplishments' ? 'accomplishments' : key === 'challenges' ? 'challenges' : 'priorities';
    current[updatedKey] = value;
    localStorage.setItem('dwm_data', JSON.stringify(current));
  };

  const toggleChecklistItem = (id) => {
    const updated = dailyChecklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    setDailyChecklist(updated);
    saveToLocalStorage('checklist', updated);
  };

  const handleIssuesChange = (value) => {
    setIssuesBlockers(value);
    saveToLocalStorage('issues', value);
  };

  const addAccomplishment = () => {
    if (newAccomplishment.trim()) {
      const updated = [...accomplishments, newAccomplishment];
      setAccomplishments(updated);
      setNewAccomplishment('');
      saveToLocalStorage('accomplishments', updated);
    }
  };

  const removeAccomplishment = (index) => {
    const updated = accomplishments.filter((_, i) => i !== index);
    setAccomplishments(updated);
    saveToLocalStorage('accomplishments', updated);
  };

  const addChallenge = () => {
    if (newChallenge.trim()) {
      const updated = [...challenges, newChallenge];
      setChallenges(updated);
      setNewChallenge('');
      saveToLocalStorage('challenges', updated);
    }
  };

  const removeChallenge = (index) => {
    const updated = challenges.filter((_, i) => i !== index);
    setChallenges(updated);
    saveToLocalStorage('challenges', updated);
  };

  const addPriority = () => {
    if (newPriority.trim()) {
      const updated = [...nextWeekPriorities, newPriority];
      setNextWeekPriorities(updated);
      setNewPriority('');
      saveToLocalStorage('priorities', updated);
    }
  };

  const removePriority = (index) => {
    const updated = nextWeekPriorities.filter((_, i) => i !== index);
    setNextWeekPriorities(updated);
    saveToLocalStorage('priorities', updated);
  };

  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`;
  };

  const getMonthYear = (dateStr) => {
    const date = new Date(dateStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrevWeek = () => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - 7);
    setCurrentWeek(date.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + 7);
    setCurrentWeek(date.toISOString().split('T')[0]);
  };

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-');
    let newMonth = parseInt(month) - 1;
    let newYear = parseInt(year);
    if (newMonth === 0) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-');
    let newMonth = parseInt(month) + 1;
    let newYear = parseInt(year);
    if (newMonth === 13) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const renderDailyTab = () => (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$8,540</div>
          <div style={styles.kpiLabel}>Revenue</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 12% vs yesterday</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>234</div>
          <div style={styles.kpiLabel}>Orders</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 8% vs yesterday</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>567</div>
          <div style={styles.kpiLabel}>Units Sold</div>
          <div style={{ ...styles.kpiChange, color: '#F87171' }}>↓ 5% vs yesterday</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$1,240</div>
          <div style={styles.kpiLabel}>Ad Spend</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↓ 3% vs yesterday</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>14.5%</div>
          <div style={styles.kpiLabel}>ACOS</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↓ 0.8% vs yesterday</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Daily Ops Checklist</div>
        <div>
          {Array.isArray(dailyChecklist) ? dailyChecklist.map(item => (
            <div key={item.id} style={styles.checklistItem}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={item.completed}
                onChange={() => toggleChecklistItem(item.id)}
              />
              <label style={{ ...styles.checklistLabel, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#666666' : '#FFFFFF' }}>
                {item.label}
              </label>
            </div>
          )) : null}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Issues & Blockers</div>
        <textarea
          style={styles.textarea}
          value={issuesBlockers}
          onChange={(e) => handleIssuesChange(e.target.value)}
          placeholder="Document any issues or blockers encountered today..."
        />
        <div style={{ fontSize: '11px', color: '#666666', marginTop: '8px' }}>Auto-saves to localStorage</div>
      </div>
    </div>
  );

  const renderWeeklyTab = () => (
    <div>
      <div style={styles.weekSelector}>
        <button style={styles.weekButton} onClick={handlePrevWeek}>← Previous</button>
        <div style={styles.weekDisplay}>Week of {getWeekRange(currentWeek)}</div>
        <button style={styles.weekButton} onClick={handleNextWeek}>Next →</button>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$52,340</div>
          <div style={styles.kpiLabel}>Revenue</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 18% WoW</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>1,820</div>
          <div style={styles.kpiLabel}>Orders</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 14% WoW</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>4,250</div>
          <div style={styles.kpiLabel}>Units</div>
          <div style={{ ...styles.kpiChange, color: '#F87171' }}>↓ 3% WoW</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$8,920</div>
          <div style={styles.kpiLabel}>Ad Spend</div>
          <div style={{ ...styles.kpiChange, color: '#3B82F6' }}>→ 0% WoW</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>17.1%</div>
          <div style={styles.kpiLabel}>ACOS</div>
          <div style={{ ...styles.kpiChange, color: '#10B981' }}>↓ 1.2% WoW</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Accomplishments</div>
        <div style={styles.editableList}>
          {Array.isArray(accomplishments) ? accomplishments.map((item, i) => (
            <div key={i} style={styles.editableItem}>
              <span style={{ flex: 1, padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '4px' }}>{item}</span>
              <button style={styles.removeButton} onClick={() => removeAccomplishment(i)}>Remove</button>
            </div>
          )) : null}
          <div style={styles.editableItem}>
            <input
              style={styles.editableInput}
              type="text"
              value={newAccomplishment}
              onChange={(e) => setNewAccomplishment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAccomplishment()}
              placeholder="Add accomplishment..."
            />
            <button style={styles.addButton} onClick={addAccomplishment}>Add</button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Challenges</div>
        <div style={styles.editableList}>
          {Array.isArray(challenges) ? challenges.map((item, i) => (
            <div key={i} style={styles.editableItem}>
              <span style={{ flex: 1, padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '4px' }}>{item}</span>
              <button style={styles.removeButton} onClick={() => removeChallenge(i)}>Remove</button>
            </div>
          )) : null}
          <div style={styles.editableItem}>
            <input
              style={styles.editableInput}
              type="text"
              value={newChallenge}
              onChange={(e) => setNewChallenge(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addChallenge()}
              placeholder="Add challenge..."
            />
            <button style={styles.addButton} onClick={addChallenge}>Add</button>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Next Week Priorities</div>
        <div style={styles.editableList}>
          {Array.isArray(nextWeekPriorities) ? nextWeekPriorities.map((item, i) => (
            <div key={i} style={styles.editableItem}>
              <span style={{ flex: 1, padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '4px' }}>{item}</span>
              <button style={styles.removeButton} onClick={() => removePriority(i)}>Remove</button>
            </div>
          )) : null}
          <div style={styles.editableItem}>
            <input
              style={styles.editableInput}
              type="text"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPriority()}
              placeholder="Add priority..."
            />
            <button style={styles.addButton} onClick={addPriority}>Add</button>
          </div>
        </div>
      </div>

      <div style={styles.chartContainer}>
        <div style={styles.chartTitle}>Daily Revenue This Week</div>
        <div style={styles.chartBar}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const revenues = [7200, 7800, 8100, 7600, 8400, 9200, 4000];
            return (
              <div key={day} style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: `${(revenues[i] / 9200) * 180}px` }}></div>
                <div style={styles.barLabel}>{day}</div>
                <div style={{ fontSize: '10px', color: '#FFD700', marginTop: '2px' }}>${(revenues[i] / 1000).toFixed(1)}K</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMonthlyTab = () => (
    <div>
      <div style={styles.monthSelector}>
        <button style={styles.monthButton} onClick={handlePrevMonth}>← Previous</button>
        <div style={styles.monthDisplay}>{getMonthYear(currentMonth)}</div>
        <button style={styles.monthButton} onClick={handleNextMonth}>Next →</button>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$145,280</div>
          <div style={styles.kpiLabel}>Revenue</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$58,120</div>
          <div style={styles.kpiLabel}>Profit</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>5,240</div>
          <div style={styles.kpiLabel}>Orders</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>385</div>
          <div style={styles.kpiLabel}>Returns</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>12</div>
          <div style={styles.kpiLabel}>New Products</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiValue}>$24,560</div>
          <div style={styles.kpiLabel}>PPC Spend</div>
        </div>
      </div>

      <div style={styles.chartContainer}>
        <div style={styles.chartTitle}>Daily Revenue Trend</div>
        <div style={styles.chartBar}>
          {Array.from({ length: 30 }, (_, i) => {
            const baseRevenue = 4800;
            const variation = Math.sin((i / 30) * Math.PI) * 2000;
            const revenue = baseRevenue + variation + (Math.random() - 0.5) * 1000;
            return (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: `${(revenue / 7000) * 180}px` }}></div>
                <div style={{ fontSize: '9px', color: '#999999' }}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.chartContainer}>
        <div style={styles.chartTitle}>Category Breakdown</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
          <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: 'conic-gradient(#FFD700 0deg 162deg, #3B82F6 162deg 216deg, #10B981 216deg 270deg, #F87171 270deg 360deg)' }}></div>
        </div>
        <div style={{ fontSize: '12px', marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#FFD700', marginRight: '8px' }}></span> AMIRA: 67%</div>
          <div style={{ marginBottom: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#3B82F6', marginRight: '8px' }}></span> Deck Out: 19%</div>
          <div style={{ marginBottom: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#10B981', marginRight: '8px' }}></span> Other: 11%</div>
          <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#F87171', marginRight: '8px' }}></span> Discontinued: 3%</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Client-by-Client Performance</div>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableHeaderCell}>Client</th>
              <th style={styles.tableHeaderCell}>Revenue</th>
              <th style={styles.tableHeaderCell}>Orders</th>
              <th style={styles.tableHeaderCell}>Profit</th>
              <th style={styles.tableHeaderCell}>ROI</th>
            </tr>
          </thead>
          <tbody>
            <tr style={styles.tableRow}>
              <td style={styles.tableCell}>AMIRA Skincare</td>
              <td style={styles.tableCell}>$97,338</td>
              <td style={styles.tableCell}>3,540</td>
              <td style={styles.tableCell}>$42,108</td>
              <td style={{ ...styles.tableCell, color: '#10B981' }}>43.3%</td>
            </tr>
            <tr style={styles.tableRow}>
              <td style={styles.tableCell}>Deck Out Accessories</td>
              <td style={styles.tableCell}>$45,220</td>
              <td style={styles.tableCell}>1,680</td>
              <td style={styles.tableCell}>$15,024</td>
              <td style={{ ...styles.tableCell, color: '#10B981' }}>33.2%</td>
            </tr>
            <tr style={styles.tableRow}>
              <td style={styles.tableCell}>Other Brands</td>
              <td style={styles.tableCell}>$2,722</td>
              <td style={styles.tableCell}>20</td>
              <td style={{ ...styles.tableCell, color: '#F87171' }}>$988</td>
              <td style={{ ...styles.tableCell, color: '#F87171' }}>36.3%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <button style={styles.exportButton} onClick={() => alert('Export functionality to be implemented with backend')}>
          Export as CSV
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'daily':
        return renderDailyTab();
      case 'weekly':
        return renderWeeklyTab();
      case 'monthly':
        return renderMonthlyTab();
      default:
        return null;
    }
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>DWM Reports</h1>
          <p style={styles.subtitle}>Daily, Weekly, and Monthly performance tracking</p>
        </div>

        <div style={styles.tabs}>
          <div
            style={{ ...styles.tab, ...(activeTab === 'daily' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('daily')}
          >
            Daily Report
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === 'weekly' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('weekly')}
          >
            Weekly Report
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === 'monthly' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly Report
          </div>
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
}
