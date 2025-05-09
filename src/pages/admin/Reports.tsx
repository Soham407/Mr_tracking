import React from 'react';
import ReportPage from '../../components/reports/ReportPage';
import { AppLayout } from '../../components/layout/AppLayout';

const AdminReportsPage: React.FC = () => {
  return (
    <AppLayout>
      <ReportPage userRole="admin" />
    </AppLayout>
  );
};

export default AdminReportsPage;
