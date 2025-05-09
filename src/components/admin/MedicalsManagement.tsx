import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Plus, // Changed from UserPlus to Plus
  Search,
  Edit,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Medical } from "@/types"; // Changed import to Medical

export function MedicalsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [medicals, setMedicals] = useState<Medical[]>([]); // Changed state name and type
  const [isAddMedicalDialogOpen, setIsAddMedicalDialogOpen] = useState(false); // Changed state name
  const [newMedical, setNewMedical] = useState({ // Changed state name and fields
    name: "",
    address: "",
    area: "",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMedical, setEditingMedical] = useState<Medical | null>(null); // Changed state name and type
  const [isViewMedicalDialogOpen, setIsViewMedicalDialogOpen] = useState(false); // Changed state name
  const [viewingMedical, setViewingMedical] = useState<Medical | null>(null); // Changed state name and type
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMedicals(); // Changed function call
  }, []);

  const fetchMedicals = async () => { // Changed function name
    try {
      setIsLoading(true);

      // Fetch medicals from Supabase
      const { data, error } = await supabase
        .from("medicals") // Changed table name
        .select("*");

      if (error) throw error;

      setMedicals(data || []); // Changed state update
    } catch (error) {
      console.error("Error fetching medicals:", error); // Changed error message
      toast.error("Failed to load medicals"); // Changed toast message
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMedicals = medicals.filter( // Changed variable name
    (medical) => // Changed variable name
      medical.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medical.address && medical.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (medical.area && medical.area.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Removed handleVerify function

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("medicals") // Changed table name
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMedicals(medicals.filter((medical) => medical.id !== id)); // Changed state update
      toast.success("Medical deleted successfully"); // Changed toast message
    } catch (error: unknown) {
      console.error("Error deleting medical:", error); // Changed error message
      const errorMessage = error instanceof Error ? error.message : "Failed to delete medical"; // Changed error message
      toast.error(errorMessage); // Changed toast message
    }
  };

  const handleEditMedical = async () => { // Changed function name
    if (!editingMedical) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!editingMedical.name || !editingMedical.address || !editingMedical.area) { // Updated required fields
        toast.error("Please fill in all required fields");
        return;
      }

      // Update the medical in the database
      const { data, error } = await supabase
        .from("medicals") // Changed table name
        .update({
          name: editingMedical.name,
          address: editingMedical.address,
          area: editingMedical.area,
        })
        .eq("id", editingMedical.id)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Update the medical in the state
        setMedicals(medicals.map(med => med.id === data[0].id ? data[0] : med)); // Changed state update

        toast.success("Medical updated successfully"); // Changed toast message
        setIsEditDialogOpen(false);
        setEditingMedical(null); // Clear editing state
      }

    } catch (error: unknown) {
      console.error("Error updating medical:", error); // Changed error message
      const errorMessage = error instanceof Error ? error.message : "Failed to update medical"; // Changed error message
      toast.error(errorMessage); // Changed toast message
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAddMedical = async () => { // Changed function name
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!newMedical.name || !newMedical.address || !newMedical.area) { // Updated required fields
        toast.error("Please fill in all required fields");
        return;
      }

      // Get the current user's ID (optional, depending on if you want to track who added)
      // const { data: { user } } = await supabase.auth.getUser();
      // if (!user) {
      //   throw new Error("You must be logged in to add a medical");
      // }

      // Add the medical to the database
      const { data, error } = await supabase
        .from("medicals") // Changed table name
        .insert({
          name: newMedical.name,
          address: newMedical.address,
          area: newMedical.area,
          // added_by: user.id, // Uncomment if tracking who added
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Add the new medical to the state
        setMedicals([...medicals, data[0]]); // Changed state update

        toast.success("Medical added successfully"); // Changed toast message
        setIsAddMedicalDialogOpen(false); // Changed state update

        // Reset form
        setNewMedical({ // Changed state update
          name: "",
          address: "",
          area: "",
        });
      }
    } catch (error: unknown) {
      console.error("Error adding medical:", error); // Changed error message
      const errorMessage = error instanceof Error ? error.message : "Failed to add medical"; // Changed error message
      toast.error(errorMessage); // Changed toast message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Medicals Management</h2> {/* Changed title */}
        <Button onClick={() => setIsAddMedicalDialogOpen(true)}> {/* Changed state update */}
          <Plus className="mr-2 h-4 w-4" /> {/* Changed icon */}
          Add Medical
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search medicals by name, address, or area..." // Changed placeholder
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse">Loading medicals...</div> {/* Changed loading message */}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead> {/* Changed header */}
                <TableHead>Area</TableHead> {/* Changed header */}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicals.length === 0 ? ( // Changed variable name
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center"> {/* Updated colspan */}
                    No medicals found. {/* Changed message */}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicals.map((medical) => ( // Changed variable name
                  <TableRow key={medical.id}>
                    <TableCell className="font-medium">
                      {/* Make name clickable to open view modal */}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => {
                          setViewingMedical(medical); // Changed state update
                          setIsViewMedicalDialogOpen(true); // Changed state update
                        }}
                      >
                        {medical.name}
                      </Button>
                    </TableCell>
                    <TableCell>{medical.address}</TableCell> {/* Changed cell content */}
                    <TableCell>{medical.area}</TableCell> {/* Changed cell content */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setEditingMedical(medical); // Changed state update
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Removed Verify option */}
                          <DropdownMenuItem
                            onClick={() => handleDelete(medical.id)} // Changed function call
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Medical Dialog */}
      <Dialog open={isAddMedicalDialogOpen} onOpenChange={setIsAddMedicalDialogOpen}> {/* Changed state update */}
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Medical</DialogTitle> {/* Changed title */}
            <DialogDescription>
              Add a new medical to the system. Fill in all the required information. {/* Changed description */}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"> {/* Simplified grid */}
              <Label htmlFor="name">Name*</Label> {/* Changed label */}
              <Input
                id="name"
                value={newMedical.name} // Changed state value
                onChange={(e) => setNewMedical({ ...newMedical, name: e.target.value })} // Changed state update
                placeholder="Medical Center ABC" // Changed placeholder
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address*</Label> {/* Changed label */}
              <Input
                id="address"
                value={newMedical.address} // Changed state value
                onChange={(e) => setNewMedical({ ...newMedical, address: e.target.value })} // Changed state update
                placeholder="123 Main St" // Changed placeholder
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area">Area*</Label> {/* Changed label */}
              <Input
                id="area"
                value={newMedical.area} // Changed state value
                onChange={(e) => setNewMedical({ ...newMedical, area: e.target.value })} // Changed state update
                placeholder="Downtown" // Changed placeholder
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMedicalDialogOpen(false)}> {/* Changed state update */}
              Cancel
            </Button>
            <Button onClick={handleAddMedical} disabled={isSubmitting}> {/* Changed function call */}
              {isSubmitting ? "Adding..." : "Add Medical"} {/* Changed button text */}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Medical Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Medical</DialogTitle> {/* Changed title */}
            <DialogDescription>
              Edit the information for this medical. {/* Changed description */}
            </DialogDescription>
          </DialogHeader>
          {editingMedical && ( // Changed variable name
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"> {/* Simplified grid */}
                <Label htmlFor="edit-name">Name*</Label> {/* Changed label */}
                <Input
                  id="edit-name"
                  value={editingMedical.name} // Changed state value
                  onChange={(e) => setEditingMedical({ ...editingMedical, name: e.target.value })} // Changed state update
                  placeholder="Medical Center ABC" // Changed placeholder
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address*</Label> {/* Changed label */}
                <Input
                  id="edit-address"
                  value={editingMedical.address} // Changed state value
                  onChange={(e) => setEditingMedical({ ...editingMedical, address: e.target.value })} // Changed state update
                  placeholder="123 Main St" // Changed placeholder
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-area">Area*</Label> {/* Changed label */}
                <Input
                  id="edit-area"
                  value={editingMedical.area} // Changed state value
                  onChange={(e) => setEditingMedical({ ...editingMedical, area: e.target.value })} // Changed state update
                  placeholder="Downtown" // Changed placeholder
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMedical} disabled={isSubmitting}> {/* Changed function call */}
              {isSubmitting ? "Saving..." : "Save Changes"} {/* Changed button text */}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Medical Dialog */}
      <Dialog open={isViewMedicalDialogOpen} onOpenChange={setIsViewMedicalDialogOpen}> {/* Changed state update */}
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Medical Details</DialogTitle> {/* Changed title */}
            <DialogDescription>
              Viewing information for {viewingMedical?.name}. Details are read-only. {/* Changed description and variable name */}
            </DialogDescription>
          </DialogHeader>
          {viewingMedical && ( // Changed variable name
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label> {/* Changed label */}
                <p className="text-sm p-2 border rounded bg-muted">{viewingMedical.name}</p> {/* Changed variable name */}
              </div>
              <div className="grid gap-2">
                <Label>Address</Label> {/* Changed label */}
                <p className="text-sm p-2 border rounded bg-muted">{viewingMedical.address}</p> {/* Changed variable name */}
              </div>
              <div className="grid gap-2">
                <Label>Area</Label> {/* Changed label */}
                <p className="text-sm p-2 border rounded bg-muted">{viewingMedical.area}</p> {/* Changed variable name */}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewMedicalDialogOpen(false)}> {/* Changed state update */}
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
