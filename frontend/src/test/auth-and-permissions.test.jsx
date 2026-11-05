import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

function getRole() {
  return localStorage.getItem('role') || 'TEACHER';
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireTeacher({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

describe('Frontend Authentication & Authorization Route Guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>Teacher Dashboard Protected</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('allows authenticated teacher into teacher dashboard', () => {
    localStorage.setItem('token', 'fake-teacher-jwt-token');
    localStorage.setItem('role', 'TEACHER');

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RequireTeacher>
                <div>Teacher Dashboard Welcome</div>
              </RequireTeacher>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Teacher Dashboard Welcome')).toBeInTheDocument();
  });

  it('blocks teacher from accessing admin dashboard and redirects to /dashboard', () => {
    localStorage.setItem('token', 'fake-teacher-jwt-token');
    localStorage.setItem('role', 'TEACHER');

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<div>Redirected to Teacher Dashboard</div>} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <div>Admin Dashboard Secret</div>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Redirected to Teacher Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard Secret')).not.toBeInTheDocument();
  });

  it('allows admin into admin dashboard', () => {
    localStorage.setItem('token', 'fake-admin-jwt-token');
    localStorage.setItem('role', 'ADMIN');

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <div>Admin Dashboard Portal</div>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard Portal')).toBeInTheDocument();
  });
});
