import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    borderBottom: '1px solid #1E1E1E',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: '#999999',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: '1px solid #333333',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  kanbanBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  kanbanColumn: {
    backgroundColor: '#111111',
    borderRadius: '8px',
    border: '1px solid #1E1E1E',
    padding: '16px',
  },
  columnHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  taskCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '12px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
  },
  taskCardHover: {
    borderColor: '#333333',
    backgroundColor: '#222222',
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#FFFFFF',
  },
  taskMeta: {
    fontSize: '12px',
    color: '#999999',
    marginBottom: '8px',
  },
  taskBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    marginRight: '6px',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  badgeHigh: {
    backgroundColor: '#8B0000',
    color: '#FFFFFF',
  },
  badgeMedium: {
    backgroundColor: '#8B6914',
    color: '#FFFFFF',
  },
  badgeLow: {
    backgroundColor: '#0B5B0B',
    color: '#FFFFFF',
  },
  taskTag: {
    display: 'inline-block',
    padding: '3px 6px',
    fontSize: '10px',
    backgroundColor: '#1E1E1E',
    color: '#CCCCCC',
    borderRadius: '3px',
    marginRight: '4px',
    marginBottom: '4px',
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  templateCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  templateCardHover: {
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  templateTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    color: '#FFFFFF',
  },
  templateMeta: {
    fontSize: '13px',
    color: '#999999',
    margin: '8px 0',
  },
  rulesTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  rulesTableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
  },
  rulesTableTh: {
    padding: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  rulesTableTd: {
    padding: '16px',
    fontSize: '13px',
    color: '#CCCCCC',
    borderBottom: '1px solid #1E1E1E',
  },
  rulesTableTr: {
    transition: 'background-color 0.2s ease',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  statusActive: {
    backgroundColor: '#0B5B0B',
    color: '#FFFFFF',
  },
  statusPaused: {
    backgroundColor: '#4B4B0B',
    color: '#FFFFFF',
  },
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 24px 0',
    color: '#FFFFFF',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#CCCCCC',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  dragIndicator: {
    fontSize: '10px',
    color: '#666666',
    marginBottom: '8px',
    textAlign: 'center',
  },
};

const MOCK_TASKS = {
  'To Do': [
    { id: 1, title: 'Review FBA inventory levels', assignee: 'Sarah Chen', priority: 'High', dueDate: '2026-03-31', tags: ['Inventory', 'Urgent'] },
    { id: 2, title: 'Update product listings', assignee: 'Mike Johnson', priority: 'Medium', dueDate: '2026-04-02', tags: ['Products'] },
  ],
  'In Progress': [
    { id: 3, title: 'Analyze Q1 PPC performance', assignee: 'Alex Rodriguez', priority: 'High', dueDate: '2026-03-30', tags: ['PPC', 'Analytics'] },
    { id: 4, title: 'Process client feedback', assignee: 'Emma Wilson', priority: 'Medium', dueDate: '2026-04-01', tags: ['Clients'] },
  ],
  'Review': [
    { id: 5, title: 'Approve new supplier contracts', assignee: 'John Smith', priority: 'Low', dueDate: '2026-04-05', tags: ['Suppliers'] },
  ],
  'Done': [
    { id: 6, title: 'Complete monthly reconciliation', assignee: 'Sarah Chen', priority: 'Medium', dueDate: '2026-03-29', tags: ['Finance'] },
  ],
};

const MOCK_TEMPLATES = [
  {
    id: 1,
    name: 'New Client Onboarding',
    steps: 8,
    estimatedTime: '2 days',
    department: 'Account Management',
  },
  {
    id: 2,
    name: 'Product Launch',
    steps: 10,
    estimatedTime: '1 week',
    department: 'Operations',
  },
  {
    id: 3,
    name: 'Monthly Reporting',
    steps: 6,
    estimatedTime: '4 hours',
    department: 'Finance',
  },
  {
    id: 4,
    name: 'PPC Campaign Setup',
    steps: 7,
    estimatedTime: '3 days',
    department: 'Marketing',
  },
];

const MOCK_RULES = [
  {
    id: 1,
    trigger: 'New Order',
    condition: 'Order > $1000',
    action: 'Send Notification',
    status: 'Active',
  },
  {
    id: 2,
    trigger: 'Low Stock',
    condition: 'Inventory < 10 units',
    action: 'Create Task',
    status: 'Active',
  },
  {
    id: 3,
    trigger: 'High ACOS',
    condition: 'ACOS > 30%',
    action: 'Update Status',
    status: 'Paused',
  },
  {
    id: 4,
    trigger: 'Client Message',
    condition: 'Urgent flag set',
    action: 'Send Email',
    status: 'Active',
  },
];

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignee: '', priority: 'Medium', dueDate: '' });
  const [newRule, setNewRule] = useState({ trigger: 'New Order', condition: '', action: 'Send Notification' });
  const [tasks, setTasks] = useState(MOCK_TASKS);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
    if (!token) {
      return;
    }
  }, []);

  const handleAddTask = () => {
    if (newTask.title && newTask.assignee) {
      setTasks({
        ...tasks,
        'To Do': [
          ...tasks['To Do'],
          {
            id: Math.max(...Object.values(tasks).flat().map(t => t.id), 0) + 1,
            ...newTask,
          },
        ],
      });
      setNewTask({ title: '', assignee: '', priority: 'Medium', dueDate: '' });
      setShowAddTaskModal(false);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'High':
        return styles.badgeHigh;
      case 'Medium':
        return styles.badgeMedium;
      case 'Low':
        return styles.badgeLow;
      default:
        return styles.badgeLow;
    }
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Workflow Management</h1>
          <p style={styles.subtitle}>Organize and automate your FBA operations</p>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'active' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('active')}
          >
            Active Workflows
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'templates' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'automation' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('automation')}
          >
            Automation Rules
          </button>
        </div>

        {activeTab === 'active' && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'right' }}>
              <button
                style={styles.buttonPrimary}
                onClick={() => setShowAddTaskModal(true)}
              >
                + Add Task
              </button>
            </div>
            <div style={styles.kanbanBoard}>
              {Object.entries(tasks).map(([columnName, columnTasks]) => (
                <div key={columnName} style={styles.kanbanColumn}>
                  <div style={styles.columnHeader}>{columnName}</div>
                  {columnTasks.map((task) => (
                    <div key={task.id} style={styles.taskCard}>
                      <div style={styles.dragIndicator}>⋮⋮</div>
                      <h4 style={styles.taskTitle}>{task.title}</h4>
                      <div style={styles.taskMeta}>👤 {task.assignee}</div>
                      <div style={styles.taskMeta}>📅 {task.dueDate}</div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ ...styles.taskBadge, ...getPriorityBadgeStyle(task.priority) }}>
                          {task.priority}
                        </span>
                      </div>
                      <div>
                        {task.tags.map((tag, idx) => (
                          <span key={idx} style={styles.taskTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div style={styles.templatesGrid}>
              {MOCK_TEMPLATES.map((template) => (
                <div key={template.id} style={styles.templateCard}>
                  <h3 style={styles.templateTitle}>{template.name}</h3>
                  <div style={styles.templateMeta}>🔗 {template.steps} steps</div>
                  <div style={styles.templateMeta}>⏱️ Est. {template.estimatedTime}</div>
                  <div style={styles.templateMeta}>👥 {template.department}</div>
                  <button style={{ ...styles.buttonPrimary, marginTop: '16px', width: '100%' }}>
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'right' }}>
              <button
                style={styles.buttonPrimary}
                onClick={() => setShowCreateRuleModal(true)}
              >
                + Create Rule
              </button>
            </div>
            <table style={styles.rulesTable}>
              <thead style={styles.rulesTableHeader}>
                <tr>
                  <th style={styles.rulesTableTh}>Trigger</th>
                  <th style={styles.rulesTableTh}>Condition</th>
                  <th style={styles.rulesTableTh}>Action</th>
                  <th style={styles.rulesTableTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RULES.map((rule) => (
                  <tr key={rule.id} style={styles.rulesTableTr}>
                    <td style={styles.rulesTableTd}>{rule.trigger}</td>
                    <td style={styles.rulesTableTd}>{rule.condition}</td>
                    <td style={styles.rulesTableTd}>{rule.action}</td>
                    <td style={styles.rulesTableTd}>
                      <span style={{ ...styles.statusBadge, ...(rule.status === 'Active' ? styles.statusActive : styles.statusPaused) }}>
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddTaskModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddTaskModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Add New Task</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Task Title</label>
                <input
                  style={styles.input}
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Assignee</label>
                <select
                  style={styles.select}
                  value={newTask.assignee}
                  onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                >
                  <option value="">Select assignee</option>
                  <option value="Sarah Chen">Sarah Chen</option>
                  <option value="Mike Johnson">Mike Johnson</option>
                  <option value="Alex Rodriguez">Alex Rodriguez</option>
                  <option value="Emma Wilson">Emma Wilson</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Priority</label>
                <select
                  style={styles.select}
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Due Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div style={styles.modalActions}>
                <button style={styles.buttonSecondary} onClick={() => setShowAddTaskModal(false)}>
                  Cancel
                </button>
                <button style={styles.buttonPrimary} onClick={handleAddTask}>
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateRuleModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateRuleModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Create Automation Rule</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Trigger</label>
                <select
                  style={styles.select}
                  value={newRule.trigger}
                  onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                >
                  <option value="New Order">New Order</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="High ACOS">High ACOS</option>
                  <option value="Client Message">Client Message</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Condition</label>
                <input
                  style={styles.input}
                  type="text"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  placeholder="Define the condition"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Action</label>
                <select
                  style={styles.select}
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                >
                  <option value="Send Notification">Send Notification</option>
                  <option value="Create Task">Create Task</option>
                  <option value="Update Status">Update Status</option>
                  <option value="Send Email">Send Email</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.buttonSecondary} onClick={() => setShowCreateRuleModal(false)}>
                  Cancel
                </button>
                <button style={styles.buttonPrimary} onClick={() => setShowCreateRuleModal(false)}>
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
