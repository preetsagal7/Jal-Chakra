import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('NORMAL_USER');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('token', data.token);
        
        toast.success(`Welcome back, ${data.user.username}!`);
        
        if (data.user.role === 'COMMUNITY_CENTER') navigate('/dashboard');
        else if (data.user.role === 'MENTOR') navigate('/mentor');
        else navigate('/input');
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--color-primary-glow)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'var(--color-green-glow)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>
      
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="text-center mb-8">
          <Shield size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2>JAL-CHAKRA Portal</h2>
          <p>Select login type</p>
        </div>

        <div className="flex-center gap-2 mb-8" style={{ background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          {['NORMAL_USER', 'MENTOR', 'COMMUNITY_CENTER'].map((r) => (
            <button
              key={r}
              type="button"
              className={`btn ${role === r ? 'btn-primary' : ''}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', background: role === r ? '' : 'transparent', border: 'none', boxShadow: 'none', color: role === r ? 'white' : 'var(--color-text)' }}
              onClick={() => setRole(r)}
            >
              {r === 'COMMUNITY_CENTER' ? 'Admin' : r === 'MENTOR' ? 'Mentor' : 'User'}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              className="input-field" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
                marginTop: '-0.6rem'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : <><Lock size={18} /> Secure Login</>}
          </button>
        </form>

        <div className="mt-8 text-center" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          <p className="mb-4">Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Sign up now</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
