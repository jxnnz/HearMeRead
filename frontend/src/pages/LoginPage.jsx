import { useState } from "react";
import LoginForm from '../components/LoginForm';

const LoginPage = () => {
  const handleLogin = ({ email, password }) => {
    console.log('Logging in with:', email, password);
    // Add your authentication

  const [errors, setErrors] = useState({});

  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{ backgroundColor: '#F5F9FC' }}
    >
      <div
        className="d-flex rounded-4 overflow-hidden shadow"
        style={{ width: '780px', minHeight: '460px', backgroundColor: '#fff' }}
      >
        {/* Left Panel - Blue Decorative Area */}
        <div
          className="d-none d-md-block"
          style={{
            width: '40%',
            backgroundColor: '#29ABE2',
            borderRadius: '16px',
          }}
        />

        {/* Right Panel - Login Form */}
        <div
          className="d-flex flex-column justify-content-center px-5 py-4"
          style={{ width: '60%' }}
        >
          <h3 className="fw-bold mb-1" style={{ color: '#1A2B3C' }}>
            Welcome Back!
          </h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
            Login to access your account
          </p>

          <LoginForm onSubmit={handleLogin} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;