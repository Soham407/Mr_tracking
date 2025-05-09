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
import { useAuth } from '@/hooks/useAuth'; // Add this import
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"; // Import pagination components

interface ReportPageProps {
  userRole: 'admin' | 'mr';
}

interface SupabaseError {
  message: string;
  code?: string;
}

// Define the structure for Report data
interface ReportEntry {
  id: string;
  mrId: string;
  mrName?: string;
  doctorId: string;
  doctor: string;
  medicineId: string;
  medicine: string;
  date: string;
  totalOrder: number; // This will now represent the quantity ordered
  totalValue: number;
  status: string;
  uniqueRowId: string; // Added for unique table keys
}

// Types for filter options
interface FilterOption {
  value: string;
  label: string;
}

const ReportPage: React.FC<ReportPageProps> = ({ userRole }) => {
  const { user } = useAuth(); // Get the current user
  // General state
  const [reportData, setReportData] = useState<ReportEntry[]>([]); // This will now hold the paginated and filtered data
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalReports, setTotalReports] = useState(0); // State to hold total count of filtered data

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page

  // Search state (for MR view)
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state (for Admin view)
  const [mrOptions, setMrOptions] = useState<FilterOption[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<FilterOption[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<FilterOption[]>([]);
  const [selectedMr, setSelectedMr] = useState<string>('all'); // 'all' or MR ID
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all'); // 'all' or Doctor ID
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all'); // 'all' or Medicine ID
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // State to hold the full processed data before client-side pagination and filtering
  const [processedData, setProcessedData] = useState<ReportEntry[]>([]);


  // Fetch initial data and filter options
  useEffect(() => {
    // Reset common state on role change
    setReportData([]);
    setProcessedData([]); // Reset processed data as well
    setError(null);
    setLoading(true); // Start loading immediately
    setCurrentPage(1); // Reset to first page on role change

    if (userRole === 'mr') {
      // Reset MR-specific state
      setSearchTerm('');
      // Reset Admin-specific state just in case
      resetAdminFilters();
      fetchReports(); // Fetch for MR
    } else if (userRole === 'admin') {
      // Reset Admin-specific state
      resetAdminFilters();
      // Reset MR-specific state just in case
      setSearchTerm('');
      // Fetch filter options *then* fetch reports
      fetchFilterOptions().then(() => fetchReports());
    } else {
        setLoading(false); // No role, stop loading
    }
  }, [userRole]);

  // Fetch filter options and reports whenever relevant states change
  useEffect(() => {
      // Fetch filter options only for admin role
      if (userRole === 'admin') {
          fetchFilterOptions(selectedMr); // Pass selectedMr to fetchFilterOptions
      }
      // Re-fetch reports when filters or pagination change
      fetchReports();

  }, [currentPage, itemsPerPage, selectedMr, selectedDoctor, selectedMedicine, startDate, endDate, searchTerm, userRole]); // Add userRole dependency


  const resetAdminFilters = () => {
      setSelectedMr('all');
      setSelectedDoctor('all');
      setSelectedMedicine('all');
      setStartDate(undefined);
      setEndDate(undefined);
  }

  const fetchFilterOptions = async (mrId: string = 'all') => {
    setLoading(true);
    try {
      const [mrs, doctors, medicines] = await Promise.all([
        // Always fetch all MRs for the MR filter dropdown
        supabase.from('profiles').select('id, name').eq('role', 'mr'),

        // Fetch doctors and medicines based on selected MR if not 'all'
        mrId !== 'all'
          ? supabase
              .from('visits')
              .select(`
                doctors!inner (
                  id,
                  name
                ),
                visit_orders!inner (
                  medicines!inner (
                    id,
                    name
                  )
                )
              `)
              .eq('mr_id', mrId)
          : supabase.from('doctors').select('id, name'), // If 'all' MRs, fetch all doctors

        mrId === 'all' // Only fetch all medicines if 'all' MRs are selected initially
          ? supabase.from('medicines').select('id, name')
          : Promise.resolve({ data: [], error: null }), // If specific MR, medicines are fetched via visits
      ]);

      if (mrs.error) throw mrs.error;

      setMrOptions(mrs.data?.map(mr => ({ value: mr.id, label: mr.name })) || []);

      // Process fetched doctors and medicines
      if (mrId !== 'all') {
          const visitedDoctors = new Map<string, FilterOption>();
          const orderedMedicines = new Map<string, FilterOption>();

          // When mrId is not 'all', 'doctors.data' contains visit objects with nested doctor and medicine data
          if (doctors.error) throw doctors.error;

          interface VisitWithRelations {
              doctors: { id: string; name: string } | null;
              visit_orders: { medicines: { id: string; name: string } | null }[] | null;
          }

          (doctors.data as VisitWithRelations[])?.forEach((visit) => {
              if (visit.doctors) {
                  visitedDoctors.set(visit.doctors.id, { value: visit.doctors.id, label: visit.doctors.name });
              }
              visit.visit_orders?.forEach((order) => {
                  if (order.medicines) {
                      orderedMedicines.set(order.medicines.id, { value: order.medicines.id, label: order.medicines.name });
                  }
              });
          });

          setDoctorOptions(Array.from(visitedDoctors.values()));
          setMedicineOptions(Array.from(orderedMedicines.values()));

      } else {
          // If 'all' MRs, set all doctors and medicines initially
          // In this case, 'doctors.data' is an array of doctor objects
          if (doctors.error) throw doctors.error;
          if (medicines.error) throw medicines.error;

          setDoctorOptions((doctors.data as { id: string; name: string }[])?.map(doc => ({ value: doc.id, label: doc.name })) || []);
          setMedicineOptions(medicines.data?.map(med => ({ value: med.id, label: med.name })) || []);
      }


    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error fetching filter options:", error);
      setError(error.message || 'Failed to load filter options.');
      // Keep existing options or clear based on desired behavior on error
      // For now, let's clear them on error
      setMrOptions([]);
      setDoctorOptions([]);
      setMedicineOptions([]);
    } finally {
      // Don't set loading false here, fetchReports will do it
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get the current user if not admin
      let userId = null;
      if (userRole !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
        if (!userId) throw new Error('User not found');
      }

      // Build the main query with left joins
      let query = supabase
        .from('visits')
        .select(`
          id,
          date,
          status,
          mr_id,
          doctors!left (
            id,
            name
          ),
          visit_orders!left (
            id,
            quantity,
            price,
            medicines!left (
              id,
              name
            )
          )
        `); // Removed count: 'exact' here as we'll count processed data

      // Apply MR filter based on user role and selection
      if (userRole === 'mr' && userId) {
        // MR view: filter by the logged-in MR's ID
        query = query.eq('mr_id', userId);
      } else if (userRole === 'admin' && selectedMr !== 'all') {
        // Admin view: filter by the selected MR's ID
        query = query.eq('mr_id', selectedMr);
      }

      // Execute query (fetch relevant data based on server-side filters)
      const { data: visitsData, error: visitsError } = await query.order('date', { ascending: false });

      if (visitsError) throw visitsError;

      console.log('Visits data fetched (before processing):', visitsData?.length);

      // Get unique MR IDs from the visits
      const mrIds = [...new Set(visitsData?.map(visit => visit.mr_id) || [])];

      // Fetch MR profiles in a separate query
      const { data: mrProfiles, error: mrProfilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', mrIds);

      if (mrProfilesError) throw mrProfilesError;

      // Create a map of MR IDs to names
      const mrMap = new Map(mrProfiles?.map(profile => [profile.id, profile.name]) || []);

      // Process the data
      const processedResult = (visitsData || []).flatMap((visit, visitIndex) => { // Added visitIndex for key fallback
        const orders = visit.visit_orders || [];
        const mrName = mrMap.get(visit.mr_id) || 'N/A';
        const doctorName = visit.doctors?.name || 'N/A';

        // Create a separate entry for each medicine ordered
        return orders.map((order, orderIndex) => ({ // Added orderIndex for key fallback
          // Create a unique ID for the table row key
          uniqueRowId: `${visit.id}-${order.medicines?.id || orderIndex}`, // Combine visit ID and medicine ID/index
          id: visit.id, // Keep original visit ID if needed elsewhere
          mrId: visit.mr_id,
          mrName: mrName,
          doctorId: visit.doctors?.id || '',
          doctor: doctorName,
          medicineId: order.medicines?.id || '',
          medicine: order.medicines?.name || 'N/A',
          date: visit.date,
          totalOrder: order.quantity, // Use the actual quantity from visit_orders
          totalValue: order.quantity * order.price,
          status: visit.status
        }));
      });

      console.log('Processed data length (after flatMap):', processedResult.length);
      setProcessedData(processedResult); // Store the full processed data

    } catch (err) {
      console.error('Error fetching reports:', err);
      // Log the full error object for more details
      console.error(err);
      setError('Failed to fetch reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic updated for specific filters in Admin view
  // Now applies client-side filtering to the *full* processed data before pagination
  const filteredData = useMemo(() => {
    let currentData = processedData; // Use the full processed data before pagination

    // Apply client-side filtering for Doctor, Medicine, and Date Range in Admin view
    if (userRole === 'admin') {
        currentData = currentData.filter(entry => {
            // MR Filter is now handled server-side, no need for client-side MR filter here

            // Doctor Filter (client-side)
            if (selectedDoctor !== 'all' && entry.doctorId !== selectedDoctor) {
                 return false;
            }
            // Medicine Filter (client-side)
            if (selectedMedicine !== 'all' && entry.medicineId !== selectedMedicine) {
                return false;
            }

            // Date Range Filter (client-side)
             try {
                const entryDate = parseISO(entry.date);
                if (startDate && isBefore(entryDate, startOfDay(startDate))) {
                    return false;
                }
                if (endDate && isAfter(entryDate, endOfDay(endDate))) {
                    return false;
                }
            } catch (e) {
                console.error("Error parsing or comparing date for client-side filtering:", entry.date, e);
                return false;
            }

            return true; // Passes all active filters
        });
    } else if (userRole === 'mr' && searchTerm) {
         // MR View: Simple text search (client-side on the full data)
         const lowerCaseSearchTerm = searchTerm.toLowerCase();
         currentData = currentData.filter(entry =>
             entry.doctor.toLowerCase().includes(lowerCaseSearchTerm) ||
             entry.medicine.toLowerCase().includes(lowerCaseSearchTerm) ||
             entry.date.toLowerCase().includes(lowerCaseSearchTerm) || // Simple date string search for MR
             entry.status.toLowerCase().includes(lowerCaseSearchTerm)
         );
    }

    // After filtering, update the total count and apply client-side pagination
    setTotalReports(currentData.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return currentData.slice(startIndex, endIndex);

  }, [userRole, processedData, searchTerm, selectedMr, selectedDoctor, selectedMedicine, startDate, endDate, currentPage, itemsPerPage]); // Add dependencies

  // Generic function to render the table, adaptable for both roles
  const renderReportTable = (isAdmin: boolean) => (
    <>
      <h1 className="text-2xl font-bold mb-6">{isAdmin ? 'Admin Visit Reports' : 'My Visit Reports'}</h1>

      {/* Filter Section */}
      {isAdmin ? (
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

            {/* Doctor Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctorOptions.map((doc) => (
                    <SelectItem key={doc.value} value={doc.value}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicine Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Medicine</label>
              {/* Ensure value is compared against selectedMedicine state (which will hold ID or 'all') */}
              <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                <SelectTrigger>
                  {/* Display the selected medicine's name, or placeholder */}
                  <SelectValue placeholder="Select Medicine">
                    {selectedMedicine === 'all'
                      ? 'All Medicines'
                      : medicineOptions.find(opt => opt.value === selectedMedicine)?.label ?? 'Select Medicine'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Medicines</SelectItem>
                  {/* Set the *value* of the SelectItem to the medicine ID (med.value) */}
                  {medicineOptions.map((med) => (
                    <SelectItem key={med.value} value={med.value}>
                      {med.label} {/* Display the medicine name (med.label) */}
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
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
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
      ) : (
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search reports (Doctor, Medicine, Date, Status)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Loading and Error States */}
      {loading && <p>Loading reports...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>MR Name</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead className="text-right">Total Order</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((entry) => (
                // Use the uniqueRowId generated during processing for the key
                <TableRow key={entry.uniqueRowId}>
                  {isAdmin && <TableCell>{entry.mrName}</TableCell>}
                  <TableCell>{format(parseISO(entry.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{entry.doctor}</TableCell>
                  <TableCell>{entry.medicine}</TableCell>
                  <TableCell className="text-right">{entry.totalOrder}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status.toLowerCase() === 'approved' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center">
                  {searchTerm ? 'No reports match your search.' : 'No reports found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );


  return (
    <div className="container mx-auto py-8">
      {/* Render the appropriate table based on userRole */}
      {userRole === 'admin' && renderReportTable(true)}
      {userRole === 'mr' && renderReportTable(false)}

      {/* Pagination */}
      {!loading && !error && filteredData.length > 0 && (
          <div className="flex justify-between items-center mt-4">
              <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Items per page:</label>
                  <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="10" />
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
                              isActive={currentPage > 1} // Use isActive to control styling/clickability
                          />
                      </PaginationItem>
                      {/* Render pagination links dynamically based on total pages */}
                      {Array.from({ length: Math.ceil(totalReports / itemsPerPage) }, (_, i) => (
                          <PaginationItem key={i}>
                              <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(i + 1);
                                  }}
                                  isActive={currentPage === i + 1}
                              >
                                  {i + 1}
                              </PaginationLink>
                          </PaginationItem>
                      ))}
                      <PaginationItem>
                          <PaginationNext
                              href="#"
                              onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage < Math.ceil(totalReports / itemsPerPage)) setCurrentPage(currentPage + 1);
                              }}
                              isActive={currentPage < Math.ceil(totalReports / itemsPerPage)} // Use isActive
                          />
                      </PaginationItem>
                  </PaginationContent>
              </Pagination>
          </div>
      )}
    </div>
  );
};

export default ReportPage;
