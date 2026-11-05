import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DevTestingDashboard from '../pages/DevTestingDashboard';
import { testingApi, devSimulation } from '../services/api';

vi.mock('../services/api', () => ({
  testingApi: {
    getStatus: vi.fn().mockResolvedValue({
      environment: 'development',
      db_schema: 'dev',
      is_production: false,
      counts: {
        test_teachers: 2,
        test_students: 5,
        test_passages: 2,
        test_sessions: 3,
        real_students: 40,
      },
    }),
    seedAccounts: vi.fn().mockResolvedValue({
      message: 'Seeded',
      admin_email: 'test.admin@hearmeread.test',
      teacher_email: 'test.teacher@hearmeread.test',
      admin_token: 'fake-admin-token',
      teacher_token: 'fake-teacher-token',
    }),
    generateStudents: vi.fn().mockResolvedValue({ message: '5 students created' }),
    generatePassages: vi.fn().mockResolvedValue({ message: 'Passages created' }),
    generateAssessments: vi.fn().mockResolvedValue({ message: 'Assessments created' }),
    resetTestData: vi.fn().mockResolvedValue({ message: 'Reset done cleanly' }),
  },
  devSimulation: {
    getError: vi.fn(() => null),
    setError: vi.fn(),
    getLatency: vi.fn(() => 0),
    setLatency: vi.fn(),
    getEmptyState: vi.fn(() => false),
    setEmptyState: vi.fn(),
  },
  authApi: {
    me: vi.fn().mockResolvedValue({ id: 1, email: 'test@school.edu' }),
  },
}));

describe('Developer Testing Dashboard Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders dashboard with testing environment badges', async () => {
    render(
      <BrowserRouter>
        <DevTestingDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('HearMeRead Developer Testing Dashboard')).toBeInTheDocument();
    expect(screen.getByText('TESTING BRANCH')).toBeInTheDocument();
    expect(screen.getByText('DEV DB SHARED')).toBeInTheDocument();

    await waitFor(() => {
      expect(testingApi.getStatus).toHaveBeenCalled();
    });
  });

  it('allows quick login as Admin', async () => {
    render(
      <BrowserRouter>
        <DevTestingDashboard />
      </BrowserRouter>
    );

    const adminLoginBtn = screen.getByText('Quick Log In as Admin');
    fireEvent.click(adminLoginBtn);

    await waitFor(() => {
      expect(testingApi.seedAccounts).toHaveBeenCalled();
      expect(localStorage.getItem('role')).toBe('ADMIN');
      expect(localStorage.getItem('token')).toBe('fake-admin-token');
    });
  });

  it('allows quick login as Teacher', async () => {
    render(
      <BrowserRouter>
        <DevTestingDashboard />
      </BrowserRouter>
    );

    const teacherLoginBtn = screen.getByText('Quick Log In as Teacher');
    fireEvent.click(teacherLoginBtn);

    await waitFor(() => {
      expect(testingApi.seedAccounts).toHaveBeenCalled();
      expect(localStorage.getItem('role')).toBe('TEACHER');
      expect(localStorage.getItem('token')).toBe('fake-teacher-token');
    });
  });

  it('provides simulation toggles and saves them', async () => {
    render(
      <BrowserRouter>
        <DevTestingDashboard />
      </BrowserRouter>
    );

    const emptySwitch = screen.getByLabelText(/Simulate Empty State/i);
    fireEvent.click(emptySwitch);

    const applyBtn = screen.getByText('Apply Simulation Settings');
    fireEvent.click(applyBtn);

    expect(devSimulation.setEmptyState).toHaveBeenCalledWith(true);
  });

  it('opens confirmation modal before resetting test data', async () => {
    render(
      <BrowserRouter>
        <DevTestingDashboard />
      </BrowserRouter>
    );

    const resetBtn = screen.getByText('Reset Test Data...');
    fireEvent.click(resetBtn);

    expect(screen.getByText('Confirm Test Data Reset')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('RESET')).toBeInTheDocument();
  });
});
