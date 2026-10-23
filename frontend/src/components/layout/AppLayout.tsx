import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import OnboardingWizardModal from '../OnboardingWizardModal';
import ErrorBoundary from '../common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <ErrorBoundary fallbackTitle="Navigation & Header Notice">
          <TopNav onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        </ErrorBoundary>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <ErrorBoundary fallbackTitle="Workspace Page Notice">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal />
    </div>
  );
};

export default AppLayout;
