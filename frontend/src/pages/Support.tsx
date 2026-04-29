import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offlineStore } from '../store';
import { fetchWithAuth, getApiUrl } from '../api';

const Support = () => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const record = { subject, description };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl('/api/incidents'), 'POST', { 
        'Content-Type': 'application/json'
      }, record, 'REPORT_INCIDENT');
      toast.success("Offline: Report saved locally!");
      navigate('/input');
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(record)
      });

      if (res.ok) {
        toast.success("Report sent to community mentor!");
        navigate('/input');
      } else {
        toast.error("Failed to send report");
      }
    } catch (e) {
      offlineStore.saveAction(getApiUrl('/api/incidents'), 'POST', { 
        'Content-Type': 'application/json'
      }, record, 'REPORT_INCIDENT');
      toast.success("Offline: Report saved locally!");
      navigate('/input');
    } finally {
      setLoading(false);
    }
  };

  const [myIncidents] = useState<any[]>([
    { id: 1, subject: 'Leakage', status: 'resolved', timestamp: new Date().toISOString() },
    { id: 2, subject: 'Waste', status: 'open', timestamp: new Date().toISOString() }
  ]);

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem', flexDirection: 'column' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', marginBottom: '2rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="btn btn-outline mb-6" onClick={() => navigate('/input')}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="text-center mb-8">
          <MessageSquare size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2>Report to Mentor</h2>
          <p className="text-muted">Report leaks, waste, or request community assistance.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="text-sm text-muted mb-1 block">Subject / Issue Type</label>
            <select 
              className="input-field" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            >
              <option value="">Select an issue...</option>
              <option value="Leakage">Water Leakage</option>
              <option value="Waste">Unnecessary Resource Waste</option>
              <option value="Supply">Supply Shortage</option>
              <option value="Assistance">Request Mentor Visit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="text-sm text-muted mb-1 block">Detailed Description</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '150px', resize: 'none' }}
              placeholder="Provide as much detail as possible (landmark, severity, etc.)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 items-start mb-6">
            <AlertCircle size={20} className="text-primary mt-1" />
            <p className="text-xs text-muted m-0">
              Your report will be sent directly to the area mentor and admin for immediate review.
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Sending...' : <><Send size={18} /> Send Report</>}
          </button>
        </form>
      </motion.div>

      {/* User Reports Tracker */}
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <h3 className="mb-4">My Recent Reports</h3>
        <div className="grid">
          {myIncidents.map(inc => (
            <div key={inc.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div className="flex-between mb-2">
                <span className="font-bold">{inc.subject}</span>
                <span className="text-xs text-muted">{new Date(inc.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="flex-between text-xs mb-1">
                <span className="text-muted">Status: {inc.status === 'resolved' ? 'Fixed' : 'Pending'}</span>
                <span className={inc.status === 'resolved' ? 'text-green-400' : 'text-primary'}>
                  {inc.status === 'resolved' ? '100%' : '20%'}
                </span>
              </div>
              <div className="progress-track" style={{ margin: '0.5rem 0' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: inc.status === 'resolved' ? '100%' : '20%',
                    background: inc.status === 'resolved' ? 'var(--color-green)' : 'var(--color-primary)'
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Support;
