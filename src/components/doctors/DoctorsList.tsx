
import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom"; // Removed useNavigate as it's no longer needed for row click
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Added
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Search, UserPlus, Eye } from "lucide-react"; // Added UserPlus and Eye
import { Doctor } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DoctorsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const navigate = useNavigate(); // Removed navigate initialization
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [isViewDoctorDialogOpen, setIsViewDoctorDialogOpen] = useState(false); // State for view dialog
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null); // State for doctor being viewed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    specialty: "",
    hospital: "",
    city: "",
    address: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("doctors")
        .select("*");
        
      if (error) throw error;
      
      console.log("Doctors fetched:", data);
      setDoctors(data || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setIsLoading(false);
    }
  };

  // Added handleAddDoctor function (adapted from Admin version)
  const handleAddDoctor = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!newDoctor.name || !newDoctor.specialty || !newDoctor.hospital || !newDoctor.address) {
        toast.error("Please fill in all required fields (Name, Specialty, Hospital, Address)");
        setIsSubmitting(false); // Ensure button is re-enabled on validation error
        return;
      }
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to add a doctor");
      }
      
      // Create full address
      const fullAddress = newDoctor.city 
        ? `${newDoctor.address}, ${newDoctor.city}`
        : newDoctor.address;
      
      // Add the doctor to the database
      const { data, error } = await supabase
        .from("doctors")
        .insert({
          name: newDoctor.name,
          specialization: newDoctor.specialty,
          hospital: newDoctor.hospital,
          address: fullAddress,
          email: newDoctor.email || null,
          phone: newDoctor.phone || null,
          added_by: user.id,
          is_verified: false // MRs add doctors as unverified
        })
        .select(); // Select the newly inserted row
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Add the new doctor to the state
        setDoctors([...doctors, data[0]]);
        
        toast.success("Doctor added successfully. Pending verification.");
        setIsAddDoctorDialogOpen(false);
        
        // Reset form
        setNewDoctor({
          name: "",
          specialty: "",
          hospital: "",
          city: "",
          address: "",
          email: "",
          phone: "",
        });
      } else {
         throw new Error("Failed to add doctor or retrieve added data.");
      }
    } catch (error: unknown) { // Explicitly type error as unknown
      console.error("Error adding doctor:", error);
      // Type check before accessing message
      const errorMessage = error instanceof Error ? error.message : "Failed to add doctor";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter doctors based on search term
  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Doctors</h2>
        {/* Updated Button to open dialog */}
        <Button onClick={() => setIsAddDoctorDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add Doctor 
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search doctors by name, specialization, or hospital..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse">Loading doctors...</div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead className="hidden md:table-cell">Hospital</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No doctors found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doctor) => (
                  <TableRow 
                    key={doctor.id}
                    // Removed row onClick navigation
                  >
                    <TableCell className="font-medium">
                      {/* Make name clickable to open view modal */}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => {
                          setViewingDoctor(doctor);
                          setIsViewDoctorDialogOpen(true);
                        }}
                      >
                        {doctor.name}
                      </Button>
                    </TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell">{doctor.hospital}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {doctor.phone || doctor.email}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        doctor.is_verified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {doctor.is_verified ? "Verified" : "Pending"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Doctor Dialog (Copied and adapted from Admin version) */}
      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Add a new doctor to the system. The doctor will require admin verification.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mr-name">Full Name*</Label>
                <Input
                  id="mr-name" // Use unique ID if needed
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  placeholder="Dr. Soham B"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr-specialty">Specialty*</Label>
                <Input
                  id="mr-specialty"
                  value={newDoctor.specialty}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  placeholder="Cardiology"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="mr-hospital">Hospital / Clinic*</Label>
              <Input
                id="mr-hospital"
                value={newDoctor.hospital}
                onChange={(e) => setNewDoctor({ ...newDoctor, hospital: e.target.value })}
                placeholder="City General Hospital"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mr-address">Address*</Label>
                <Input
                  id="mr-address"
                  value={newDoctor.address}
                  onChange={(e) => setNewDoctor({ ...newDoctor, address: e.target.value })}
                  placeholder="123 Medical Ave"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr-city">City</Label>
                <Input
                  id="mr-city"
                  value={newDoctor.city}
                  onChange={(e) => setNewDoctor({ ...newDoctor, city: e.target.value })}
                  placeholder="Health City"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mr-email">Email</Label>
                <Input
                  id="mr-email"
                  type="email"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  placeholder="soham.abc@hospital.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr-phone">Phone</Label>
                <Input
                  id="mr-phone"
                  value={newDoctor.phone}
                  onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  placeholder="555-123-4567"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDoctorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDoctor} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Doctor Dialog */}
      <Dialog open={isViewDoctorDialogOpen} onOpenChange={setIsViewDoctorDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
            <DialogDescription>
              Viewing information for {viewingDoctor?.name}. Details are read-only.
            </DialogDescription>
          </DialogHeader>
          {viewingDoctor && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.name}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Specialty</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.specialization}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Hospital / Clinic</Label>
                <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.hospital}</p>
              </div>

              <div className="grid gap-2">
                  <Label>Address</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.email || "-"}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingDoctor.phone || "-"}</p>
                </div>
              </div>
               <div className="grid gap-2">
                  <Label>Status</Label>
                  <p className={`text-sm p-2 border rounded ${viewingDoctor.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {viewingDoctor.is_verified ? "Verified" : "Pending Verification"}
                  </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDoctorDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
