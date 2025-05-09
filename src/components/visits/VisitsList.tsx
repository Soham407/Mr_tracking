import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Search } from "lucide-react";
import { Visit } from "@/types";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VisitsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewVisitDialogOpen, setIsViewVisitDialogOpen] = useState(false);
  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null);

  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const mrId = user?.id;

      if (!mrId) {
        setError("User not logged in.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("visits")
        .select(`
          *,
          doctors (name, hospital),
          visit_orders (id, quantity, medicine: medicines (name))
        `)
        .eq("mr_id", mrId)
        .order("date", { ascending: false });

      if (error) {
        setError(error.message);
        toast.error("Failed to load visits.");
      } else {
        // Map the fetched data to the Visit type, including doctorName, hospital, and orders
        const formattedVisits = data.map(visit => ({
          ...visit,
          doctorName: visit.doctors?.name || "N/A",
          hospital: visit.doctors?.hospital || "N/A",
          orders: visit.visit_orders.map(order => ({
            id: order.id,
            quantity: order.quantity,
            medicine_name: order.medicine?.name || "N/A" // Extract medicine name
          })) || []
        }));
        setVisits(formattedVisits as Visit[]);
      }
      setIsLoading(false);
    };

    fetchVisits();
  }, []);

  // Filter visits based on search term
  const filteredVisits = visits.filter(
    (visit) =>
      visit.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.hospital?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.orders?.some(order => order.medicine_name.toLowerCase().includes(searchTerm.toLowerCase())) // Include medicine name in search
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search visits by doctor name or hospital..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled
            />
          </div>
        </div>
        <div className="rounded-md border p-4 text-center">
          Loading visits...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
          <Button onClick={() => navigate("/mr/visits/new")} disabled>
            <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search visits by doctor name or hospital..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled
            />
          </div>
        </div>
        <div className="rounded-md border p-4 text-center text-destructive">
          Error loading visits: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Visit Log</h2>
        <Button onClick={() => navigate("/mr/visits/new")}>
          <PlusIcon className="mr-2 h-4 w-4" /> Log New Visit
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search visits by doctor name or hospital..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead className="hidden md:table-cell">Hospital</TableHead>
              <TableHead className="hidden lg:table-cell">Orders</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No visits found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => (
                <TableRow
                  key={visit.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setViewingVisit(visit);
                    setIsViewVisitDialogOpen(true);
                    console.log("Viewing Visit Orders:", visit.orders); // Log the visit orders data
                  }}
                >
                  <TableCell>
                    {format(new Date(visit.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{visit.doctorName}</TableCell>
                  <TableCell className="hidden md:table-cell">{visit.hospital}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {visit.orders?.length || 0} items
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      visit.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : visit.status === "pending"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}>
                      {visit.status === "approved"
                        ? "Approved"
                        : visit.status === "pending"
                        ? "Pending"
                        : "Changes Requested"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Visit Dialog */}
      <Dialog open={isViewVisitDialogOpen} onOpenChange={setIsViewVisitDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
            <DialogDescription>
              Viewing details for the visit on {viewingVisit?.date ? format(new Date(viewingVisit.date), "MMM d, yyyy") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          {viewingVisit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{format(new Date(viewingVisit.date), "MMM d, yyyy")}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Doctor</Label>
                  <p className="text-sm p-2 border rounded bg-muted">{viewingVisit.doctorName}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Hospital / Clinic</Label>
                <p className="text-sm p-2 border rounded bg-muted">{viewingVisit.hospital}</p>
              </div>

              <div className="grid gap-2">
                <Label>Orders ({viewingVisit.orders?.length || 0})</Label>
                {viewingVisit.orders && viewingVisit.orders.length > 0 ? (
                  <ul className="list-disc list-inside text-sm p-2 border rounded bg-muted">
                    {viewingVisit.orders.map((order, index) => (
                      <li key={order.id || index}>{order.medicine_name} ({order.quantity})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm p-2 border rounded bg-muted">- No orders -</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <p className="text-sm p-2 border rounded bg-muted">{viewingVisit.notes || "-"}</p>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <p className={`text-sm p-2 border rounded ${
                      viewingVisit.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : viewingVisit.status === "pending"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}>
                  {viewingVisit.status === "approved"
                    ? "Approved"
                    : viewingVisit.status === "pending"
                    ? "Pending"
                    : "Changes Requested"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewVisitDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
