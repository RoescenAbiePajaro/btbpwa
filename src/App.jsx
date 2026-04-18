import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import CanvasArea from './components/CanvasArea';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
          <Route path="/canvas" element={isAuthenticated ? <CanvasArea /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/canvas" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;