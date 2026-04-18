import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ setAuth }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { identifier, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setAuth(true);
      navigate('/canvas');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A192F]">
      <div className="bg-[#112240] p-8 rounded-xl shadow-2xl w-96">
        <h2 className="text-3xl font-bold text-center mb-6 text-[#64FFDA]">Beyond The Brush</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Email or Username" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full p-3 mb-4 bg-[#1E3A5F] text-white rounded-lg" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-[#1E3A5F] text-white rounded-lg" required />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-[#64FFDA] text-[#0A192F] font-bold py-3 rounded-lg hover:bg-[#52e0c4] transition">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;