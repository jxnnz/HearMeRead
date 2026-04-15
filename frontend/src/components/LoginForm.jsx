import React, { useState } from 'react';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginForm = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <input
          type="email"
          className="form-control"
          id="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /> 
      </div>

      <div className="mb-3">
        <input
          type={showPassword ? 'text' : 'password'}
          className="form-control border-eng-0"
          id="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>


      <div className="mb-3 form-check">
        <input type="checkbox" className="form-check-input" id="rememberMe" />
        <label className="form-check-label" htmlFor="rememberMe">Remember me</label>
      </div>

      <button type="submit" className="btn btn-primary w-100">
        Login
      </button>
    </form>
  );
};

export default LoginForm;