import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offlineStore } from '../store';
import { fetchWithAuth, getApiUrl } from '../api';

const VoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState<{ category: string, quantity: string | null } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const navigate = useNavigate();

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("Listening...");
      setParsedData(null);
    };

    recognition.onresult = async (event: any) => {
      const speechToText = event.results[0][0].transcript.toLowerCase();
      setTranscript(speechToText);
      setIsRecording(false);

      // Multilingual Natural language parsing logic (Front-end preview)
      let category = 'MEDIUM';
      
      const numMatch = speechToText.match(/\d+/);
      const qtyValue = numMatch ? parseInt(numMatch[0], 10) : null;

      if (qtyValue !== null) {
        if (qtyValue < 50) category = 'LOW';
        else if (qtyValue <= 100) category = 'MEDIUM';
        else category = 'HIGH';
      } else {
        const lowKeywords = ['low', 'no waste', 'green', 'कम', 'ಕಡಿಮೆ', 'తక్కువ', 'ਘੱਟ'];
        const highKeywords = ['high', 'leak', 'waste', 'ज्यादा', 'ಹೆಚ್ಚು', 'ಸೋರಿಕೆ', 'ఎక్కువ', 'లీక్', 'ਵੱਧ', 'ਲੀਕ'];
        
        if (lowKeywords.some(kw => speechToText.includes(kw))) category = 'LOW';
        else if (highKeywords.some(kw => speechToText.includes(kw))) category = 'HIGH';
      }
      
      setParsedData({ category, quantity: numMatch ? numMatch[0] : null });
      setIsConfirming(true);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Recognition error.");
    };

    recognition.start();
  };

  const handleConfirm = async () => {
    if (!parsedData) return;
    
    const record = { 
      usage_level: parsedData.category, 
      input_method: 'voice',
      raw_voice_text: transcript
    };

    if (!navigator.onLine) {
      offlineStore.saveAction(getApiUrl('/api/data'), 'POST', { 
        'Content-Type': 'application/json'
      }, record, 'LOG_USAGE_VOICE');
      toast.success("Offline: Voice log saved locally!");
      setIsConfirming(false);
      setTranscript('');
      setParsedData(null);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/data', {
        method: 'POST',
        body: JSON.stringify(record)
      });
      const result = await res.json();
      if (res.ok) {
        if (result.flagged) {
          toast.success("Log submitted (Under Review due to family size mismatch)");
        } else {
          toast.success("Usage logged successfully!");
        }
        setIsConfirming(false);
        setTranscript('');
        setParsedData(null);
      }
    } catch (e) {
      offlineStore.saveAction(getApiUrl('/api/data'), 'POST', { 
        'Content-Type': 'application/json'
      }, record, 'LOG_USAGE_VOICE');
      toast.success("Offline: Voice log saved locally!");
      setIsConfirming(false);
      setTranscript('');
      setParsedData(null);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <button className="btn btn-outline mb-8" onClick={() => navigate('/input')}>
          <ArrowLeft size={18} /> Back to Manual Input
        </button>

        <div className="glass-card text-center relative overflow-hidden">
          {isRecording && (
            <motion.div 
              className="absolute inset-0 bg-primary/10 z-0"
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}

          <h2 className="mb-4">IVR Voice Input</h2>
          <p className="mb-4 text-muted">Example: "20 liters low usage" or "leak detected"</p>
          
          <div className="mb-8 flex justify-center">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-black/40 border border-white/20 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5"
            >
              <option value="en-IN">English</option>
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              <option value="te-IN">Telugu (తెలుగు)</option>
              <option value="pa-IN">Punjabi (ਪੰਜਾਬੀ)</option>
            </select>
          </div>

          <div className="relative z-10">
            {!isConfirming ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleRecord}
                  className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 transition-all ${isRecording ? 'bg-red-500/20 text-red-500 ring-4 ring-red-500/20' : 'bg-primary/20 text-primary ring-4 ring-primary/20'}`}
                >
                  {isRecording ? <Square size={48} /> : <Mic size={48} />}
                </motion.button>
                <div className="p-6 bg-black/40 rounded-xl border border-white/5 italic min-h-[80px] flex items-center justify-center">
                  {transcript || "Press the mic and speak..."}
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-black/40 rounded-xl border border-primary/30"
              >
                <h3 className="text-primary mb-2">Confirm Input</h3>
                <div className="text-lg font-bold mb-1">"{transcript}"</div>
                <div className="badge badge-primary mb-6">
                  {parsedData?.category} {parsedData?.quantity ? `(${parsedData.quantity})` : ''}
                </div>
                <div className="flex gap-4">
                  <button className="btn btn-primary flex-1" onClick={handleConfirm}>Confirm</button>
                  <button className="btn btn-outline flex-1" onClick={() => {setIsConfirming(false); setParsedData(null);}}>Retry</button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
