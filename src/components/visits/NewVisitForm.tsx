import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useUser } from "@/context/UserContext"; // Import useUser hook
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { CalendarIcon, PlusIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Medicine, Doctor } from "@/types";

// Define schema for visit form
const visitSchema = z.object({
  doctorId: z.string().min(1, { message: "Doctor is required" }),
  hospital: z.string().min(1, { message: "Hospital is required" }),
  date: z.date({ required_error: "Visit date is required" }),
  notes: z.string().optional(),
});

// Define schema for order form
const orderSchema = z.object({
  medicineId: z.string().min(1, { message: "Medicine is required" }),
  quantity: z.coerce
    .number()
    .min(1, { message: "Quantity must be at least 1" }),
});

type VisitValues = z.infer<typeof visitSchema>;
type OrderValues = z.infer<typeof orderSchema>;

export function NewVisitForm() {
  const { user } = useUser(); // Get user from context
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMedicines, setIsFetchingMedicines] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]); // State for fetched medicines
  const [orders, setOrders] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]); // State for fetched doctors
  const [isFetchingDoctors, setIsFetchingDoctors] = useState(true); // State for doctor loading
  const [doctorError, setDoctorError] = useState<string | null>(null); // State for doctor error


  // Visit form
  const visitForm = useForm<VisitValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      doctorId: "",
      hospital: "",
      notes: "",
    },
  });

  // Fetch medicines on component mount
  useEffect(() => {
    const fetchMedicines = async () => {
      setIsFetchingMedicines(true);
      try {
        const { data, error } = await supabase
          .from("medicines")
          .select("*")
          .order("name", { ascending: true }); // Fetch from Supabase

        if (error) throw error;

        setMedicines(data || []);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        toast.error("Failed to load medicines list.");
      } finally {
        setIsFetchingMedicines(false);
      }
    };

    fetchMedicines();
  }, []);

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsFetchingDoctors(true);
      const { data, error } = await supabase.from('doctors').select('*');
      if (error) {
        setDoctorError(error.message);
        toast.error("Failed to load doctors list.");
      } else {
        setDoctors(data || []);
      }
      setIsFetchingDoctors(false);
    };
    fetchDoctors();
  }, []);

  // Effect to update hospital when doctor is selected
  useEffect(() => {
    const selectedDoctorId = visitForm.watch("doctorId");
    if (selectedDoctorId) {
      const selectedDoctor = doctors.find(
        (doctor) => doctor.id === selectedDoctorId
      );
      if (selectedDoctor && selectedDoctor.hospital) {
        visitForm.setValue("hospital", selectedDoctor.hospital);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitForm.watch("doctorId"), doctors, visitForm.setValue]);


  // Order form
  const orderForm = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      medicineId: "",
      quantity: 1,
    },
  });

  // Add order to the list
  const addOrder = (data: OrderValues) => {
    // Find medicine from fetched state
    const medicine = medicines.find((med) => med.id.toString() === data.medicineId);
    if (!medicine) {
      toast.error("Selected medicine not found.");
      return;
    }

    const newOrder = {
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity: data.quantity,
      packSize: medicine.pack_size, // Corrected property name
      price: medicine.price,
      total: data.quantity * medicine.price,
    };

    setOrders([...orders, newOrder]);
    orderForm.reset();
  };

  // Remove order from the list
  const removeOrder = (index: number) => {
    setOrders(orders.filter((_, i) => i !== index));
  };

  // Calculate total order value
  const totalOrderValue = orders.reduce((sum, order) => sum + order.total, 0);

  // Determine if the user is an inactive MR
  const isInactiveMr = user?.role === 'mr' && user?.status === 'inactive';

  // Submit the visit with orders
  const onSubmit = async (data: VisitValues) => {
    // Prevent submission if MR is inactive
    if (isInactiveMr) {
      toast.error("Inactive users cannot log new visits.");
      return;
    }

    if (orders.length === 0) {
      toast.error("Please add at least one order");
      return;
    }

    setIsLoading(true);

    // Use user ID from context if available
    const mrId = user?.id;

    if (!mrId) {
      toast.error("User ID not found. Please log in again.");
      setIsLoading(false);
      return;
    }

    const visitData = {
      doctor_id: data.doctorId,
      date: format(data.date, "yyyy-MM-dd"),
      notes: data.notes,
      status: "pending",
      mr_id: mrId,
    };

    try {
      // Insert visit data
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .insert([visitData])
        .select()
        .single();

      if (visitError) throw visitError;

      // Insert order data
      const orderInserts = orders.map(order => ({
        visit_id: visit.id,
        medicine_id: order.medicineId,
        quantity: order.quantity,
        price: order.price,
      }));

      const { error: orderError } = await supabase
        .from("visit_orders")
        .insert(orderInserts);

      if (orderError) throw orderError;

      toast.success("Visit logged successfully");
      navigate("/mr/visits");
    } catch (error: any) {
      console.error("Error logging visit:", error);
      toast.error(`Failed to log visit: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log New Visit</h1>
        <p className="text-muted-foreground">
          Record your visit details and medicine orders
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Visit Details */}
        <div className="form-section">
          <h2 className="text-xl font-semibold mb-4">Visit Details</h2>
          <Form {...visitForm}>
            <form className="space-y-6">
              <fieldset disabled={isInactiveMr} className="space-y-6"> {/* Disable fields if inactive */}
              <FormField
                control={visitForm.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isFetchingDoctors ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Loading doctors...</div>
                        ) : doctorError ? (
                          <div className="p-4 text-center text-sm text-destructive">{doctorError}</div>
                        ) : doctors.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No doctors found.</div>
                        ) : (
                          doctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.name} - {doctor.specialization}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="hospital"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hospital/Clinic</FormLabel>
                    <FormControl>
                      <Input placeholder="Hospital or clinic name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Visit Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes or observations (optional)"
                        className="min-h-[100px]"
                        {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
            </form>
          </Form>
        </div>

        {/* Medicine Orders */}
        <div className="form-section">
          <h2 className="text-xl font-semibold mb-4">Medicine Orders</h2>
          <Form {...orderForm}>
            <form
              onSubmit={orderForm.handleSubmit(addOrder)}
              className="space-y-6"
            >
              <fieldset disabled={isInactiveMr} className="flex gap-4"> {/* Disable fields if inactive */}
                <div className="flex-grow">
                  <FormField
                    control={orderForm.control}
                    name="medicineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicine</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a medicine" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isFetchingMedicines ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">Loading medicines...</div>
                            ) : medicines.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">No medicines found.</div>
                            ) : (
                              medicines.map((medicine) => (
                                <SelectItem key={medicine.id} value={medicine.id.toString()}> {/* Ensure value is string */}
                                  {medicine.name} {medicine.dosage ? `- ${medicine.dosage}` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-[100px]">
                  <FormField
                    control={orderForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="icon" className="mb-[2px]">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </fieldset>
            </form>
          </Form>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Orders List</h3>
            {orders.length === 0 ? (
              <div className="flex items-center justify-center p-4 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground">No orders added yet</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.medicineName}</p>
                            <p className="text-xs text-muted-foreground">{order.packSize}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{order.quantity}</TableCell>
                        <TableCell className="text-right">₹{order.price}</TableCell>
                        <TableCell className="text-right">₹{order.total}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeOrder(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Total Amount:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{totalOrderValue}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/mr/dashboard")}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={visitForm.handleSubmit(onSubmit)}
          disabled={isLoading || orders.length === 0 || isInactiveMr} // Disable if inactive MR
        >
          {isLoading ? "Submitting..." : isInactiveMr ? "Inactive User" : "Submit Visit"} {/* Change button text if inactive */}
        </Button>
      </div>
    </div>
  );
}
