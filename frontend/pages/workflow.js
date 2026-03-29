import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [sops, setSops] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [teamCapacity, setTeamCapacity] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSOPForm, setShowSOPForm] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showSOPWizard, setShowSOPWizard] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    client_id: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    category: 'other',
    estimated_hours: 0
  });

  const [sopForm, setSOPForm] = useState({
    name: '',
    description: '',
    category: '',
    steps: []
  });

  const [timeForm, setTimeForm] = useState({
    client_id: '',
    task_id: '',
    hours: '',
    description: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const [selectedSOPExecution, setSelectedSOPExecution] = useState(null);
  const [currentStepData, setCurrentStepData] = useState({});
  const [taskViewMode, setTaskViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedSOPTemplate, setSelectedSOPTemplate] = useState(null);
  const [sopExecutionClientId, setSOPExecutionClientId] = useState('');
  const [weekStart, setWeekStart] = useState(new Date());

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchTasks();
    fetchMyTasks();
    fetchSOPs();
    fetchTimeEntries();
    fetchTeamCapacity();
    fetchDashboard();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/tasks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/tasks/my-tasks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setMyTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching my tasks:', error);
    }
  };

  const fetchSOPs = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/sops`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setSops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/time-entries`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setTimeEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchTeamCapacity = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/capacity`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setTeamCapacity(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching team capacity:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/workflow/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskForm)
      });
      if (response.ok) {
        setShowTaskForm(false);
        setTaskForm({
          title: '',
          description: '',
          assigned_to: '',
          client_id: '',
          priority: 'medium',
          status: 'todo',
          due_date: '',
          category: 'other',
          estimated_hours: 0
        });
        fetchTasks();
        fetchDashboard();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${BASE_URL}/workflow/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchTasks();
        fetchMyTasks();
        fetchDashboard();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateTimeEntry = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/workflow/time-entries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...timeForm,
          hours: parseFloat(timeForm.hours),
          entry_date: new Date(timeForm.entry_date).toISOString()
        })
      });
      if (response.ok) {
        setShowTimeForm(false);
        setTimeForm({
          client_id: '',
          task_id: '',
          hours: '',
          description: '',
          entry_date: new Date().toISOString().split('T')[0]
        });
        fetchTimeEntries();
        fetchTeamCapacity();
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
    }
  };

  const handleExecuteSOP = async (sopId) => {
    if (!sopExecutionClientId) {
      alert('Please select a client');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/workflow/sops/${sopId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client_id: parseInt(sopExecutionClientId) })
      });
      if (response.ok) {
        const execution = await response.json();
        setSelectedSOPExecution(execution);
        setShowSOPWizard(true);
      }
    } catch (error) {
      console.error('Error executing SOP:', error);
    }
  };

  const handleAdvanceSOPStep = async () => {
    if (!selectedSOPExecution) return;
    try {
      const sop = sops.find(s => s.id === selectedSOPExecution.sop_template_id);
      const nextStep = selectedSOPExecution.current_step + 1;

      const response = await fetch(`${BASE_URL}/workflow/sop-executions/${selectedSOPExecution.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_step: nextStep,
          status: nextStep >= sop.steps.length ? 'completed' : 'in_progress'
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedSOPExecution(updated);
      }
    } catch (error) {
      console.error('Error advancing SOP step:', error);
    }
  };

  const handleRefreshCapacity = async () => {
    try {
      await fetch(`${BASE_URL}/workflow/capacity/calculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` }
      });
      fetchTeamCapacity();
    } catch (error) {
      console.error('Error refreshing capacity:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#808080',
      medium: '#4A90E2',
      high: '#FFD700',
      urgent: '#FF4444'
    };
    return colors[priority] || '#808080';
  };

  const getPriorityBg = (priority) => {
    const colors = {
      low: '#333333',
      medium: '#1a3a5c',
      high: '#3d3a1f',
      urgent: '#4d1f1f'
    };
    return colors[priority] || '#333333';
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#4CAF50',
      busy: '#FFD700',
      overloaded: '#FF4444'
    };
    return colors[status] || '#808080';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Task Kanban Columns
  const statuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
  const statusLabels = {
    todo: 'Todo',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked'
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    return filtered;
  };

  const getTasksByStatus = (status) => {
    return getFilteredTasks().filter(t => t.status === status);
  };

  const renderTaskCard = (task) => (
    <div
      key={task.id}
      style={{
        backgroundColor: '#111111',
        border: `1px solid #1E1E1E`,
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFD700'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1E1E1E'}
    >
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div
          style={{
            backgroundColor: getPriorityBg(task.priority),
            color: getPriorityColor(task.priority),
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}
        >
          {task.priority}
        </div>
        {task.assigned_to && (
          <div style={{
            backgroundColor: '#1E1E1E',
            color: '#888888',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            Assigned
          </div>
        )}
      </div>
      {task.due_date && (
        <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
          Due: {formatDate(task.due_date)}
        </div>
      )}
      {task.client_id && (
        <div style={{ fontSize: '12px', color: '#888888' }}>
          Client: {task.client_id}
        </div>
      )}
    </div>
  );

  const getWeeklyHours = () => {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

    return timeEntries
      .filter(entry => new Date(entry.entry_date) >= thisWeekStart)
      .reduce((sum, entry) => sum + entry.hours, 0);
  };

  const getClientHours = () => {
    const clientHours = {};
    timeEntries.forEach(entry => {
      if (!clientHours[entry.client_id]) {
        clientHours[entry.client_id] = 0;
      }
      clientHours[entry.client_id] += entry.hours;
    });
    return clientHours;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      <Sidebar />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#111111', borderBottom: '1px solid #1E1E1E', padding: '24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Workflow Management</h1>
            <p style={{ color: '#888888', marginBottom: '24px' }}>Manage tasks, SOPs, time tracking, and team capacity</p>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #1E1E1E', marginBottom: 0 }}>
              {['tasks', 'my-tasks', 'sops', 'time', 'capacity'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: activeTab === tab ? '#FFD700' : '#888888',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTab === tab ? '600' : '400',
                    borderBottom: activeTab === tab ? '2px solid #FFD700' : 'none',
                    marginBottom: '-1px',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab === 'tasks' && 'Tasks'}
                  {tab === 'my-tasks' && 'My Tasks'}
                  {tab === 'sops' && 'SOPs'}
                  {tab === 'time' && 'Time Tracking'}
                  {tab === 'capacity' && 'Team Capacity'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setTaskViewMode('kanban')}
                    style={{
                      backgroundColor: taskViewMode === 'kanban' ? '#FFD700' : '#1E1E1E',
                      color: taskViewMode === 'kanban' ? '#000000' : '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    Kanban View
                  </button>
                  <button
                    onClick={() => setTaskViewMode('table')}
                    style={{
                      backgroundColor: taskViewMode === 'table' ? '#FFD700' : '#1E1E1E',
                      color: taskViewMode === 'table' ? '#000000' : '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    Table View
                  </button>
                </div>
                <button
                  onClick={() => setShowTaskForm(true)}
                  style={{
                    backgroundColor: '#FFD700',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  + Create Task
                </button>
              </div>

              {/* Kanban Board */}
              {taskViewMode === 'kanban' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                  {statuses.map((status) => (
                    <div
                      key={status}
                      style={{
                        backgroundColor: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '8px',
                        padding: '16px',
                        minHeight: '500px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#FFD700' }}>
                        {statusLabels[status]}
                        <span style={{ color: '#888888', marginLeft: '8px', fontSize: '12px' }}>
                          ({getTasksByStatus(status).length})
                        </span>
                      </h3>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {getTasksByStatus(status).map((task) => (
                          <div
                            key={task.id}
                            style={{
                              backgroundColor: '#0A0A0A',
                              border: `1px solid #1E1E1E`,
                              borderRadius: '6px',
                              padding: '12px',
                              marginBottom: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#FFD700';
                              e.currentTarget.style.backgroundColor = '#0F0F0F';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#1E1E1E';
                              e.currentTarget.style.backgroundColor = '#0A0A0A';
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>
                              {task.title}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  backgroundColor: getPriorityBg(task.priority),
                                  color: getPriorityColor(task.priority),
                                  padding: '3px 6px',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  fontWeight: '600'
                                }}
                              >
                                {task.priority.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#888888' }}>
                              {task.due_date ? formatDate(task.due_date) : 'No due date'}
                            </div>
                            {status !== 'done' && status !== 'blocked' && (
                              <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                                {status === 'todo' && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                    style={{
                                      backgroundColor: '#1E1E1E',
                                      color: '#FFD700',
                                      border: 'none',
                                      padding: '4px 8px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Start
                                  </button>
                                )}
                                {status === 'in_progress' && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, 'review')}
                                    style={{
                                      backgroundColor: '#1E1E1E',
                                      color: '#FFD700',
                                      border: 'none',
                                      padding: '4px 8px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Review
                                  </button>
                                )}
                                {status === 'review' && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                                    style={{
                                      backgroundColor: '#1E1E1E',
                                      color: '#4CAF50',
                                      border: 'none',
                                      padding: '4px 8px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Task Form Modal */}
              {showTaskForm && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '8px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                  }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Create Task</h2>
                    <form onSubmit={handleCreateTask}>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Title</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                          required
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Description</label>
                        <textarea
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            minHeight: '80px',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Priority</label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px',
                              backgroundColor: '#0A0A0A',
                              border: '1px solid #1E1E1E',
                              borderRadius: '4px',
                              color: '#FFFFFF',
                              fontSize: '13px'
                            }}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Category</label>
                          <select
                            value={taskForm.category}
                            onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px',
                              backgroundColor: '#0A0A0A',
                              border: '1px solid #1E1E1E',
                              borderRadius: '4px',
                              color: '#FFFFFF',
                              fontSize: '13px'
                            }}
                          >
                            <option value="ppc">PPC</option>
                            <option value="inventory">Inventory</option>
                            <option value="sourcing">Sourcing</option>
                            <option value="listing">Listing</option>
                            <option value="account_health">Account Health</option>
                            <option value="reporting">Reporting</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Due Date</label>
                        <input
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Estimated Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={taskForm.estimated_hours}
                          onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseFloat(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            backgroundColor: '#FFD700',
                            color: '#000000',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          style={{
                            flex: 1,
                            backgroundColor: '#1E1E1E',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MY TASKS TAB */}
          {activeTab === 'my-tasks' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>My Tasks</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                {myTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888888' }}>
                    No tasks assigned to you
                  </div>
                ) : (
                  myTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        backgroundColor: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>{task.title}</h3>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#888888' }}>
                          <span>Due: {formatDate(task.due_date)}</span>
                          <span>
                            Priority:
                            <span style={{ color: getPriorityColor(task.priority), marginLeft: '4px', fontWeight: '600' }}>
                              {task.priority}
                            </span>
                          </span>
                          <span>Status: {task.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        {task.status === 'todo' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                            style={{
                              backgroundColor: '#FFD700',
                              color: '#000000',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}
                          >
                            Start
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'review')}
                            style={{
                              backgroundColor: '#FFD700',
                              color: '#000000',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}
                          >
                            Ready for Review
                          </button>
                        )}
                        {task.status === 'review' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                            style={{
                              backgroundColor: '#4CAF50',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SOPS TAB */}
          {activeTab === 'sops' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => setShowSOPForm(true)}
                  style={{
                    backgroundColor: '#FFD700',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  + Create SOP Template
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {sops.map((sop) => (
                  <div
                    key={sop.id}
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{sop.name}</h3>
                    <p style={{ fontSize: '13px', color: '#888888', marginBottom: '12px' }}>{sop.description}</p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span style={{
                        backgroundColor: '#1E1E1E',
                        color: '#FFD700',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {sop.category}
                      </span>
                      <span style={{
                        backgroundColor: '#1E1E1E',
                        color: '#888888',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {sop.steps.length} steps
                      </span>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888888' }}>Select Client</label>
                      <input
                        type="number"
                        placeholder="Client ID"
                        value={sopExecutionClientId}
                        onChange={(e) => setSOPExecutionClientId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #1E1E1E',
                          borderRadius: '4px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleExecuteSOP(sop.id)}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFD700',
                        color: '#000000',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      Execute SOP
                    </button>
                  </div>
                ))}
              </div>

              {/* SOP Wizard Modal */}
              {showSOPWizard && selectedSOPExecution && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: '#111111',
                    border: '2px solid #FFD700',
                    borderRadius: '8px',
                    padding: '32px',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                  }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#FFD700' }}>
                      {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.name}
                    </h2>
                    <p style={{ color: '#888888', marginBottom: '24px', fontSize: '13px' }}>
                      Step {selectedSOPExecution.current_step + 1} of {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps.length || 0}
                    </p>

                    {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps[selectedSOPExecution.current_step] && (
                      <div style={{ backgroundColor: '#0A0A0A', padding: '20px', borderRadius: '6px', marginBottom: '24px', border: '1px solid #1E1E1E' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                          {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps[selectedSOPExecution.current_step].title}
                        </h3>
                        <p style={{ color: '#888888', marginBottom: '12px', lineHeight: '1.6' }}>
                          {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps[selectedSOPExecution.current_step].description}
                        </p>
                        <div style={{ fontSize: '12px', color: '#FFD700' }}>
                          Est. time: {sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps[selectedSOPExecution.current_step].estimated_minutes} minutes
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={handleAdvanceSOPStep}
                        style={{
                          flex: 1,
                          backgroundColor: '#FFD700',
                          color: '#000000',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {selectedSOPExecution.current_step + 1 >= (sops.find(s => s.id === selectedSOPExecution.sop_template_id)?.steps.length || 0) ? 'Complete SOP' : 'Next Step'}
                      </button>
                      <button
                        onClick={() => {
                          setShowSOPWizard(false);
                          setSelectedSOPExecution(null);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#1E1E1E',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TIME TRACKING TAB */}
          {activeTab === 'time' && (
            <div>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Time Tracking</h2>
                <button
                  onClick={() => setShowTimeForm(true)}
                  style={{
                    backgroundColor: '#FFD700',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  + Log Time
                </button>
              </div>

              {/* Weekly Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>This Week</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFD700' }}>
                    {getWeeklyHours().toFixed(1)} hrs
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Total Entries</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFD700' }}>
                    {timeEntries.length}
                  </div>
                </div>
              </div>

              {/* Hours by Client */}
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Hours by Client</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {Object.entries(getClientHours()).length === 0 ? (
                    <div style={{ color: '#888888', textAlign: 'center', padding: '20px' }}>No time entries yet</div>
                  ) : (
                    Object.entries(getClientHours()).map(([clientId, hours]) => (
                      <div
                        key={clientId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '12px',
                          borderBottom: '1px solid #1E1E1E',
                          fontSize: '13px'
                        }}
                      >
                        <span>Client {clientId}</span>
                        <span style={{ color: '#FFD700', fontWeight: '600' }}>{hours.toFixed(1)} hrs</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Time Entry Form */}
              {showTimeForm && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '8px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px'
                  }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Log Time Entry</h2>
                    <form onSubmit={handleCreateTimeEntry}>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Date</label>
                        <input
                          type="date"
                          value={timeForm.entry_date}
                          onChange={(e) => setTimeForm({ ...timeForm, entry_date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px'
                          }}
                          required
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Client ID</label>
                        <input
                          type="number"
                          value={timeForm.client_id}
                          onChange={(e) => setTimeForm({ ...timeForm, client_id: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px'
                          }}
                          required
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={timeForm.hours}
                          onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px'
                          }}
                          required
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888888' }}>Description</label>
                        <textarea
                          value={timeForm.description}
                          onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#0A0A0A',
                            border: '1px solid #1E1E1E',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            minHeight: '60px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            backgroundColor: '#FFD700',
                            color: '#000000',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Log Time
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTimeForm(false)}
                          style={{
                            flex: 1,
                            backgroundColor: '#1E1E1E',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEAM CAPACITY TAB */}
          {activeTab === 'capacity' && (
            <div>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Team Capacity</h2>
                <button
                  onClick={handleRefreshCapacity}
                  style={{
                    backgroundColor: '#FFD700',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Refresh Capacity
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {teamCapacity.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      padding: '20px'
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                        Team Member {member.user_id}
                      </h3>
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: getStatusColor(member.capacity_status),
                          color: '#000000',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        {member.capacity_status}
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Clients</div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#1E1E1E',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#FFD700',
                            width: `${Math.min((member.total_clients / member.max_clients) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>
                        {member.total_clients} / {member.max_clients}
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Open Tasks</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700' }}>
                        {member.total_tasks_open}
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Weekly Hours</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700' }}>
                        {member.total_hours_week.toFixed(1)} hrs
                      </div>
                    </div>

                    <div style={{
                      padding: '12px',
                      backgroundColor: '#0A0A0A',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#888888',
                      textAlign: 'center'
                    }}>
                      Week of {formatDate(member.week_start)}
                    </div>
                  </div>
                ))}
              </div>

              {teamCapacity.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#888888'
                }}>
                  No capacity data available. Click "Refresh Capacity" to calculate.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
