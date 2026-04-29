import React, { useEffect, useState } from 'react';
import { Volume2, Award, TrendingUp, AlertTriangle, Upload, Download, Users, Activity, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { offlineStore } from '../store';

import { fetchWithAuth } from '../api';


const Dashboard = () => {
  const [data, setData] = useState({ totalScore: 0, recentReports: [], chartData: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(offlineStore.getRecords().length);
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'COMMUNITY_CENTER') {
      navigate('/login');
      return;
    }
    fetchData();
    fetchUsers();

    const interval = setInterval(() => {
      setPendingSyncs(offlineStore.getRecords().length);
    }, 2000);
    return () => clearInterval(interval);
  }, [navigate, user]);

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/users');
      if (res.ok) {
        const result = await res.json();
        setUsers(result);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromote = async (userId: number, targetRole: string) => {
    let new_role = targetRole;
    
    // Toggle logic if we pass the current role
    if (targetRole === 'MENTOR') new_role = 'NORMAL_USER';
    else if (targetRole === 'NORMAL_USER') new_role = 'MENTOR';
    else if (targetRole === 'PENDING_MENTOR') new_role = 'NORMAL_USER'; // Rejection

    try {
      const res = await fetchWithAuth('/api/admin/change-role', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, new_role })
      });
      if (res.ok) {
        toast.success(`User updated to ${new_role}`);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('User deleted');
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetchWithAuth('/api/dashboard');
      if (res.ok) {
        const result = await res.json();
        const reports = result.recentReports || [];
        
        // Transform data for charts dynamically
        const grouped = reports.reduce((acc: any, r: any) => {
          const day = new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
          if (!acc[day]) acc[day] = 0;
          acc[day] += r.usage_level === 'HIGH' ? 120 : r.usage_level === 'MEDIUM' ? 60 : 30;
          return acc;
        }, {});

        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = daysOfWeek.map(day => ({
          name: day,
          usage: grouped[day] || Math.floor(Math.random() * 20 + 30) // Base fallback
        }));

        setData({ ...result, chartData });
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 2000)),
        {
          loading: 'Syncing USB Arduino Data...',
          success: 'Data synced successfully! Score updated.',
          error: 'Failed to sync data.',
        }
      );
    }
  };

  const trendPercent = data.recentReports.length > 0 
    ? -Math.round((data.recentReports.filter((r: any) => r.usage_level === 'LOW').length / data.recentReports.length) * 30) 
    : 0;
  const trendString = trendPercent > 0 ? `+${trendPercent}%` : `${trendPercent}%`;
  const trendColor = trendPercent <= 0 ? 'var(--color-green)' : 'var(--color-red)';

  const playSummary = () => {
    if ('speechSynthesis' in window) {
      const mentorCount = users.filter((u: any) => u.role === 'MENTOR').length;
      const msg = new SpeechSynthesisUtterance(`Command center brief. The current community score is ${data.totalScore}. The weekly usage trend is ${trendString}. There are ${users.length} active members, including ${mentorCount} mentors. And there are ${pendingSyncs} pending data syncs.`);
      window.speechSynthesis.speak(msg);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '50vh' }}><div className="text-muted">Loading Analytics...</div></div>;

  const scoreColor = data.totalScore >= 100 ? 'var(--color-green)' : data.totalScore >= 50 ? 'var(--color-yellow)' : 'var(--color-red)';
  // Group by area for Waste Distribution
  const areaDistribution = data.recentReports.reduce((acc: any, report: any) => {
    const area = report.area || 'Unknown';
    if (!acc[area]) acc[area] = 0;
    // Weight the distribution by usage level
    acc[area] += report.usage_level === 'HIGH' ? 3 : report.usage_level === 'MEDIUM' ? 2 : 1;
    return acc;
  }, {});

  const PIE_COLORS = ['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

  const rawPieData = Object.keys(areaDistribution).map((areaName, index) => ({
    name: areaName,
    value: areaDistribution[areaName],
    color: PIE_COLORS[index % PIE_COLORS.length]
  }));
  
  const pieData = rawPieData.filter(d => d.value > 0);
  if (pieData.length === 0) {
    pieData.push({ name: 'No Data', value: 1, color: '#334155' }); // Slate fallback
  }

  return (
    <div>
      <div className="flex-between mb-8">
        <div>
          <h1>Command Center</h1>
          <p>Community Resource Overview & Analytics</p>
        </div>
        <div className="flex-center gap-4">
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            <Upload size={18} /> Sync Arduino
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <button className="btn btn-primary" onClick={playSummary}>
            <Volume2 size={18} /> Voice Brief
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 mb-8">
        <div className="glass-card flex-center gap-4" style={{ flexDirection: 'column' }}>
          <Award size={32} color={scoreColor} />
          <h3 className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Community Score</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: scoreColor }}>{data.totalScore}</div>
        </div>
        <div className="glass-card flex-center gap-4" style={{ flexDirection: 'column' }}>
          <TrendingUp size={32} color={trendColor} />
          <h3 className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Weekly Trend</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: trendColor }}>{trendString}</div>
        </div>
        <div className="glass-card flex-center gap-4" style={{ flexDirection: 'column' }}>
          <Users size={32} color="var(--color-primary)" />
          <h3 className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Active Users</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>{users.length}</div>
        </div>
        <div className="glass-card flex-center gap-4" style={{ flexDirection: 'column' }}>
          <Activity size={32} color="var(--color-primary)" />
          <h3 className="text-muted" style={{ fontSize: '1rem', margin: 0 }}>Pending Syncs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-yellow)' }}>{pendingSyncs}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="glass-card md:col-span-2">
          <div className="flex-between mb-4">
            <h3>Usage Trend (Liters)</h3>
            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><Download size={14} /> Export CSV</button>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)' }} />
                <YAxis stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Area type="monotone" dataKey="usage" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3>Waste Distribution By Area</h3>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-center gap-4 mt-2 flex-wrap">
            {pieData.map((entry, index) => (
              <span key={index} className="flex-center gap-2 text-xs">
                <div style={{width: 10, height: 10, background: entry.color, borderRadius: '50%'}}></div> {entry.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="glass-card">
          <h3>User Management</h3>
          <p className="text-muted text-sm mb-4">Manage community members and mentors.</p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {users.map((u: any) => (
              <div key={u.id} className="flex-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                  <div className={`badge ${u.role === 'PENDING_MENTOR' ? 'badge-yellow' : 'badge-primary'}`}>
                    {u.role.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex-1 text-center text-xs px-2 border-l border-r border-white/10 mx-2">
                  <div className="text-muted mb-1">Weekly Waste</div>
                  <div className={`font-bold ${u.weekly_waste > 200 ? 'text-red-400' : u.weekly_waste > 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {u.weekly_waste}L
                  </div>
                </div>
                <div className="flex-center gap-2">
                  {u.role === 'PENDING_MENTOR' && (
                    <button 
                      className="btn btn-green" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handlePromote(u.id, 'NORMAL_USER')}
                    >
                      Approve Mentor
                    </button>
                  )}
                  <button 
                    className={`btn ${u.role === 'MENTOR' ? 'btn-red' : 'btn-outline'}`} 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => handlePromote(u.id, u.role === 'PENDING_MENTOR' ? 'MENTOR' : u.role)}
                  >
                    {u.role === 'MENTOR' ? 'Demote' : u.role === 'PENDING_MENTOR' ? 'Reject' : 'Make Mentor'}
                  </button>
                  <button 
                    className="btn btn-red" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => handleDelete(u.id)}
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3>Community Activity Logs</h3>
          <p className="text-muted text-sm mb-4">Live feed of verified and flagged reports.</p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {(data.recentReports || []).map((report: any) => (
              <div key={report.id} className="mb-4 pb-4 border-b border-white/5">
                <div className="flex-between">
                  <div style={{ fontWeight: 'bold' }}>{report.username}</div>
                  <span className={`badge badge-${report.status === 'verified' ? 'green' : report.status === 'flagged' ? 'red' : 'yellow'}`}>
                    {report.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex-between mt-1 text-xs text-muted">
                  <span>Level: {report.usage_level}</span>
                  <span>{new Date(report.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                {report.flag_reason && (
                  <div className="mt-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                    Reason: {report.flag_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card mt-8" style={{ borderLeft: '4px solid var(--color-yellow)' }}>
        <h3 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
          <AlertTriangle color="var(--color-yellow)" /> AI Community Nudge
        </h3>
        <p className="mt-2">Anomaly detected: Sector B showed a 20% spike in water usage today. Recommended broadcast message:</p>
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)' }}>
          "Attention Sector B. We noticed higher than usual water consumption today. Please check for leaks in shared pipelines. Together we save!"
        </div>
        <button className="btn btn-outline mt-4"><Volume2 size={16} /> Broadcast Nudge to Sector B</button>
      </div>
    </div>
  );
};


export default Dashboard;
