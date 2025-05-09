import React from 'react';
import ReportPage from '../../components/reports/ReportPage';
import { AppLayout } from '../../components/layout/AppLayout';

const MRReportsPage: React.FC = () => {
  return (
    <AppLayout>
      <ReportPage userRole="mr" />
    </AppLayout>
  );
};

export default MRReportsPage;
