import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function PPCAdvanced() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [searchTerms, setSearchTerms] = useState([]);
  const [budgetPacing, setBudgetPacing] = useState([]);
  const [daypartSchedule, setDaypartSchedule] = useState([]);
  const [campaignBuilder, setCampaignBuilder] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    minClicks: 0,
    minSpend: 0,
    isolationStatus: ''
  });
  const [asin, setAsin] = useState('');
  const [keywords, setKeywords] = useState('');
  const [builderOptions, setBuilderOptions] = useState({
    exact: true,
    phrase: true,
    broad: true
  });

  // Fetch campaigns
  useEffect(() => {
    fetchCampaigns();
  }, [filters]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: 'default',
        ...(filters.type && { campaign_type: filters.type }),
        ...(filters.status && { status: filters.status })
      });
      const res = await fetch(`/api/ppc-advanced/campaigns?${params}`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchTerms = async (campaignId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: 'default',
        ...(campaignId && { campaign_id: campaignId }),
        min_clicks: filters.minClicks,
        min_spend: filters.minSpend,
        ...(filters.isolationStatus && { isolation_status: filters.isolationStatus })
      });
      const res = await fetch(`/api/ppc-advanced/search-terms?${params}`);
      const data = await res.json();
      setSearchTerms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching search terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetPacing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ppc-advanced/budget-pacing?client_id=default');
      const data = await res.json();
      setBudgetPacing(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching budget pacing:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDaypartSchedule = async (campaignId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ppc-advanced/campaigns/${campaignId}/daypart`);
      const data = await res.json();
      setDaypartSchedule(data || []);
    } catch (err) {
      console.error('Error fetching daypart schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const runIsolationAnalysis = async (campaignId) => {
    try {
      const res = await fetch('/api/ppc-advanced/search-terms/isolate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          min_clicks: 5,
          high_acos_threshold: 0.30,
          low_acos_threshold: 0.15
        })
      });
      const data = await res.json();
      alert(`Isolation Complete:\nHarvested: ${data.analysis.harvested.length}\nNegated: ${data.analysis.negated.length}\nMonitored: ${data.analysis.monitored.length}`);
      await fetchSearchTerms(campaignId);
    } catch (err) {
      console.error('Error running isolation analysis:', err);
    }
  };

  const generateCampaignStructure = async () => {
    try {
      const seedKeywords = keywords.split('\n').map(k => k.trim()).filter(k => k);
      if (!asin || seedKeywords.length === 0) {
        alert('Please provide ASIN and keywords');
        return;
      }
      const res = await fetch('/api/ppc-advanced/campaign-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_asin: asin,
          structure_name: `${asin} Structure`,
          seed_keywords: seedKeywords,
          include_exact: builderOptions.exact,
          include_phrase: builderOptions.phrase,
          include_broad: builderOptions.broad
        })
      });
      const data = await res.json();
      setCampaignBuilder(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error generating structure:', err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'campaigns') fetchCampaigns();
    else if (tab === 'searchTerms' && selectedCampaignId) fetchSearchTerms(selectedCampaignId);
    else if (tab === 'budgetPacing') fetchBudgetPacing();
    else if (tab === 'dayparting' && selectedCampaignId) fetchDaypartSchedule(selectedCampaignId);
  };

  const saveDaypartSchedule = async (campaignId, updatedSchedule) => {
    try {
      await fetch(`/api/ppc-advanced/campaigns/${campaignId}/daypart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchedule)
      });
      alert('Daypart schedule saved!');
      await fetchDaypartSchedule(campaignId);
    } catch (err) {
      console.error('Error saving daypart schedule:', err);
    }
  };

  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF'
  };

  const mainStyle = {
    flex: 1,
    padding: '32px',
    marginLeft: '280px',
    overflow: 'auto'
  };

  const headerStyle = {
    marginBottom: '32px'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#FFFFFF'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#999999'
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    borderBottom: '1px solid #1E1E1E',
    paddingBottom: '16px'
  };

  const tabStyle = (isActive) => ({
    padding: '10px 16px',
    borderRadius: '6px',
    backgroundColor: isActive ? '#FFD700' : 'transparent',
    color: isActive ? '#0A0A0A' : '#CCCCCC',
    border: 'none',
    cursor: 'pointer',
    fontWeight: isActive ? '600' : '400',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  });

  const cardStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  };

  const headerCellStyle = {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #1E1E1E',
    color: '#FFD700',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 215, 0, 0.05)'
  };

  const cellStyle = {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    color: '#CCCCCC'
  };

  const badgeStyle = (status) => {
    const colors = {
      'SP': '#FFD700',
      'SB': '#00AA88',
      'SD': '#FF6B6B',
      'enabled': '#00AA88',
      'paused': '#FF9800',
      'archived': '#666666',
      'harvested': '#4CAF50',
      'negated': '#F44336',
      'monitored': '#2196F3',
      'on_track': '#4CAF50',
      'underpacing': '#2196F3',
      'overpacing': '#FF9800'
    };
    return {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: colors[status] || '#666666',
      color: '#0A0A0A',
      fontWeight: '600',
      fontSize: '11px'
    };
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s ease'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#1E1E1E',
    color: '#FFD700',
    border: '1px solid #FFD700'
  };

  const filterStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: '#1E1E1E',
    border: '1px solid #1E1E1E',
    color: '#CCCCCC',
    fontSize: '13px'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '100px',
    fontFamily: 'monospace',
    resize: 'vertical'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  };

  const pacingCardStyle = {
    ...cardStyle,
    padding: '16px'
  };

  const budgetBarStyle = {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#1E1E1E',
    marginTop: '8px',
    overflow: 'hidden'
  };

  const heatmapStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, 1fr)',
    gap: '2px',
    marginBottom: '16px'
  };

  const heatmapCellStyle = (multiplier) => ({
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: `hsla(56, 100%, ${100 - (multiplier - 0.5) * 20}%, 0.8)`,
    color: '#0A0A0A',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    border: '1px solid #1E1E1E'
  });

  // Campaigns Tab
  const renderCampaignsTab = () => (
    <div>
      <div style={filterStyle}>
        <select style={selectStyle} value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
          <option value="">All Types</option>
          <option value="SP">SP (Sponsored Products)</option>
          <option value="SB">SB (Sponsored Brands)</option>
          <option value="SD">SD (Sponsored Display)</option>
        </select>
        <select style={selectStyle} value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
          <option value="">All Statuses</option>
          <option value="enabled">Enabled</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {loading ? <p>Loading...</p> : (
        <div style={cardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Name</th>
                <th style={headerCellStyle}>Type</th>
                <th style={headerCellStyle}>Status</th>
                <th style={headerCellStyle}>Daily Budget</th>
                <th style={headerCellStyle}>Spend</th>
                <th style={headerCellStyle}>Sales</th>
                <th style={headerCellStyle}>ACoS</th>
                <th style={headerCellStyle}>ROAS</th>
                <th style={headerCellStyle}>TACOS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} onClick={() => {setSelectedCampaignId(c.id);}} style={{cursor: 'pointer'}}>
                  <td style={cellStyle}>{c.name}</td>
                  <td style={cellStyle}><span style={badgeStyle(c.campaign_type)}>{c.campaign_type}</span></td>
                  <td style={cellStyle}><span style={badgeStyle(c.status)}>{c.status}</span></td>
                  <td style={cellStyle}>${c.daily_budget.toFixed(2)}</td>
                  <td style={cellStyle}>${c.total_spend.toFixed(2)}</td>
                  <td style={cellStyle}>${c.total_sales.toFixed(2)}</td>
                  <td style={{...cellStyle, color: c.acos <= 0.25 ? '#4CAF50' : c.acos <= 0.40 ? '#FF9800' : '#F44336'}}>{(c.acos * 100).toFixed(1)}%</td>
                  <td style={cellStyle}>{c.roas.toFixed(2)}x</td>
                  <td style={cellStyle}>{(c.tacos * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Search Terms Tab
  const renderSearchTermsTab = () => (
    <div>
      <div style={filterStyle}>
        <input style={inputStyle} type="number" placeholder="Min Clicks" value={filters.minClicks} onChange={(e) => setFilters({...filters, minClicks: parseInt(e.target.value) || 0})} />
        <input style={inputStyle} type="number" placeholder="Min Spend" value={filters.minSpend} onChange={(e) => setFilters({...filters, minSpend: parseFloat(e.target.value) || 0})} />
        <select style={selectStyle} value={filters.isolationStatus} onChange={(e) => setFilters({...filters, isolationStatus: e.target.value})}>
          <option value="">All Statuses</option>
          <option value="not_reviewed">Not Reviewed</option>
          <option value="harvested">Harvested</option>
          <option value="negated">Negated</option>
          <option value="monitored">Monitored</option>
        </select>
        {selectedCampaignId && <button style={buttonStyle} onClick={() => runIsolationAnalysis(selectedCampaignId)}>Run Analysis</button>}
      </div>
      {loading ? <p>Loading...</p> : (
        <div style={cardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Search Term</th>
                <th style={headerCellStyle}>Type</th>
                <th style={headerCellStyle}>Impressions</th>
                <th style={headerCellStyle}>Clicks</th>
                <th style={headerCellStyle}>Spend</th>
                <th style={headerCellStyle}>Sales</th>
                <th style={headerCellStyle}>ACoS</th>
                <th style={headerCellStyle}>Conv Rate</th>
                <th style={headerCellStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {searchTerms.map((t) => (
                <tr key={t.id}>
                  <td style={cellStyle}>{t.search_term}</td>
                  <td style={cellStyle}><span style={badgeStyle(t.query_type)}>{t.query_type}</span></td>
                  <td style={cellStyle}>{t.impressions}</td>
                  <td style={cellStyle}>{t.clicks}</td>
                  <td style={cellStyle}>${t.spend.toFixed(2)}</td>
                  <td style={cellStyle}>${t.sales.toFixed(2)}</td>
                  <td style={{...cellStyle, color: t.acos <= 0.25 ? '#4CAF50' : t.acos <= 0.40 ? '#FF9800' : '#F44336'}}>{(t.acos * 100).toFixed(1)}%</td>
                  <td style={cellStyle}>{(t.conversion_rate * 100).toFixed(2)}%</td>
                  <td style={cellStyle}><span style={badgeStyle(t.isolation_status)}>{t.isolation_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Dayparting Tab
  const renderDaypartingTab = () => (
    <div>
      {!selectedCampaignId ? (
        <p>Select a campaign from the Campaigns tab first</p>
      ) : (
        <div>
          <h3 style={{marginBottom: '16px', color: '#FFD700'}}>Daypart Schedule for Campaign {selectedCampaignId}</h3>
          <div style={{...cardStyle, overflowX: 'auto'}}>
            <div style={{minWidth: '1200px'}}>
              <h4 style={{color: '#FFD700', marginBottom: '12px'}}>Monday - Sunday, Bid Multipliers by Hour</h4>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, dayIdx) => (
                <div key={day} style={{marginBottom: '16px'}}>
                  <div style={{fontWeight: '600', color: '#FFD700', marginBottom: '8px'}}>{day}</div>
                  <div style={heatmapStyle}>
                    {Array.from({length: 24}, (_, hour) => {
                      const schedule = daypartSchedule.find(s => s.day_of_week === dayIdx && s.hour_start === hour);
                      return (
                        <div key={hour} style={heatmapCellStyle(schedule?.bid_multiplier || 1.0)}>
                          {hour}:00
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button style={buttonStyle} onClick={() => alert('Save implementation in backend')}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Budget Pacing Tab
  const renderBudgetPacingTab = () => (
    <div>
      {loading ? <p>Loading...</p> : (
        <div style={gridStyle}>
          {budgetPacing.map((p) => (
            <div key={p.id} style={pacingCardStyle}>
              <div style={{fontWeight: '600', marginBottom: '8px', color: '#FFD700'}}>Campaign {p.campaign_id}</div>
              <div style={{fontSize: '12px', color: '#999999', marginBottom: '12px'}}>
                Budget: ${p.allocated_budget.toFixed(2)} | Spent: ${p.spent_to_date.toFixed(2)}
              </div>
              <div style={budgetBarStyle}>
                <div style={{height: '100%', width: `${Math.min(p.pacing_pct, 100)}%`, backgroundColor: p.status === 'on_track' ? '#4CAF50' : p.status === 'underpacing' ? '#2196F3' : '#FF9800'}}></div>
              </div>
              <div style={{fontSize: '12px', marginTop: '8px', color: '#CCCCCC'}}>
                {p.pacing_pct.toFixed(1)}% of target | Status: <span style={badgeStyle(p.status)}>{p.status}</span>
              </div>
              <div style={{fontSize: '11px', color: '#999999', marginTop: '8px'}}>
                Daily Target: ${p.daily_target.toFixed(2)} | Actual: ${p.daily_actual.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Campaign Builder Tab
  const renderCampaignBuilderTab = () => (
    <div>
      <div style={cardStyle}>
        <h3 style={{marginBottom: '16px', color: '#FFD700'}}>Campaign Structure Generator</h3>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#CCCCCC', fontSize: '13px'}}>Parent ASIN</label>
          <input style={inputStyle} type="text" value={asin} onChange={(e) => setAsin(e.target.value)} placeholder="e.g., B08ABC123XYZ" />
        </div>
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: '#CCCCCC', fontSize: '13px'}}>Seed Keywords (one per line)</label>
          <textarea style={textareaStyle} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword 1&#10;keyword 2&#10;keyword 3" />
        </div>
        <div style={{marginBottom: '16px', display: 'flex', gap: '16px'}}>
          <label style={{color: '#CCCCCC', fontSize: '13px', display: 'flex', gap: '6px'}}>
            <input type="checkbox" checked={builderOptions.exact} onChange={(e) => setBuilderOptions({...builderOptions, exact: e.target.checked})} />
            Exact Match
          </label>
          <label style={{color: '#CCCCCC', fontSize: '13px', display: 'flex', gap: '6px'}}>
            <input type="checkbox" checked={builderOptions.phrase} onChange={(e) => setBuilderOptions({...builderOptions, phrase: e.target.checked})} />
            Phrase Match
          </label>
          <label style={{color: '#CCCCCC', fontSize: '13px', display: 'flex', gap: '6px'}}>
            <input type="checkbox" checked={builderOptions.broad} onChange={(e) => setBuilderOptions({...builderOptions, broad: e.target.checked})} />
            Broad Match
          </label>
        </div>
        <button style={buttonStyle} onClick={generateCampaignStructure}>Generate Structure</button>
      </div>

      {campaignBuilder && (
        <div style={cardStyle}>
          <h3 style={{marginBottom: '16px', color: '#FFD700'}}>Generated Campaign Structure</h3>
          {campaignBuilder.auto_campaign && (
            <div style={{marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(255, 215, 0, 0.05)', borderRadius: '4px'}}>
              <div style={{fontWeight: '600', color: '#FFD700'}}>Auto Campaign</div>
              <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>Keywords: {campaignBuilder.auto_campaign.keywords?.join(', ')}</div>
            </div>
          )}
          {campaignBuilder.exact_campaign && (
            <div style={{marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: '4px'}}>
              <div style={{fontWeight: '600', color: '#4CAF50'}}>Exact Match Campaign</div>
              <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>Keywords: {campaignBuilder.exact_campaign.keywords?.join(', ')}</div>
            </div>
          )}
          {campaignBuilder.phrase_campaign && (
            <div style={{marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(33, 150, 243, 0.05)', borderRadius: '4px'}}>
              <div style={{fontWeight: '600', color: '#2196F3'}}>Phrase Match Campaign</div>
              <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>Keywords: {campaignBuilder.phrase_campaign.keywords?.join(', ')}</div>
            </div>
          )}
          {campaignBuilder.broad_campaign && (
            <div style={{marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(244, 67, 54, 0.05)', borderRadius: '4px'}}>
              <div style={{fontWeight: '600', color: '#F44336'}}>Broad Match Campaign</div>
              <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>Keywords: {campaignBuilder.broad_campaign.keywords?.join(', ')}</div>
              <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>Negative Keywords: {campaignBuilder.broad_campaign.negative_keywords?.join(', ')}</div>
            </div>
          )}
          <div style={{marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: '4px'}}>
            <div style={{fontWeight: '600', color: '#FF9800'}}>Negative Keywords (Broad)</div>
            <div style={{fontSize: '12px', color: '#CCCCCC', marginTop: '4px'}}>{campaignBuilder.negative_exact_list?.join(', ')}</div>
          </div>
          <button style={{...buttonStyle, marginTop: '16px'}} onClick={() => alert('Create campaigns implementation in backend')}>Create All Campaigns</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={containerStyle}>
      <Sidebar />
      <main style={mainStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Advanced PPC Automation</div>
          <div style={subtitleStyle}>Dayparting, Search Term Isolation, Budget Pacing & Campaign Builder</div>
        </div>

        <div style={tabsContainerStyle}>
          {[
            {id: 'campaigns', label: 'Campaigns'},
            {id: 'searchTerms', label: 'Search Terms'},
            {id: 'dayparting', label: 'Dayparting'},
            {id: 'budgetPacing', label: 'Budget Pacing'},
            {id: 'campaignBuilder', label: 'Campaign Builder'}
          ].map((tab) => (
            <button
              key={tab.id}
              style={tabStyle(activeTab === tab.id)}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'campaigns' && renderCampaignsTab()}
        {activeTab === 'searchTerms' && renderSearchTermsTab()}
        {activeTab === 'dayparting' && renderDaypartingTab()}
        {activeTab === 'budgetPacing' && renderBudgetPacingTab()}
        {activeTab === 'campaignBuilder' && renderCampaignBuilderTab()}
      </main>
    </div>
  );
}
