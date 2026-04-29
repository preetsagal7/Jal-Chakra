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

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}
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
    </div>
  );
};

export default Support;
