import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offlineStore } from '../store';
import { fetchWithAuth, getApiUrl } from '../api';

const IvrCall = () => {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  
  const navigate = useNavigate();

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (callState === 'connected') {
      handleStepChange(step);
    }
  }, [callState, step]);

  const handleStepChange = (currentStep: number) => {
    switch (currentStep) {
      case 0:
        speak("Welcome to JAL-CHAKRA Water Helpline. Please wait while we connect your call.");
        setTimeout(() => setStep(1), 3500);
        break;
      case 1:
        speak("Press 1 for English. Press 2 for local language.");
        break;
      case 2:
        speak("Question 1. Water Availability. Press 1 for No water. Press 2 for Limited supply. Press 3 for Adequate supply.");
        break;
      case 3:
        speak("Question 2. Leakage Issue. Press 1 for No leakage. Press 2 for Minor leakage. Press 3 for Major leakage.");
        break;
      case 4:
        speak("Question 3. Daily Usage Estimate. Press 1 for Low. Press 2 for Medium. Press 3 for High.");
        break;
      case 5:
        speak("Question 4. Family Size. Please press a number key.");
        break;
      case 6:
        const summary = `You selected: Water ${getAnsString(answers.q1, ['No water', 'Limited supply', 'Adequate supply'])}, Leakage ${getAnsString(answers.q2, ['No leakage', 'Minor leakage', 'Major leakage'])}, Usage ${getAnsString(answers.q3, ['Low', 'Medium', 'High'])}, Family size ${answers.q4}. Press 1 to confirm, or 2 to retry.`;
        speak(summary);
        break;
    }
  };

  const getAnsString = (val: string, options: string[]) => {
    const idx = parseInt(val) - 1;
    return options[idx] || val;
  };

  const handleKeypad = (num: string) => {
    if (callState !== 'connected') return;

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (['1','2','3'].includes(num)) { setAnswers({...answers, q1: num}); setStep(3); }
    } else if (step === 3) {
      if (['1','2','3'].includes(num)) { setAnswers({...answers, q2: num}); setStep(4); }
    } else if (step === 4) {
      if (['1','2','3'].includes(num)) { setAnswers({...answers, q3: num}); setStep(5); }
    } else if (step === 5) {
      setAnswers({...answers, q4: num});
      setStep(6);
    } else if (step === 6) {
      if (num === '1') {
        speak("Thank you. Your report has been submitted. Goodbye.");
        submitIVR();
        setTimeout(() => endCall(), 3000);
      } else if (num === '2') {
        setAnswers({});
        setStep(2);
      }
    }
  };

  const submitIVR = async () => {
    const payload = {
      waterStatus: getAnsString(answers.q1, ['No water', 'Limited supply', 'Adequate supply']),
      leakageLevel: getAnsString(answers.q2, ['No leakage', 'Minor leakage', 'Major leakage']),
      usageLevel: getAnsString(answers.q3, ['LOW', 'MEDIUM', 'HIGH']),
      familySize: parseInt(answers.q4) || 1
    };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl('/api/ivr'), 'POST', { 
        'Content-Type': 'application/json'
      }, payload, 'LOG_IVR');
      toast.success("Offline: IVR log saved locally!");
      return;
    }

    try {
      await fetchWithAuth('/api/ivr', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (e) {
      offlineStore.saveAction(getApiUrl('/api/ivr'), 'POST', { 
        'Content-Type': 'application/json'
      }, payload, 'LOG_IVR');
      toast.success("Offline: IVR log saved locally!");
    }
  };

  const startCall = () => {
    setCallState('calling');
    setTimeout(() => {
      setCallState('connected');
      setStep(0);
    }, 1500);
  };

  const endCall = () => {
    window.speechSynthesis.cancel();
    setCallState('ended');
    setTimeout(() => navigate('/input'), 2000);
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '350px', padding: 0, overflow: 'hidden', borderRadius: '30px' }}>
        
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '2rem 1rem', textAlign: 'center' }}>
          <div className="text-muted text-sm mb-2">Simulated IVR Line</div>
          <h2 className="text-primary font-mono tracking-wider mb-4">+91-00000-00000</h2>
          
          {callState === 'idle' && (
            <div className="text-sm text-muted">Ready to call</div>
          )}
          {callState === 'calling' && (
            <div className="text-sm text-yellow-400 animate-pulse">Calling...</div>
          )}
          {callState === 'connected' && (
            <div>
              <div className="text-sm text-green-400 mb-4">Connected (00:0{step})</div>
              {step > 1 && step < 6 && <div className="badge badge-primary">Question {step - 1} of 4</div>}
              {step === 6 && <div className="badge badge-yellow">Confirmation</div>}
              
              <div className="flex justify-center gap-1 mt-4 h-8 items-end">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ['20%', '100%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 0.8 + Math.random(), delay: i * 0.1 }}
                    style={{ width: '4px', background: 'var(--color-primary)', borderRadius: '2px' }}
                  />
                ))}
              </div>
            </div>
          )}
          {callState === 'ended' && (
            <div className="text-sm text-red-400">Call Ended</div>
          )}
        </div>

        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
          <div className="grid grid-cols-3 gap-6 mb-8 px-4">
            {[
              { n: '1', l: '' }, { n: '2', l: 'ABC' }, { n: '3', l: 'DEF' },
              { n: '4', l: 'GHI' }, { n: '5', l: 'JKL' }, { n: '6', l: 'MNO' },
              { n: '7', l: 'PQRS'}, { n: '8', l: 'TUV' }, { n: '9', l: 'WXYZ'},
              { n: '*', l: '' }, { n: '0', l: '+' }, { n: '#', l: '' }
            ].map((btn) => (
              <motion.button
                key={btn.n}
                whileTap={{ scale: 0.9, backgroundColor: 'rgba(255,255,255,0.15)' }}
                className="flex-center"
                style={{ 
                  flexDirection: 'column',
                  aspectRatio: '1/1', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  cursor: callState === 'connected' ? 'pointer' : 'not-allowed',
                  opacity: callState === 'connected' ? 1 : 0.6
                }}
                onClick={() => handleKeypad(btn.n)}
                disabled={callState !== 'connected'}
              >
                <div style={{ fontSize: '2rem', fontWeight: 400, lineHeight: 1 }}>{btn.n}</div>
                {btn.l && <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '2px', marginTop: '4px' }}>{btn.l}</div>}
              </motion.button>
            ))}
          </div>

          <div className="flex-center">
            {callState === 'idle' ? (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-green"
                style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)' }}
                onClick={startCall}
              >
                <Phone size={24} />
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-red"
                style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, boxShadow: '0 0 20px rgba(248, 113, 113, 0.4)' }}
                onClick={endCall}
              >
                <PhoneOff size={24} />
              </motion.button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default IvrCall;
