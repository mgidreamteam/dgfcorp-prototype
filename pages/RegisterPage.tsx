import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).some(value => (value as string).trim() === '')) {
      setError('Please fill out all fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Save profile to Firestore natively
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        username: formData.username,
        email: formData.email,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Synchronize backend architecture mapping
      await setDoc(doc(db, 'authUidToRole', user.uid), {
        roles: ['user']
      });

      // Navigate to /dashboard securely
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden py-12">
      <div className="relative z-10 w-full max-w-xl p-8 bg-zinc-900/50 border border-zinc-700/80 rounded-2xl backdrop-blur-md shadow-2xl animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-white/10 mb-4">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Register for D.R.E.A.M.</h2>
          <p className="text-zinc-400 mt-2 text-sm">Create your profile to request access to the Studio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className="bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
            />
            <input
              type="text"
              name="username"
              placeholder="Unique Username"
              value={formData.username}
              onChange={handleChange}
              className="bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
            />
          </div>
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors"
          />

          {error && <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-white text-black font-bold rounded-lg px-4 py-3 hover:bg-zinc-200 transition-colors disabled:bg-zinc-600 disabled:text-zinc-400 flex justify-center items-center gap-2"
          >
            {loading ? 'Registering...' : 'Register Route'} 
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <p className="text-zinc-400 text-xs text-center px-4 leading-relaxed">
            By creating an account, you agree to abide by the terms of our NDA and acknowledge you are accessing a confidential system.
          </p>
          <p className="text-zinc-400 text-sm text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-white hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
