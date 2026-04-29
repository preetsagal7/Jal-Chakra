import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, AlertOctagon, Activity, AlertCircle, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offlineStore } from '../store';
import { fetchWithAuth, getApiUrl } from '../api';

const MentorPanel = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [ivrLogs, setIvrLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user || (user.role !== 'MENTOR' && user.role !== 'COMMUNITY_CENTER')) {
      navigate('/login');
      return;
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [auditsRes, incidentsRes, ivrRes] = await Promise.all([
        fetchWithAuth('/api/verify'),
        fetchWithAuth('/api/incidents'),
        fetchWithAuth('/api/ivr')
      ]);

      if (auditsRes.ok) setPending(await auditsRes.json());
      if (incidentsRes.ok) setIncidents(await incidentsRes.json());
      if (ivrRes.ok) setIvrLogs(await ivrRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'verified' | 'flagged') => {
    const payload = { action, remarks };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl(`/api/verify/${id}`), 'POST', { 'Content-Type': 'application/json' }, payload, 'VERIFY_AUDIT');
      setPending(pending.filter((r: any) => r.id !== id));
      toast.success(`Offline: Audit ${action} queued.`);
      setSelectedReport(null);
      setRemarks('');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/verify/${id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`Audit ${action}`);
        fetchAllData();
        setSelectedReport(null);
        setRemarks('');
      }
    } catch (e) {
      offlineStore.saveAction(getApiUrl(`/api/verify/${id}`), 'POST', { 'Content-Type': 'application/json' }, payload, 'VERIFY_AUDIT');
      setPending(pending.filter((r: any) => r.id !== id));
      toast.success(`Offline: Audit ${action} queued.`);
      setSelectedReport(null);
      setRemarks('');
    }
  };

  const handleResolveIncident = async (id: number) => {
    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl(`/api/incidents/resolve/${id}`), 'POST', {}, {}, 'RESOLVE_INCIDENT');
      setIncidents(incidents.map((i: any) => i.id === id ? { ...i, status: 'resolved' } : i));
      toast.success("Offline: Incident resolve queued");
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/incidents/resolve/${id}`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success("Incident resolved");
        fetchAllData();
      }
    } catch (e) {
      offlineStore.saveAction(getApiUrl(`/api/incidents/resolve/${id}`), 'POST', {}, {}, 'RESOLVE_INCIDENT');
      setIncidents(incidents.map((i: any) => i.id === id ? { ...i, status: 'resolved' } : i));
      toast.success("Offline: Incident resolve queued");
    }
  };

  const handleVerifyIvr = async (id: number, action: 'verified' | 'rejected') => {
    const payload = { action };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl(`/api/ivr/verify/${id}`), 'POST', { 'Content-Type': 'application/json' }, payload, 'VERIFY_IVR');
      setIvrLogs(ivrLogs.filter((l: any) => l.id !== id));
      toast.success(`Offline: IVR log ${action} queued.`);
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/ivr/verify/${id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`IVR log ${action}`);
        setIvrLogs(ivrLogs.filter((l: any) => l.id !== id));
      }
    } catch (e) {
      offlineStore.saveAction(getApiUrl(`/api/ivr/verify/${id}`), 'POST', { 'Content-Type': 'application/json' }, payload, 'VERIFY_IVR');
      setIvrLogs(ivrLogs.filter((l: any) => l.id !== id));
      toast.success(`Offline: IVR log ${action} queued.`);
    }
  };

  const translateToEnglish = (text: string) => {
    if (!text) return text;
    const dict: Record<string, string> = {
      'कम': 'low', 'ಕಡಿಮೆ': 'low', 'తక్కువ': 'low', 'ਘੱਟ': 'low',
      'ज्यादा': 'high', 'ಹೆಚ್ಚು': 'high', 'ఎక్కువ': 'high', 'ਵੱਧ': 'high',
      'ಸೋರಿಕೆ': 'leak', 'లీక్': 'leak', 'ਲੀਕ': 'leak',
      'लीटर': 'liters', 'ಲೀಟರ್': 'liters', 'లీటరు': 'liters', 'లీటర్లు': 'liters', 'ਲੀਟਰ': 'liters'
    };
    let translated = text;
    Object.keys(dict).forEach(key => {
      translated = translated.replace(new RegExp(key, 'gi'), dict[key]);
    });
    return translated;
  };

  if (loading && pending.length === 0) return <div className="flex-center" style={{ height: '50vh' }}><div className="text-muted">Syncing Hub...</div></div>;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div className="flex-between mb-12">
        <div>
          <h1>Mentor Control Hub</h1>
          <p>Household usage audits and community incident reports.</p>
        </div>
        <ShieldCheck size={56} color="var(--color-primary)" />
      </div>

      {/* --- USAGE AUDITS SECTION --- */}
      <section className="mb-16">
        <h2 className="flex-center gap-3 mb-6" style={{ justifyContent: 'flex-start' }}>
          <Activity size={24} color="var(--color-primary)" /> Usage Verification Hub
        </h2>
        <div className="grid">
          <AnimatePresence>
            {pending.map(report => {
              const translatedText = translateToEnglish(report.raw_voice_text);
              return (
              <motion.div 
                key={report.id}
                className="glass-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderLeft: report.flagged ? '4px solid var(--color-red)' : '1px solid var(--color-border)' }}
              >
                <div className="flex-between">
                  <div>
                    <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                      <span className="font-bold text-lg">{report.full_name || report.username}</span>
                      <span className={`badge badge-${report.usage_level === 'LOW' ? 'green' : report.usage_level === 'MEDIUM' ? 'yellow' : 'red'}`}>
                        {report.usage_level}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted">🏠 {report.area} (Family: {report.family_members}) • 🕒 {new Date(report.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    
                    {report.input_method === 'voice' && (
                      <div className="mt-2 p-2 bg-black/30 rounded border border-white/5 italic text-sm text-primary">
                        🎙️ "{translatedText}" {report.parsed_quantity && <span className="opacity-70">({report.parsed_quantity})</span>}
                        {report.raw_voice_text !== translatedText && (
                          <div className="mt-1 text-[10px] text-white/40 not-italic">
                            Original: {report.raw_voice_text}
                          </div>
                        )}
                      </div>
                    )}

                    {report.flagged && <div className="mt-2 text-xs text-red-400 font-bold bg-red-400/10 p-2 rounded flex items-center gap-1">
                      <AlertOctagon size={14} /> SYSTEM FLAG: {report.flag_reason || 'Usage/Family mismatch detected'}
                    </div>}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline" style={{ borderColor: 'var(--color-green)', color: 'var(--color-green)' }} onClick={() => handleAction(report.id, 'verified')}><Check size={18} /></button>
                    <button className="btn btn-outline" style={{ borderColor: 'var(--color-red)', color: 'var(--color-red)' }} onClick={() => setSelectedReport(report)}><X size={18} /></button>
                  </div>
                </div>
                {selectedReport?.id === report.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mt-4 pt-4 border-t border-white/5">
                    <textarea className="input-field mb-2" placeholder="Describe the violation..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                    <button className="btn btn-red w-full" onClick={() => handleAction(report.id, 'flagged')}>Confirm Flag</button>
                  </motion.div>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
          {pending.length === 0 && <div className="glass-card text-center text-muted">No usage audits pending.</div>}
        </div>
      </section>

      {/* --- COMMUNITY INCIDENTS SECTION --- */}
      <section className="mb-16">
        <h2 className="flex-center gap-3 mb-6" style={{ justifyContent: 'flex-start' }}>
          <AlertCircle size={24} color="var(--color-primary)" /> Direct Incident Reports
        </h2>
        <div className="grid">
          <AnimatePresence>
            {incidents.map(incident => (
              <motion.div 
                key={incident.id}
                className="glass-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderLeft: incident.status === 'open' ? '4px solid var(--color-primary)' : '4px solid var(--color-green)' }}
              >
                <div className="flex-between mb-3">
                  <div>
                    <div className="badge badge-primary mb-1">{incident.subject}</div>
                    <div className="font-bold text-lg">{incident.full_name || incident.username}</div>
                    <div className="text-xs text-muted">📍 {incident.area} (House: {incident.house_id})</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted mb-2">{new Date(incident.timestamp).toLocaleString()}</div>
                    {incident.status === 'open' ? (
                      <button className="btn btn-green" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleResolveIncident(incident.id)}>Mark Resolved</button>
                    ) : (
                      <div className="badge badge-green flex-center gap-1" style={{ fontSize: '0.7rem' }}>
                        <Check size={12} /> Resolved Successfully
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 mb-2 flex-between text-xs">
                  <span className="text-muted">Resolution Progress</span>
                  <span className={incident.status === 'resolved' ? 'text-green-400 font-bold' : 'text-primary font-bold'}>
                    {incident.status === 'resolved' ? '100%' : '20% (Acknowledged)'}
                  </span>
                </div>
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: incident.status === 'resolved' ? '100%' : '20%',
                      background: incident.status === 'resolved' ? 'var(--color-green)' : 'var(--color-primary)' 
                    }}
                  />
                </div>

                <div className="p-3 bg-black/30 rounded border border-white/5 text-sm italic">
                  "{incident.description}"
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {incidents.length === 0 && <div className="glass-card text-center text-muted">No direct reports from community members.</div>}
        </div>
      </section>

      {/* --- SIMULATED IVR CALL LOGS SECTION --- */}
      <section>
        <h2 className="flex-center gap-3 mb-6" style={{ justifyContent: 'flex-start' }}>
          <PhoneCall size={24} color="var(--color-primary)" /> Simulated IVR Helpline Logs
        </h2>
        
        {/* Insights Summary */}
        <div className="glass-card mb-6 bg-primary/5 border-primary/20">
          <h3 className="text-sm font-bold text-primary mb-2">Auto-Generated Insights</h3>
          <div className="text-sm">
            {ivrLogs.length > 0 ? (
              <p>Based on {ivrLogs.length} recent calls, <strong>{Math.round((ivrLogs.filter(log => log.leakage_level !== 'No leakage').length / ivrLogs.length) * 100)}%</strong> of users are reporting leakage issues. <strong>{ivrLogs.filter(log => log.usage_level === 'HIGH').length}</strong> high-usage households identified.</p>
            ) : (
              <p className="text-muted italic">Not enough IVR data to generate insights.</p>
            )}
          </div>
        </div>

        <div className="grid">
          <AnimatePresence>
            {ivrLogs.map(log => (
              <motion.div 
                key={log.id}
                className="glass-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderLeft: '4px solid var(--color-primary)' }}
              >
                <div className="flex-between mb-3">
                  <div>
                    <div className="font-bold text-lg">{log.full_name || log.username}</div>
                    <div className="text-xs text-muted">📍 {log.area}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="text-right text-xs text-muted mr-2">
                      📞 {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--color-green)', color: 'var(--color-green)' }} title="Accept Log" onClick={() => handleVerifyIvr(log.id, 'verified')}><Check size={14} /></button>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--color-red)', color: 'var(--color-red)' }} title="Reject Log" onClick={() => handleVerifyIvr(log.id, 'rejected')}><X size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="p-3 bg-black/20 rounded border border-white/5">
                    <span className="text-muted text-[10px] uppercase tracking-wider" style={{ display: 'block', marginBottom: '6px' }}>Water Status</span>
                    <span className="font-semibold">{log.water_status}</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded border border-white/5">
                    <span className="text-muted text-[10px] uppercase tracking-wider" style={{ display: 'block', marginBottom: '6px' }}>Leakage Level</span>
                    <span className="font-semibold">{log.leakage_level}</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded border border-white/5">
                    <span className="text-muted text-[10px] uppercase tracking-wider" style={{ display: 'block', marginBottom: '6px' }}>Usage Category</span>
                    <span className="font-semibold">{log.usage_level}</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded border border-white/5">
                    <span className="text-muted text-[10px] uppercase tracking-wider" style={{ display: 'block', marginBottom: '6px' }}>Family Size</span>
                    <span className="font-semibold">{log.family_size} Members</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {ivrLogs.length === 0 && <div className="glass-card text-center text-muted">No IVR calls recorded yet.</div>}
        </div>
      </section>
    </div>
  );
};



export default MentorPanel;
