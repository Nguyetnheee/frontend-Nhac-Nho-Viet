import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import apiAuth from '../services/apiAuth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Only fetch user profile if not on login page
      if (window.location.pathname !== '/login') {
        fetchUserProfile();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Only logout if not on login page to avoid refresh
      if (window.location.pathname !== '/login') {
        logout();
      } else {
        // Just clear the token without redirecting
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        delete apiAuth.defaults.headers.common['Authorization'];
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token: newToken, ...userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Đăng nhập thất bại' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await api.post('/api/auth/register', userData);
      return { success: true };
    } catch (error) {
      // Log chi tiết lỗi ra console để dễ kiểm tra
      console.error('Register error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      return {
        success: false,
        error: error.response?.data?.message || 'Đăng ký thất bại'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/api/users/profile', profileData);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Cập nhật thông tin thất bại' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isShipper: user?.role === 'Shipper'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
