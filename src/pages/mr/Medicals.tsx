import React from 'react';
import { MedicalsManagement } from '../../components/admin/MedicalsManagement';
import { AppLayout } from '../../components/layout/AppLayout';

function MRMedicalsPage() {
  return (
    <AppLayout>
      <MedicalsManagement />
    </AppLayout>
  );
}

export { MRMedicalsPage };
