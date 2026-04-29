import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../api';

const Profile = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Other',
    family_members: '1',
    area: '',
    house_id: '',
    resource_type: 'Water'
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          full_name: data.full_name || '',
          age: data.age?.toString() || '',
          gender: data.gender || 'Other',
          family_members: data.family_members?.toString() || '1',
          area: data.area || '',
          house_id: data.house_id || '',
          resource_type: data.resource_type || 'Water'
        });
      }
    } catch (e) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Profile updated successfully!");
        // Update local storage user name
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.full_name = formData.full_name;
          localStorage.setItem('user', JSON.stringify(user));
        }
        navigate('/input');
      } else {
        toast.error("Failed to update profile");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '50vh' }}>Loading...</div>;

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex-between mb-8">
          <button className="btn btn-outline" onClick={() => navigate('/input')}>
            <ArrowLeft size={18} />
          </button>
          <div className="text-center flex-1">
            <User size={48} color="var(--color-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            <h2>Edit Profile</h2>
            <p className="text-muted">Update your household details</p>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="form-group">
            <label className="text-sm text-muted mb-1 block">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="text-sm text-muted mb-1 block">Age</label>
              <input 
                type="number" 
                className="input-field" 
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="text-sm text-muted mb-1 block">Gender</label>
              <select 
                className="input-field" 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="text-sm text-muted mb-1 block">Family Members</label>
              <input 
                type="number" 
                className="input-field" 
                value={formData.family_members}
                onChange={e => setFormData({...formData, family_members: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="text-sm text-muted mb-1 block">Resource Type</label>
              <select 
                className="input-field" 
                value={formData.resource_type}
                onChange={e => setFormData({...formData, resource_type: e.target.value})}
              >
                <option value="Water">Water</option>
                <option value="Electricity">Electricity</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="text-sm text-muted mb-1 block">Area / Locality</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.area}
              onChange={e => setFormData({...formData, area: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="text-sm text-muted mb-1 block">House Identifier / Landmark</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.house_id}
              onChange={e => setFormData({...formData, house_id: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-6">
            <Save size={18} className="mr-2" /> Save Changes
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-muted">
          <Shield size={14} /> 
          Your household data is encrypted and secure.
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
