import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Home, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../api';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Other',
    family_members: '1',
    area: '',
    house_id: '',
    resource_type: 'Water'
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      const res = await fetchWithAuth('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Profile completed! Welcome to JAL-CHAKRA.");
        // Update local user object
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.profile_completed = 1;
          localStorage.setItem('user', JSON.stringify(user));
        }
        onComplete();
      } else {
        toast.error("Failed to save profile.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const steps = [
    {
      title: "Basic Details",
      icon: <User size={32} />,
      content: (
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Full Name" 
            className="input-field" 
            value={formData.full_name}
            onChange={e => setFormData({...formData, full_name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="number" 
              placeholder="Age" 
              className="input-field" 
              value={formData.age}
              onChange={e => setFormData({...formData, age: e.target.value})}
            />
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
      )
    },
    {
      title: "Household Info",
      icon: <Users size={32} />,
      content: (
        <div className="space-y-4">
          <label className="text-sm text-muted">Number of Family Members</label>
          <input 
            type="number" 
            className="input-field" 
            value={formData.family_members}
            onChange={e => setFormData({...formData, family_members: e.target.value})}
          />
          <input 
            type="text" 
            placeholder="Area / Locality Name" 
            className="input-field" 
            value={formData.area}
            onChange={e => setFormData({...formData, area: e.target.value})}
          />
        </div>
      )
    },
    {
      title: "Location Details",
      icon: <Home size={32} />,
      content: (
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="House Number / Landmark" 
            className="input-field" 
            value={formData.house_id}
            onChange={e => setFormData({...formData, house_id: e.target.value})}
          />
          <label className="text-sm text-muted">Primary Resource to Track</label>
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
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        className="glass-card w-full max-w-lg p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-full bg-primary/20 text-primary">
            {steps[step-1].icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{steps[step-1].title}</h2>
            <p className="text-muted">Step {step} of 3</p>
          </div>
        </div>

        <div className="mb-12 min-h-[200px]">
          {steps[step-1].content}
        </div>

        <div className="flex justify-between mt-auto pt-8 border-t border-white/10">
          <button 
            className={`btn btn-outline ${step === 1 ? 'invisible' : ''}`}
            onClick={prevStep}
          >
            <ArrowLeft size={18} /> Back
          </button>
          
          {step < 3 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Next <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit}>
              Complete Profile <CheckCircle size={18} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-8">
          {[1,2,3].map(s => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
