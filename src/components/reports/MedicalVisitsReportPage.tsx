import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // For potential reset button
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For Date Picker
import { Calendar } from "@/components/ui/calendar"; // For Date Picker
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For Filters
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from "date-fns"; // Import more date-fns functions
import { Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"; // Import pagination components
import { AppLayout } from '@/components/layout/AppLayout';
interface ReportPageProps {
  userRole: 'admin' | 'mr';
}

interface SupabaseError {
  message: string;
  code?: string;
}

// Define the structure for Report data (after processing)
interface ReportEntry {
  id: string; // Visit ID
  visit_date: string;
  notes: string | null;
  status: string;
  mrId: string;
  medicalId: string; // Add medicalId
  medicalName?: string; // Add medicalName
  medicineId: string;
  medicineName: string;
  quantity: number;
  uniqueRowId: string; // Unique key for table rows
  mrName?: string; // Add mrName
}

// Type for the data structure returned directly by the Supabase query for medical_visits
type MedicalVisitData = {
  id: string;
  visit_date: string;
  notes: string | null;
  status: string;
  mr_id: string;
  medical_area_id: string; // Include medical_area_id
  profiles: { name: string | null } | null; // Include profiles with name, allow name to be null
};

// Type for the data structure returned directly by the Supabase query for medical_visit_orders
type MedicalVisitOrderData = {
    id: string;
    medical_visit_id: string;
    medicine_id: string;
    quantity: number;
    medicines: { name: string } | null;
};

// Type for the data structure returned directly by the Supabase query for medicals
type MedicalData = {
    id: string;
    name: string;
};


// Types for filter options
interface FilterOption {
  value: string;
  label: string;
}

const MedicalVisitsReportPage: React.FC<ReportPageProps> = ({ userRole }) => {
  const { user } = useAuth(); // Get the current user
  // General state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalReports, setTotalReports] = useState(0); // State to hold total count of *filtered* data before pagination

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page

  // Search state (for MR view)
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state (for Admin view)
  const [mrOptions, setMrOptions] = useState<FilterOption[]>([]);
  const [selectedMr, setSelectedMr] = useState<string>('all'); // 'all' or MR ID
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // State to hold the full processed data (before client-side filtering/pagination)
  const [processedData, setProcessedData] = useState<ReportEntry[]>([]);


  // Fetch initial data and filter options based on role
  useEffect(() => {
    setProcessedData([]); // Clear data on role change
    setError(null);
    setCurrentPage(1); // Reset to first page

    if (userRole === 'mr') {
      setSearchTerm('');
      resetAdminFilters(); // Reset admin filters if switching to MR
      fetchReports();
    } else if (userRole === 'admin') {
      setSearchTerm(''); // Reset MR search if switching to Admin
      resetAdminFilters();
      fetchFilterOptions(); // Fetch MR options for admin
      fetchReports(); // Fetch reports for admin (will apply initial 'all' filter)
    } else {
      setLoading(false); // No role, stop loading
    }
  }, [userRole]); // Only run when userRole changes

  // Re-fetch reports when filters or pagination change
  useEffect(() => {
    // Avoid fetching if role hasn't been determined yet or during initial load triggered by role change
    if (userRole) {
        fetchReports();
    }
  }, [selectedMr, startDate, endDate, searchTerm, currentPage, itemsPerPage, userRole]); // Add userRole back if fetch depends on it


  const resetAdminFilters = () => {
      setSelectedMr('all');
      setStartDate(undefined);
      setEndDate(undefined);
  }

  // Fetch MR filter options (only for admin)
  const fetchFilterOptions = async () => {
    // No need to set loading here, fetchReports handles it
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'mr');

      if (error) throw error;

      setMrOptions(data?.map(mr => ({ value: mr.id, label: mr.name })) || []);

    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error fetching MR filter options:", error);
      // Don't set main error state, maybe a specific filter error state?
      setMrOptions([]);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      let userId = null;
      if (userRole === 'mr') { // Fetch user ID only if role is MR
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userId = authUser?.id;
        if (!userId) throw new Error('MR user not found');
      }

      // Fetch medical visits
      let visitsQuery = supabase
        .from('medical_visits')
        .select(`
          id,
          visit_date,
          notes,
          status,
          mr_id,
          medical_area_id
        `);

      // Apply server-side MR filter
      if (userRole === 'mr' && userId) {
        visitsQuery = visitsQuery.eq('mr_id', userId);
      } else if (userRole === 'admin' && selectedMr !== 'all') {
        visitsQuery = visitsQuery.eq('mr_id', selectedMr);
      }

       // Apply server-side date filters if needed (can improve performance)
      // Example:
      // if (startDate) visitsQuery = visitsQuery.gte('visit_date', startDate.toISOString());
      // if (endDate) visitsQuery = visitsQuery.lte('visit_date', endDate.toISOString());


      const { data: visitsData, error: visitsError } = await visitsQuery
        .order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;

      // Fetch medical visit orders with medicine names
      const { data: ordersData, error: ordersError } = await supabase
        .from('medical_visit_orders')
        .select(`
            id,
            medical_visit_id,
            medicine_id,
            quantity,
            medicines (
                name
            )
        `);

      if (ordersError) throw ordersError;

      // Fetch medical facilities
      const { data: medicalsData, error: medicalsError } = await supabase
        .from('medicals')
        .select(`
            id,
            name
        `);

      if (medicalsError) throw medicalsError;

      const medicalsMap = new Map(medicalsData?.map(medical => [medical.id, medical.name]));


      // Process the data into ReportEntry format
      const processedResult: ReportEntry[] = [];

      (visitsData as any[] || []).forEach(visit => { // Use any[] for initial data
          const relatedOrders = (ordersData as MedicalVisitOrderData[] || []).filter(order => order.medical_visit_id === visit.id);

          if (relatedOrders.length > 0) {
              relatedOrders.forEach((order, orderIndex) => {
                  const medicalName = medicalsMap.get(visit.medical_area_id) || 'N/A'; // Client-side join

                  processedResult.push({
                      uniqueRowId: `${visit.id}-${order.medicine_id}-${orderIndex}`,
                      id: visit.id,
                      visit_date: visit.visit_date,
                      notes: visit.notes,
                      status: visit.status,
                      mrId: visit.mr_id,
                      medicalId: visit.medical_area_id,
                      medicalName: medicalName,
                      medicineId: order.medicine_id,
                      medicineName: order.medicines?.name || 'N/A',
                      quantity: order.quantity,
                      mrName: visit.profiles?.name || 'N/A', // Extract MR Name
                  });
              });
          } else {
               // Include visits with no orders if necessary, though current structure implies orders
               const medicalName = medicalsMap.get(visit.medical_area_id) || 'N/A';
               processedResult.push({
                    uniqueRowId: `${visit.id}-no-orders`, // Unique ID for visits with no orders
                    id: visit.id,
                    visit_date: visit.visit_date,
                    notes: visit.notes,
                    status: visit.status,
                    mrId: visit.mr_id,
                    medicalId: visit.medical_area_id,
                    medicalName: medicalName,
                    medicineId: 'N/A', // No medicine for visits without orders
                    medicineName: 'N/A',
                    quantity: 0,
                    mrName: visit.profiles?.name || 'N/A', // Extract MR Name
               });
          }
      });


      setProcessedData(processedResult);

    } catch (err: unknown) {
      console.error('Error fetching reports:', err);
      const error = err as SupabaseError;
      setError(error.message || 'Failed to fetch reports. Please try again.');
      setProcessedData([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering and pagination logic
  const paginatedFilteredData = useMemo(() => {
    let filtered = processedData;

    // Apply client-side filters
    if (userRole === 'admin') {
        // Date Range Filter (already applied server-side if uncommented above)
        // If not applied server-side, apply here:
        filtered = filtered.filter(entry => {
            try {
                const entryDate = parseISO(entry.visit_date);
                const isAfterStartDate = startDate ? !isBefore(entryDate, startOfDay(startDate)) : true;
                const isBeforeEndDate = endDate ? !isAfter(entryDate, endOfDay(endDate)) : true;
                return isAfterStartDate && isBeforeEndDate;
            } catch (e) {
                console.error("Error parsing or comparing date for client-side filtering:", entry.visit_date, e);
                return false;
            }
        });
    } else if (userRole === 'mr' && searchTerm) {
         // MR View: Simple text search
         const lowerCaseSearchTerm = searchTerm.toLowerCase();
         filtered = filtered.filter(entry =>
             entry.medicineName.toLowerCase().includes(lowerCaseSearchTerm) ||
             entry.visit_date.toLowerCase().includes(lowerCaseSearchTerm) ||
             entry.status.toLowerCase().includes(lowerCaseSearchTerm) ||
             entry.medicalName?.toLowerCase().includes(lowerCaseSearchTerm) // Include medical name in search
         );
    }

    // Update total count based on *filtered* data
    setTotalReports(filtered.length);

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);

  }, [processedData, userRole, searchTerm, startDate, endDate, currentPage, itemsPerPage]); // Dependencies for filtering/pagination


  // --- Render Functions ---

  const renderAdminFilters = () => (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MR Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">MR</label>
          <Select value={selectedMr} onValueChange={setSelectedMr}>
            <SelectTrigger>
              <SelectValue placeholder="Select MR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All MRs</SelectItem>
              {mrOptions.map((mr) => (
                <SelectItem key={mr.value} value={mr.value}>
                  {mr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Range</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetAdminFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  );

  const renderMrSearch = () => (
     <div className="mb-4">
        <Input
          type="search"
          placeholder="Search reports (Medicine, Date, Status, Medical)..." // Updated placeholder
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
  );

  const renderReportTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {userRole === 'admin' && <TableHead>MR Name</TableHead>}
          <TableHead>Visit Date</TableHead>
          <TableHead>Medical Name</TableHead> {/* Added Medical Name Header */}
          <TableHead>Medicine</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedFilteredData.length > 0 ? (
          paginatedFilteredData.map((entry) => (
            <TableRow key={entry.uniqueRowId}>
              {userRole === 'admin' && <TableCell>{entry.mrName}</TableCell>}
              <TableCell>{format(parseISO(entry.visit_date), "MMM d, yyyy")}</TableCell>
              <TableCell>{entry.medicalName}</TableCell> {/* Added Medical Name Cell */}
              <TableCell>{entry.medicineName}</TableCell>
              <TableCell className="text-right">{entry.quantity}</TableCell>
              <TableCell>
                <Badge variant={entry.status.toLowerCase() === 'approved' ? 'default' : 'secondary'}>
                  {entry.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={userRole === 'admin' ? 6 : 5} className="text-center"> {/* Updated colspan */}
              {searchTerm ? 'No reports match your search.' : 'No reports found.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

 const renderPagination = () => {
    const totalPages = Math.ceil(totalReports / itemsPerPage);
    if (totalPages <= 1) return null; // Don't render pagination if only one page

    return (
        <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Items per page:</label>
                <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            // Use aria-disabled for accessibility and style based on isActive
                            aria-disabled={currentPage <= 1}
                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                    {/* Simple pagination display (e.g., Page 1 of 5) or generate links */}
                    <PaginationItem>
                       <span className="px-4 py-2 text-sm">Page {currentPage} of {totalPages}</span>
                    </PaginationItem>
                    {/* Example: Generate specific page links if needed */}
                    {/* {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                                isActive={currentPage === i + 1}
                            </PaginationLink>
                        </PaginationItem>
                    ))} */}
                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            aria-disabled={currentPage >= totalPages}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
 };


  // --- Main Component Return ---
  return (
    <AppLayout> {/* Wrap with AppLayout */}
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">
          {userRole === 'admin' ? 'Admin Medical Visit Reports' : 'My Medical Visit Reports'}
        </h1>

        {/* Render Filters/Search based on role */}
        {userRole === 'admin' ? renderAdminFilters() : renderMrSearch()}

        {/* Loading and Error States */}
        {loading && <p>Loading reports...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Table */}
        {!loading && !error && renderReportTable()}

        {/* Pagination */}
        {!loading && !error && paginatedFilteredData.length > 0 && renderPagination()}
      </div>
    </AppLayout> // Close AppLayout
  );
}

export default MedicalVisitsReportPage;
