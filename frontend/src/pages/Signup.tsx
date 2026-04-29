import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../api';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [role, setRole] = useState('NORMAL_USER');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      });

      const data = await res.json();
      
      if (res.ok) {
        if (role === 'MENTOR') {
          toast.success('Mentor request sent! Admin will approve soon.');
        } else {
          toast.success('Account created! Please login.');
        }
        navigate('/login');
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center mb-8">
          <UserPlus size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2>Join JAL-CHAKRA</h2>
          <p>Select your community role</p>
        </div>
        
        <form onSubmit={handleSignup}>
          <div className="flex-center gap-4 mb-6">
            <button 
              type="button"
              className={`btn ${role === 'NORMAL_USER' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={() => setRole('NORMAL_USER')}
            >
              Member
            </button>
            <button 
              type="button"
              className={`btn ${role === 'MENTOR' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={() => setRole('MENTOR')}
            >
              Mentor
            </button>
          </div>

          <input 
            type="text" 
            className="input-field" 
            placeholder="Choose Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Create Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : role === 'MENTOR' ? 'Request Mentor Access' : 'Register Account'}
          </button>
        </form>

        <div className="mt-8 text-center" style={{ fontSize: '0.875rem' }}>
          <p className="text-muted">Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Login here</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
