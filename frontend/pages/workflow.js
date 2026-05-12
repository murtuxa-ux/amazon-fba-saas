import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import api from '../lib/api';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: {
    flex: 1, marginLeft: '250px', padding: '32px',
    color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  tabsContainer: {
    display: 'flex', gap: '8px', borderBottom: '1px solid #1E1E1E',
    marginBottom: '24px', overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
    color: '#A0A0A0', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
  },
  tabActive: { color: '#FFD000', borderBottomColor: '#FFD000' },
  card: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px', marginBottom: '16px',
  },
  templateCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '16px',
  },
  templateGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
  },
  templateName: { fontSize: '15px', fontWeight: 600, color: '#FFD000', marginBottom: '6px' },
  templateMeta: { fontSize: '12px', color: '#A0A0A0', marginBottom: '4px' },
};

function PendingTasks() {
  return (
    <div>
      <EmptyState
        entity="task"
        title="Workflow tasks — pending backend"
        message="The Kanban-style task board (To Do / In Progress / Review / Done with assignee, priority, due date, and tags) needs a backend tasks table that doesn't exist yet. Tracked in docs/design-questions.md."
      />
    </div>
  );
}

function TemplatesTab({ templates, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="card" />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load templates" onRetry={onRefetch} />;
  }
  if (!templates || templates.length === 0) {
    return (
      <EmptyState
        entity="item"
        title="No automation templates yet"
        message="Automation templates from /automation/templates appear here. Once your org defines reusable rules, they'll show up as starting points."
      />
    );
  }

  return (
    <div style={styles.templateGrid}>
      {templates.map((t) => (
        <div key={t.id || t.name} style={styles.templateCard}>
          <div style={styles.templateName}>{t.name || 'Untitled'}</div>
          <div style={styles.templateMeta}>
            Category: {t.category || t.department || '—'}
          </div>
          <div style={styles.templateMeta}>
            {t.description ? t.description : 'No description'}
          </div>
        </div>
      ))}
    </div>
  );
}

function RulesTab({ rules, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="card" />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load automation rules" onRetry={onRefetch} />;
  }
  if (!rules || rules.length === 0) {
    return (
      <EmptyState
        entity="item"
        title="No automation rules yet"
        message="Create automation rules to trigger actions when conditions are met (e.g., notify on high ACOS, restock on low inventory)."
      />
    );
  }

  return (
    <div>
      {rules.map((r) => (
        <div key={r.id} style={styles.card}>
          <div style={{ fontWeight: 600, color: '#FFD000', marginBottom: '6px' }}>
            {r.name || `Rule #${r.id}`}
          </div>
          <div style={{ fontSize: '13px', color: '#A0A0A0' }}>
            {r.description || 'No description'}
          </div>
          <div style={{ fontSize: '12px', color: '#606060', marginTop: '8px' }}>
            Active: {r.isActive ? 'Yes' : 'No'} · Triggers: {r.triggerCount || 0}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, rRes] = await Promise.allSettled([
        api.get('/automation/templates'),
        api.get('/automation/rules'),
      ]);
      if (tRes.status === 'fulfilled') {
        const td = tRes.value?.data;
        setTemplates(Array.isArray(td) ? td : Array.isArray(td?.templates) ? td.templates : []);
      } else {
        setTemplates([]);
      }
      if (rRes.status === 'fulfilled') {
        const rd = rRes.value?.data;
        setRules(Array.isArray(rd) ? rd : Array.isArray(rd?.rules) ? rd.rules : []);
      } else {
        setRules([]);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load workflow data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs = [
    { id: 'templates', label: 'Templates' },
    { id: 'rules', label: 'Automation Rules' },
    { id: 'tasks', label: 'Task Board' },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Workflow</div>
          <div style={styles.subtitle}>Automation templates, rules, and workflow tasks</div>
        </div>

        <div style={styles.tabsContainer}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            loading={loading}
            error={error}
            onRefetch={fetchAll}
          />
        )}
        {activeTab === 'rules' && (
          <RulesTab rules={rules} loading={loading} error={error} onRefetch={fetchAll} />
        )}
        {activeTab === 'tasks' && <PendingTasks />}
      </div>
    </div>
  );
}
