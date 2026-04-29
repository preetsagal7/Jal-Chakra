import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mic, Droplet, EyeOff, History, Phone } from 'lucide-react';
import { offlineStore } from '../store';
import toast from 'react-hot-toast';
import { fetchWithAuth, getApiUrl } from '../api';

const UserInput = () => {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const navigate = useNavigate();
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (level: string) => {
    const record = {
      user_id: isAnonymous ? 0 : user?.id,
      usage_level: level
    };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl('/api/data'), 'POST', { 
        'Content-Type': 'application/json'
      }, record, 'LOG_USAGE');
      toast.success('Offline log saved. Will sync when connected.');
    } else {
      try {
        const res = await fetchWithAuth('/api/data', {
          method: 'POST',
          body: JSON.stringify(record)
        });
        if (res.ok) {
          toast.success('Usage logged successfully!');
        } else {
          throw new Error('API Error');
        }
      } catch (e) {
        offlineStore.saveAction(getApiUrl('/api/data'), 'POST', { 
          'Content-Type': 'application/json'
        }, record, 'LOG_USAGE');
        toast.success('Logged locally (Network issue)');
      }
    }

    playVoiceFeedback(level);
  };

  const playVoiceFeedback = (level: string) => {
    if (!('speechSynthesis' in window)) return;
    
    let text = '';
    if (level === 'LOW') text = "Excellent! You used very little resource today. +2 points!";
    if (level === 'MEDIUM') text = "Good job. You used a moderate amount. +1 point.";
    if (level === 'HIGH') text = "Warning. High usage detected. -2 points. Please try to save tomorrow.";

    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex-between mb-8">
        <div>
          <h2>Daily Resource Log</h2>
          <p>Track your household usage to help the community.</p>
        </div>
        <div className="flex-center gap-4">
          <label className="flex-center gap-2 text-muted" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            <EyeOff size={16} /> Anonymous
          </label>
          <button className="btn btn-outline flex-center gap-2" onClick={() => navigate('/voice')}>
            <Mic size={18} /> Voice System
          </button>
          <button className="btn btn-primary flex-center gap-2" onClick={() => navigate('/ivr')}>
            <Phone size={18} /> Call IVR
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 mb-8">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn usage-btn btn-green glass-card"
          onClick={() => handleSubmit('LOW')}
          style={{ justifyContent: 'center' }}
        >
          <Droplet size={48} />
          <span style={{ fontWeight: '800', letterSpacing: '1px' }}>LOW</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 'normal', opacity: 0.8 }}>Under 50L (+2 Pts)</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn usage-btn btn-yellow glass-card"
          onClick={() => handleSubmit('MEDIUM')}
          style={{ justifyContent: 'center' }}
        >
          <Droplet size={48} />
          <span style={{ fontWeight: '800', letterSpacing: '1px' }}>MEDIUM</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 'normal', opacity: 0.8 }}>50-100L (+1 Pt)</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn usage-btn btn-red glass-card"
          onClick={() => handleSubmit('HIGH')}
          style={{ justifyContent: 'center' }}
        >
          <Droplet size={48} />
          <span style={{ fontWeight: '800', letterSpacing: '1px' }}>HIGH</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 'normal', opacity: 0.8 }}>Over 100L (-2 Pts)</span>
        </motion.button>
      </div>

      <div className="glass-card mt-8">
        <h3 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}><History size={20} /> Personal History</h3>
        <p className="mb-4">Your recent logs for this week.</p>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div className="flex-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span>Yesterday</span>
            <span className="badge badge-green">LOW (+2)</span>
          </div>
          <div className="flex-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span>2 Days Ago</span>
            <span className="badge badge-yellow">MEDIUM (+1)</span>
          </div>
          <div className="flex-between">
            <span>3 Days Ago</span>
            <span className="badge badge-green">LOW (+2)</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-muted mb-4">Seeing a leak or issue in your community?</p>
        <button 
          className="btn btn-outline" 
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          onClick={() => navigate('/support')}
        >
          <CheckCircle size={18} /> Report Incident to Mentor
        </button>
      </div>
    </div>
  );
};


export default UserInput;
