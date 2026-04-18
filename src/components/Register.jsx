import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/register', { username, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/canvas');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A192F]">
      <div className="bg-[#112240] p-8 rounded-xl shadow-2xl w-96">
        <h2 className="text-3xl font-bold text-center mb-6 text-[#64FFDA]">Beyond The Brush</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 mb-4 bg-[#1E3A5F] text-white rounded-lg" required />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 mb-4 bg-[#1E3A5F] text-white rounded-lg" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-[#1E3A5F] text-white rounded-lg" required />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-[#64FFDA] text-[#0A192F] font-bold py-3 rounded-lg hover:bg-[#52e0c4] transition">Register</button>
        </form>
        <p className="text-center text-gray-400 mt-4">Already have an account? <a href="/login" className="text-[#64FFDA]">Login</a></p>
      </div>
    </div>
  );
};

export default Register;
