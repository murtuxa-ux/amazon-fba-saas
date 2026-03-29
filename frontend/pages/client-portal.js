import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ClientPortal = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    profit: 0,
    roi: 0,
  });
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [reports, setReports] = useState([]);
  const [branding, setBranding] = useState({
    clientLogo: '',
    primaryColor: '#FFD700',
    secondaryColor: '#1E1E1E',
    companyName: '',
    customDomain: '',
    emailHeader: '',
    emailFooter: '',
  });
  const [toastMessage, setToastMessage] = useState('');
  const [reportSchedules, setReportSchedules] = useState({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : '';

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientData();
      loadMessages();
      loadBranding();
      loadReports();
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const clientList = Array.isArray(data) ? data : [];
        setClients(clientList);
        if (clientList.length > 0) {
          setSelectedClient(clientList[0]);
        }
      } else {
        setClients([
          { id: 1, name: 'Demo Client A', email: 'contact@demoa.com' },
          { id: 2, name: 'Demo Client B', email: 'contact@demob.com' },
        ]);
        setSelectedClient({ id: 1, name: 'Demo Client A', email: 'contact@demoa.com' });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([
        { id: 1, name: 'Demo Client A', email: 'contact@demoa.com' },
        { id: 2, name: 'Demo Client B', email: 'contact@demob.com' },
      ]);
      setSelectedClient({ id: 1, name: 'Demo Client A', email: 'contact@demoa.com' });
    }
    setLoading(false);
  };

  const loadClientData = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/clients/${selectedClient?.id}/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data || { revenue: 0, orders: 0, profit: 0, roi: 0 });
      } else {
        setStats({
          revenue: 125400,
          orders: 842,
          profit: 38920,
          roi: 31.07,
        });
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      setStats({
        revenue: 125400,
        orders: 842,
        profit: 38920,
        roi: 31.07,
      });
    }

    try {
      const response = await fetch(
        `${BASE_URL}/clients/${selectedClient?.id}/products`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([
          {
            asin: 'B08N3MLKTQ',
            title: 'Premium Wireless Headphones',
            revenue: 24500,
            units: 128,
            profit: 7840,
            status: 'Active',
          },
          {
            asin: 'B08P5MKQRS',
            title: 'USB-C Fast Charging Cable',
            revenue: 18900,
            units: 756,
            profit: 5670,
            status: 'Active',
          },
          {
            asin: 'B08Q9NKLTY',
            title: 'Portable Phone Stand',
            revenue: 12300,
            units: 410,
            profit: 4101,
            status: 'Active',
          },
          {
            asin: 'B08R2PLMVW',
            title: 'LED Desk Lamp',
            revenue: 8700,
            units: 145,
            profit: 2175,
            status: 'Warning',
          },
          {
            asin: 'B08S6QNPXY',
            title: 'Bluetooth Speaker System',
            revenue: 15200,
            units: 64,
            profit: 6080,
            status: 'Active',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([
        {
          asin: 'B08N3MLKTQ',
          title: 'Premium Wireless Headphones',
          revenue: 24500,
          units: 128,
          profit: 7840,
          status: 'Active',
        },
        {
          asin: 'B08P5MKQRS',
          title: 'USB-C Fast Charging Cable',
          revenue: 18900,
          units: 756,
          profit: 5670,
          status: 'Active',
        },
        {
          asin: 'B08Q9NKLTY',
          title: 'Portable Phone Stand',
          revenue: 12300,
          units: 410,
          profit: 4101,
          status: 'Active',
        },
        {
          asin: 'B08R2PLMVW',
          title: 'LED Desk Lamp',
          revenue: 8700,
          units: 145,
          profit: 2175,
          status: 'Warning',
        },
        {
          asin: 'B08S6QNPXY',
          title: 'Bluetooth Speaker System',
          revenue: 15200,
          units: 64,
          profit: 6080,
          status: 'Active',
        },
      ]);
    }
  };

  const loadMessages = () => {
    if (!selectedClient) return;
    const storedMessages =
      typeof window !== 'undefined'
        ? localStorage.getItem(`ecomera_client_messages_${selectedClient.id}`)
        : null;

    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    } else {
      const defaultMessages = [
        {
          id: 1,
          sender: 'agency',
          senderName: 'Agency Account Manager',
          text: 'Hi! Your Q1 performance dashboard is now live. Check the Client Overview tab for your latest metrics.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true,
        },
        {
          id: 2,
          sender: 'client',
          senderName: 'Client Contact',
          text: 'Great! I see the revenue is up 12% from last month. Can we discuss optimization strategies?',
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          read: true,
        },
        {
          id: 3,
          sender: 'agency',
          senderName: 'Agency Account Manager',
          text: 'Absolutely. I recommend increasing PPC spend on your top 3 ASINs. Let\'s schedule a call for Thursday?',
          timestamp: new Date(Date.now() - 28800000).toISOString(),
          read: true,
        },
      ];
      setMessages(defaultMessages);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `ecomera_client_messages_${selectedClient.id}`,
          JSON.stringify(defaultMessages)
        );
      }
    }
  };

  const loadBranding = () => {
    if (!selectedClient) return;
    const storedBranding =
      typeof window !== 'undefined'
        ? localStorage.getItem(`ecomera_client_branding_${selectedClient.id}`)
        : null;

    if (storedBranding) {
      setBranding(JSON.parse(storedBranding));
    } else {
      setBranding({
        clientLogo: '',
        primaryColor: '#FFD700',
        secondaryColor: '#1E1E1E',
        companyName: selectedClient?.name || '',
        customDomain: '',
        emailHeader: '',
        emailFooter: '',
      });
    }
  };

  const loadReports = () => {
    if (!selectedClient) return;
    const mockReports = [
      {
        id: 1,
        name: 'Monthly P&L',
        dateRange: 'Mar 1 - Mar 31, 2026',
        status: 'Ready',
        generatedAt: '2026-03-27T10:30:00Z',
      },
      {
        id: 2,
        name: 'Weekly Performance',
        dateRange: 'Mar 23 - Mar 29, 2026',
        status: 'Ready',
        generatedAt: '2026-03-29T08:15:00Z',
      },
      {
        id: 3,
        name: 'Inventory Status',
        dateRange: 'Current',
        status: 'Generating',
        generatedAt: null,
      },
      {
        id: 4,
        name: 'PPC Summary',
        dateRange: 'Mar 1 - Mar 31, 2026',
        status: 'Scheduled',
        generatedAt: null,
      },
    ];
    setReports(mockReports);

    const storedSchedules =
      typeof window !== 'undefined'
        ? localStorage.getItem(`ecomera_report_schedules_${selectedClient.id}`)
        : null;

    if (storedSchedules) {
      setReportSchedules(JSON.parse(storedSchedules));
    } else {
      setReportSchedules({});
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedClient) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'agency',
      senderName: 'Agency Account Manager',
      text: messageInput,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setMessageInput('');

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `ecomera_client_messages_${selectedClient.id}`,
        JSON.stringify(updatedMessages)
      );
    }
  };

  const handleReportGenerate = (reportId) => {
    showToast('Report generation started. Check back in a moment.');
    const updatedReports = reports.map((r) =>
      r.id === reportId ? { ...r, status: 'Generating' } : r
    );
    setReports(updatedReports);

    setTimeout(() => {
      const finalReports = updatedReports.map((r) =>
        r.id === reportId
          ? { ...r, status: 'Ready', generatedAt: new Date().toISOString() }
          : r
      );
      setReports(finalReports);
    }, 2000);
  };

  const handleDownloadPDF = () => {
    showToast('PDF generation coming soon');
  };

  const toggleReportSchedule = (reportId, schedule) => {
    const newSchedules = { ...reportSchedules };
    if (newSchedules[reportId] === schedule) {
      delete newSchedules[reportId];
    } else {
      newSchedules[reportId] = schedule;
    }
    setReportSchedules(newSchedules);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `ecomera_report_schedules_${selectedClient.id}`,
        JSON.stringify(newSchedules)
      );
    }

    showToast(
      newSchedules[reportId]
        ? `Report scheduled for ${schedule} delivery`
        : 'Schedule removed'
    );
  };

  const saveBranding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `ecomera_client_branding_${selectedClient.id}`,
        JSON.stringify(branding)
      );
    }
    showToast('Branding settings saved successfully');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBranding({ ...branding, clientLogo: event.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getRevenueChartData = () => {
    const mockData = [
      { month: 'Sep', value: 95000 },
      { month: 'Oct', value: 108000 },
      { month: 'Nov', value: 132000 },
      { month: 'Dec', value: 128000 },
      { month: 'Jan', value: 118000 },
      { month: 'Feb', value: 125400 },
    ];
    return mockData;
  };

  const renderRevenueChart = () => {
    const data = getRevenueChartData();
    const maxValue = Math.max(...data.map((d) => d.value));
    const padding = 40;
    const chartWidth = 480;
    const chartHeight = 200;
    const width = chartWidth + padding * 2;
    const height = chartHeight + padding * 2;

    const xStep = chartWidth / (data.length - 1);
    const points = data.map((d, i) => ({
      x: padding + i * xStep,
      y: padding + chartHeight - (d.value / maxValue) * chartHeight,
      value: d.value,
      month: d.month,
    }));

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const gridLines = Array.from({ length: 5 }).map((_, i) => {
      const y = padding + (chartHeight / 4) * i;
      const value = Math.round(maxValue - (maxValue / 4) * i);
      return { y, value };
    });

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: '280px' }}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              stroke="#222222"
              strokeWidth="1"
            />
            <text
              x={padding - 10}
              y={line.y + 4}
              fontSize="11"
              fill="#888888"
              textAnchor="end"
            >
              ${(line.value / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X-axis */}
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={width - padding}
          y2={padding + chartHeight}
          stroke="#333333"
          strokeWidth="2"
        />

        {/* Revenue line */}
        <path
          d={pathData}
          fill="none"
          stroke="#FFD700"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="5" fill="#FFD700" />
        ))}

        {/* Month labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={padding + chartHeight + 20}
            fontSize="12"
            fill="#999999"
            textAnchor="middle"
          >
            {data[i].month}
          </text>
        ))}

        {/* Title */}
        <text x={width / 2} y={25} fontSize="14" fontWeight="500" fill="#FFFFFF" textAnchor="middle">
          Revenue Trend (Last 6 Months)
        </text>
      </svg>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

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
      fontSize: '28px',
      fontWeight: '600',
      marginBottom: '16px',
    },
    selectorContainer: {
      marginBottom: '24px',
    },
    selectorLabel: {
      fontSize: '14px',
      color: '#AAAAAA',
      marginBottom: '8px',
      display: 'block',
    },
    select: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      minWidth: '300px',
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '28px',
      borderBottom: '1px solid #1E1E1E',
    },
    tab: {
      padding: '12px 20px',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#AAAAAA',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      borderBottom: '2px solid transparent',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    },
    tabActive: {
      color: '#FFD700',
      borderBottomColor: '#FFD700',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    statCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    statCardHover: {
      borderColor: '#FFD700',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)',
    },
    statLabel: {
      fontSize: '12px',
      color: '#999999',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#FFFFFF',
    },
    chartContainer: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '32px',
    },
    tableContainer: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '32px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    tableHeader: {
      backgroundColor: '#0A0A0A',
      borderBottom: '1px solid #1E1E1E',
    },
    tableHeaderCell: {
      padding: '14px 16px',
      textAlign: 'left',
      color: '#999999',
      fontWeight: '500',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E',
      transition: 'background-color 0.2s',
    },
    tableRowHover: {
      backgroundColor: '#1A1A1A',
    },
    tableCell: {
      padding: '14px 16px',
      color: '#FFFFFF',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    },
    statusActive: {
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#4CAF50',
    },
    statusWarning: {
      backgroundColor: 'rgba(255, 193, 7, 0.2)',
      color: '#FFC107',
    },
    healthBar: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '32px',
    },
    healthBarTitle: {
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '12px',
      color: '#FFFFFF',
    },
    healthBarContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
    },
    healthItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    healthIndicator: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      flexShrink: 0,
    },
    reportCardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    reportCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      transition: 'all 0.2s',
    },
    reportCardHover: {
      borderColor: '#FFD700',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)',
    },
    reportCardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#FFFFFF',
    },
    reportCardDate: {
      fontSize: '12px',
      color: '#999999',
      marginBottom: '12px',
    },
    reportCardStatus: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      marginBottom: '16px',
      backgroundColor: 'rgba(255, 215, 0, 0.2)',
      color: '#FFD700',
    },
    reportCardButtons: {
      display: 'flex',
      gap: '8px',
      marginBottom: '12px',
    },
    button: {
      flex: 1,
      padding: '8px 12px',
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    },
    buttonPrimary: {
      backgroundColor: '#FFD700',
      color: '#000000',
      border: 'none',
    },
    buttonSecondary: {
      borderColor: '#FFD700',
      color: '#FFD700',
    },
    scheduleContainer: {
      borderTop: '1px solid #1E1E1E',
      paddingTop: '12px',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
    },
    scheduleButton: {
      padding: '6px 12px',
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#999999',
      borderRadius: '4px',
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    },
    scheduleButtonActive: {
      backgroundColor: '#FFD700',
      borderColor: '#FFD700',
      color: '#000000',
    },
    messageContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '20px',
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    message: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '70%',
    },
    messageAgency: {
      alignSelf: 'flex-end',
    },
    messageClient: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: '12px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      lineHeight: '1.4',
    },
    messageBubbleAgency: {
      backgroundColor: '#FFD700',
      color: '#000000',
    },
    messageBubbleClient: {
      backgroundColor: '#1E1E1E',
      color: '#FFFFFF',
    },
    messageInfo: {
      fontSize: '11px',
      color: '#999999',
      marginTop: '4px',
      marginRight: '4px',
    },
    messageInput: {
      padding: '16px',
      borderTop: '1px solid #1E1E1E',
      display: 'flex',
      gap: '12px',
    },
    textarea: {
      flex: 1,
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'inherit',
      resize: 'none',
      minHeight: '40px',
    },
    sendButton: {
      padding: '10px 20px',
      backgroundColor: '#FFD700',
      color: '#000000',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    },
    cannedResponseContainer: {
      marginBottom: '20px',
    },
    cannedLabel: {
      fontSize: '12px',
      color: '#AAAAAA',
      marginBottom: '8px',
      display: 'block',
    },
    cannedSelect: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      width: '100%',
      fontFamily: 'inherit',
    },
    brandingGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px',
      marginBottom: '32px',
    },
    brandingSection: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '24px',
    },
    brandingSectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#FFFFFF',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      fontSize: '12px',
      color: '#AAAAAA',
      marginBottom: '6px',
      display: 'block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    },
    colorPickerContainer: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    colorInput: {
      width: '60px',
      height: '40px',
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    colorSwatch: {
      width: '60px',
      height: '40px',
      borderRadius: '6px',
      border: '1px solid #1E1E1E',
    },
    logoUploadArea: {
      border: '2px dashed #1E1E1E',
      borderRadius: '6px',
      padding: '24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#0A0A0A',
    },
    logoUploadAreaHover: {
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.05)',
    },
    logoUploadText: {
      fontSize: '12px',
      color: '#999999',
      marginBottom: '8px',
    },
    logoPreview: {
      marginTop: '12px',
      maxHeight: '100px',
      borderRadius: '6px',
      border: '1px solid #1E1E1E',
      padding: '8px',
    },
    previewPanel: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '24px',
    },
    previewTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#FFFFFF',
    },
    previewPortal: {
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
      padding: '20px',
    },
    previewHeader: {
      borderBottom: `2px solid ${branding.primaryColor}`,
      paddingBottom: '16px',
      marginBottom: '16px',
    },
    previewCompanyName: {
      fontSize: '18px',
      fontWeight: '600',
      color: branding.primaryColor,
    },
    previewContent: {
      fontSize: '12px',
      color: '#999999',
    },
    saveButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#FFD700',
      color: '#000000',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '20px',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    },
    toast: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#FFD700',
      color: '#000000',
      padding: '14px 20px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
    },
    loadingText: {
      color: '#999999',
      fontSize: '14px',
      padding: '32px',
      textAlign: 'center',
    },
  };

  if (!selectedClient && clients.length === 0) {
    return (
      <div style={styles.outerContainer}>
        <Sidebar />
        <div style={styles.container}>
          <div style={styles.loadingText}>Loading clients...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Client Portal</h1>
          <div style={styles.selectorContainer}>
            <label style={styles.selectorLabel}>Select Client:</label>
            <select
              style={styles.select}
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const client = clients.find((c) => c.id == e.target.value);
                setSelectedClient(client);
              }}
            >
              {Array.isArray(clients) &&
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div style={styles.tabContainer}>
          {['overview', 'reports', 'communication', 'branding'].map((tabName) => (
            <button
              key={tabName}
              style={{
                ...styles.tab,
                ...(activeTab === tabName ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName === 'overview'
                ? 'Client Overview'
                : tabName === 'reports'
                ? 'Reports'
                : tabName === 'communication'
                ? 'Communication'
                : 'Branding'}
            </button>
          ))}
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Revenue</div>
                <div style={styles.statValue}>{formatCurrency(stats.revenue)}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Orders</div>
                <div style={styles.statValue}>{stats.orders.toLocaleString()}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Net Profit</div>
                <div style={styles.statValue}>{formatCurrency(stats.profit)}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>ROI</div>
                <div style={styles.statValue}>{stats.roi.toFixed(2)}%</div>
              </div>
            </div>

            <div style={styles.chartContainer}>{renderRevenueChart()}</div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.tableHeaderCell}>ASIN</th>
                    <th style={styles.tableHeaderCell}>Product Title</th>
                    <th style={styles.tableHeaderCell}>Revenue</th>
                    <th style={styles.tableHeaderCell}>Units Sold</th>
                    <th style={styles.tableHeaderCell}>Profit</th>
                    <th style={styles.tableHeaderCell}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(products) &&
                    products.map((product, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>{product.asin}</td>
                        <td style={styles.tableCell}>{product.title}</td>
                        <td style={styles.tableCell}>{formatCurrency(product.revenue)}</td>
                        <td style={styles.tableCell}>{product.units.toLocaleString()}</td>
                        <td style={styles.tableCell}>{formatCurrency(product.profit)}</td>
                        <td style={styles.tableCell}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              ...(product.status === 'Active'
                                ? styles.statusActive
                                : styles.statusWarning),
                            }}
                          >
                            {product.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={styles.healthBar}>
              <div style={styles.healthBarTitle}>Account Health Summary</div>
              <div style={styles.healthBarContainer}>
                <div style={styles.healthItem}>
                  <div style={{ ...styles.healthIndicator, backgroundColor: '#4CAF50' }} />
                  <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                    5 Active Products
                  </span>
                </div>
                <div style={styles.healthItem}>
                  <div style={{ ...styles.healthIndicator, backgroundColor: '#FFC107' }} />
                  <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                    1 Needs Attention
                  </span>
                </div>
                <div style={styles.healthItem}>
                  <div style={{ ...styles.healthIndicator, backgroundColor: '#4CAF50' }} />
                  <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                    Strong Profitability
                  </span>
                </div>
                <div style={styles.healthItem}>
                  <div style={{ ...styles.healthIndicator, backgroundColor: '#4CAF50' }} />
                  <span style={{ fontSize: '13px', color: '#FFFFFF' }}>
                    Inventory Balanced
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Reports */}
        {activeTab === 'reports' && (
          <div>
            <div style={styles.reportCardsGrid}>
              {Array.isArray(reports) &&
                reports.map((report) => (
                  <div key={report.id} style={styles.reportCard}>
                    <div style={styles.reportCardTitle}>{report.name}</div>
                    <div style={styles.reportCardDate}>{report.dateRange}</div>
                    <div
                      style={{
                        ...styles.reportCardStatus,
                        backgroundColor:
                          report.status === 'Ready'
                            ? 'rgba(76, 175, 80, 0.2)'
                            : report.status === 'Generating'
                            ? 'rgba(255, 193, 7, 0.2)'
                            : 'rgba(158, 158, 158, 0.2)',
                        color:
                          report.status === 'Ready'
                            ? '#4CAF50'
                            : report.status === 'Generating'
                            ? '#FFC107'
                            : '#999999',
                      }}
                    >
                      {report.status}
                    </div>
                    <div style={styles.reportCardButtons}>
                      <button
                        style={{
                          ...styles.button,
                          ...(report.status === 'Ready' ? styles.buttonPrimary : {}),
                        }}
                        onClick={() =>
                          report.status === 'Ready'
                            ? handleDownloadPDF()
                            : handleReportGenerate(report.id)
                        }
                      >
                        {report.status === 'Ready' ? 'Download PDF' : 'Generate'}
                      </button>
                    </div>
                    <div style={styles.scheduleContainer}>
                      <button
                        style={{
                          ...styles.scheduleButton,
                          ...(reportSchedules[report.id] === 'Weekly'
                            ? styles.scheduleButtonActive
                            : {}),
                        }}
                        onClick={() => toggleReportSchedule(report.id, 'Weekly')}
                      >
                        Weekly
                      </button>
                      <button
                        style={{
                          ...styles.scheduleButton,
                          ...(reportSchedules[report.id] === 'Monthly'
                            ? styles.scheduleButtonActive
                            : {}),
                        }}
                        onClick={() => toggleReportSchedule(report.id, 'Monthly')}
                      >
                        Monthly
                      </button>
                      <button
                        style={{
                          ...styles.scheduleButton,
                          ...(reportSchedules[report.id] === 'Quarterly'
                            ? styles.scheduleButtonActive
                            : {}),
                        }}
                        onClick={() => toggleReportSchedule(report.id, 'Quarterly')}
                      >
                        Quarterly
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB: Communication */}
        {activeTab === 'communication' && (
          <div>
            <div style={styles.cannedResponseContainer}>
              <label style={styles.cannedLabel}>Quick Responses:</label>
              <select
                style={styles.cannedSelect}
                onChange={(e) => {
                  if (e.target.value) {
                    setMessageInput(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select a canned response...</option>
                <option value="Thanks for reaching out. I'll get back to you shortly.">
                  Acknowledgment
                </option>
                <option value="Great question! Here's what I recommend...">
                  Follow-up needed
                </option>
                <option value="I've reviewed your metrics. Let's schedule a call to discuss strategy.">
                  Request meeting
                </option>
                <option value="Your account is performing well. No action needed at this time.">
                  Positive update
                </option>
              </select>
            </div>

            <div style={styles.messageContainer}>
              <div style={styles.messagesArea}>
                {Array.isArray(messages) &&
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.message,
                        ...(msg.sender === 'agency' ? styles.messageAgency : styles.messageClient),
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          ...(msg.sender === 'agency'
                            ? styles.messageBubbleAgency
                            : styles.messageBubbleClient),
                        }}
                      >
                        {msg.text}
                      </div>
                      <div
                        style={{
                          ...styles.messageInfo,
                          textAlign: msg.sender === 'agency' ? 'right' : 'left',
                        }}
                      >
                        {formatDate(msg.timestamp)}
                        {msg.read && msg.sender === 'client' && ' • Read'}
                      </div>
                    </div>
                  ))}
              </div>
              <div style={styles.messageInput}>
                <textarea
                  style={styles.textarea}
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      sendMessage();
                    }
                  }}
                />
                <button style={styles.sendButton} onClick={sendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Branding */}
        {activeTab === 'branding' && (
          <div>
            <div style={styles.brandingGrid}>
              <div>
                <div style={styles.brandingSection}>
                  <div style={styles.brandingSectionTitle}>Configuration</div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company Name</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={branding.companyName}
                      onChange={(e) =>
                        setBranding({ ...branding, companyName: e.target.value })
                      }
                      placeholder="Client's company name"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Custom Domain</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={branding.customDomain}
                      onChange={(e) =>
                        setBranding({ ...branding, customDomain: e.target.value })
                      }
                      placeholder="e.g., portal.clientname.com"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Primary Color</label>
                    <div style={styles.colorPickerContainer}>
                      <input
                        type="color"
                        style={styles.colorInput}
                        value={branding.primaryColor}
                        onChange={(e) =>
                          setBranding({ ...branding, primaryColor: e.target.value })
                        }
                      />
                      <div
                        style={{
                          ...styles.colorSwatch,
                          backgroundColor: branding.primaryColor,
                        }}
                      />
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
                        value={branding.primaryColor}
                        onChange={(e) =>
                          setBranding({ ...branding, primaryColor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Secondary Color</label>
                    <div style={styles.colorPickerContainer}>
                      <input
                        type="color"
                        style={styles.colorInput}
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          setBranding({ ...branding, secondaryColor: e.target.value })
                        }
                      />
                      <div
                        style={{
                          ...styles.colorSwatch,
                          backgroundColor: branding.secondaryColor,
                        }}
                      />
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          setBranding({ ...branding, secondaryColor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Header</label>
                    <textarea
                      style={{ ...styles.textarea, height: '80px' }}
                      value={branding.emailHeader}
                      onChange={(e) =>
                        setBranding({ ...branding, emailHeader: e.target.value })
                      }
                      placeholder="Custom header text for emails"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Footer</label>
                    <textarea
                      style={{ ...styles.textarea, height: '80px' }}
                      value={branding.emailFooter}
                      onChange={(e) =>
                        setBranding({ ...branding, emailFooter: e.target.value })
                      }
                      placeholder="Custom footer text for emails"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Client Logo</label>
                    <div
                      style={styles.logoUploadArea}
                      onClick={() => {
                        const input = document.getElementById('logo-upload');
                        input?.click();
                      }}
                    >
                      <div style={styles.logoUploadText}>
                        Click to upload logo or drag and drop
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLogoUpload}
                      />
                    </div>
                    {branding.clientLogo && (
                      <img
                        src={branding.clientLogo}
                        alt="Logo"
                        style={styles.logoPreview}
                      />
                    )}
                  </div>

                  <button style={styles.saveButton} onClick={saveBranding}>
                    Save Branding Settings
                  </button>
                </div>
              </div>

              <div>
                <div style={styles.previewPanel}>
                  <div style={styles.previewTitle}>Live Preview</div>
                  <div style={styles.previewPortal}>
                    <div style={styles.previewHeader}>
                      {branding.clientLogo && (
                        <img
                          src={branding.clientLogo}
                          alt="Logo"
                          style={{
                            maxHeight: '40px',
                            marginBottom: '8px',
                            borderRadius: '4px',
                          }}
                        />
                      )}
                      <div style={styles.previewCompanyName}>
                        {branding.companyName || 'Client Company Name'}
                      </div>
                    </div>
                    <div style={styles.previewContent}>
                      <p style={{ marginTop: 0 }}>
                        <strong>Primary Color:</strong> {branding.primaryColor}
                      </p>
                      <p>
                        <strong>Secondary Color:</strong> {branding.secondaryColor}
                      </p>
                      <p>
                        <strong>Custom Domain:</strong>{' '}
                        {branding.customDomain || 'portal.company.com'}
                      </p>
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '12px',
                          backgroundColor: '#1A1A1A',
                          borderRadius: '4px',
                          borderLeft: `4px solid ${branding.primaryColor}`,
                        }}
                      >
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px' }}>
                          Email Header Preview:
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#AAAAAA' }}>
                          {branding.emailHeader || '(Custom header will appear here)'}
                        </p>
                      </div>
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          backgroundColor: '#1A1A1A',
                          borderRadius: '4px',
                          borderLeft: `4px solid ${branding.secondaryColor}`,
                        }}
                      >
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px' }}>
                          Email Footer Preview:
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#AAAAAA' }}>
                          {branding.emailFooter || '(Custom footer will appear here)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && <div style={styles.toast}>{toastMessage}</div>}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        select option {
          background-color: #111111;
          color: #FFFFFF;
        }
        textarea::placeholder,
        input::placeholder {
          color: #666666;
        }
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default ClientPortal;
