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
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, PlusIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { Medicine, Medical } from "@/types";
import { Tables } from "@/integrations/supabase/types";

// Define schema for visit form
const visitSchema = z.object({
  medicalInput: z.string().min(1, { message: "Medical Input is required" }),
  areaInput: z.string().min(1, { message: "Area Input is required" }),
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

interface Order {
  medicineId: string;
  medicineName: string;
  quantity: number;
  packSize: string;
}

type VisitValues = z.infer<typeof visitSchema>;
type OrderValues = z.infer<typeof orderSchema>;

export function NewMedicalVisit() {
  const { user } = useUser(); // Get user from context
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMedicines, setIsFetchingMedicines] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]); // State for fetched medicines

  const [orders, setOrders] = useState<Order[]>([]);
  // Order form
  const orderForm = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      medicineId: "",
      quantity: 1,
    },
  });

  // Visit form
  const [medicals, setMedicals] = useState<Medical[]>([]); // State for fetched medicals
  const [isFetchingMedicals, setIsFetchingMedicals] = useState(true); // State for medicals loading
  const [medicalError, setMedicalError] = useState<string | null>(null); // State for medicals error

  const visitForm = useForm<VisitValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      medicalInput: "",
      areaInput: "",
      notes: "",
    },
  });

  // Fetch medicals on component mount
  useEffect(() => {
    const fetchMedicals = async () => {
      setIsFetchingMedicals(true);
      try {
        const { data, error } = await supabase
          .from("medicals")
          .select("*")
          .order("name", { ascending: true }); // Fetch from Supabase

        if (error) throw error;

        // Map the data to the Medical type
        const medicalData: Medical[] = data.map((medical) => ({
          id: medical.id,
          created_at: medical.created_at,
          name: medical.name,
          area: medical.area,
        }));

        setMedicals(medicalData || []);
      } catch (error) {
        console.error("Error fetching medicals:", error);
        toast.error("Failed to load medicals list.");
        setMedicalError(error.message || "Failed to load medicals.");
      } finally {
        setIsFetchingMedicals(false);
      }
    };

    fetchMedicals();
  }, []);

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

  const addOrder = (data: OrderValues) => {
    const medicine = medicines.find(
      (med) => med.id.toString() === data.medicineId
    );
    if (!medicine) {
      toast.error("Selected medicine not found.");
      return;
    }

    const newOrder = {
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity: data.quantity,
      packSize: medicine.pack_size,
    };

    setOrders([...orders, newOrder]);
    orderForm.reset();
  };

  // Remove order from the list
  const removeOrder = (index: number) => {
    setOrders(orders.filter((_, i) => i !== index));
  };

  // Determine if the user is an inactive MR
  const isInactiveMr = user?.role === "mr" && user?.status === "inactive";

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

    try {
      // Fetch the medical data to get the doctor_id
      const { data: medical, error: medicalError } = await supabase
        .from("medicals")
        .select("*")
        .eq("id", data.medicalInput)
        .single();

      if (medicalError) throw medicalError;

      if (!medical) {
        toast.error("Failed to fetch medical data.");
        setIsLoading(false);
        return;
      }

      const visitData = {
        visit_date: format(data.date, "yyyy-MM-dd"),
        notes: data.notes,
        status: "pending",
        mr_id: mrId,
        medical_area_id: medical.id,
      };

      console.log("Visit data being inserted:", visitData); // Added console log

      // Insert visit data
      const { data: visit, error: visitError } = await supabase
        .from("medical_visits")
        .insert([visitData])
        .select() // Add select() to return the inserted data
        .single();

      if (visitError) {
        toast.error("Failed to create visit.");
        console.error("Visit creation failed. Error:", visitError); // Enhanced logging
        setIsLoading(false);
        return;
      }

      // Insert order data
      const orderInserts = orders.map((order) => ({
        medical_visit_id: visit.id,
        medicine_id: order.medicineId,
        quantity: order.quantity,
      }));

      console.log("Order inserts:", orderInserts); // Added console log

      const { error: orderError } = await supabase
        .from("medical_visit_orders")
        .insert(orderInserts);

      if (orderError) {
        console.error("Error inserting orders:", orderError); // Enhanced error logging
        throw orderError; // Re-throw to be caught by the main catch block
      }

      toast.success("Visit logged successfully");
      // navigate("/mr/medical_visits");
    } catch (error: unknown) {
      console.error("Error logging visit:", error);
      if (error instanceof PostgrestError) {
        toast.error(`Failed to log visit: ${error.message}`);
        console.error("Error logging visit:", error.message);
      } else {
        toast.error(`An unexpected error occurred: ${String(error)}`);
        console.error("Error logging visit:", String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Log New Medical Visit
        </h1>
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
              <fieldset disabled={isInactiveMr} className="space-y-6">
                {" "}
                {/* Disable fields if inactive */}
                <FormField
                  control={visitForm.control}
                  name="medicalInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Input</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Find the selected medical and update areaInput
                          const selectedMedical = medicals.find(
                            (medical) => medical.id.toString() === value
                          );
                          visitForm.setValue(
                            "areaInput",
                            selectedMedical ? selectedMedical.area : ""
                          );
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a medical" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isFetchingMedicals ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Loading medicals...
                            </div>
                          ) : medicals.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No medicals found.
                            </div>
                          ) : (
                            medicals.map((medical) => (
                              <SelectItem
                                key={medical.id}
                                value={medical.id.toString()}
                              >
                                {medical.name}
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
                  name="areaInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Input</FormLabel>
                      <FormControl>
                        <Input placeholder="Area Input" {...field} readOnly />
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
              <fieldset disabled={isInactiveMr} className="flex gap-4">
                {" "}
                {/* Disable fields if inactive */}
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
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading medicines...
                              </div>
                            ) : medicines.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No medicines found.
                              </div>
                            ) : (
                              medicines.map((medicine) => (
                                <SelectItem
                                  key={medicine.id}
                                  value={medicine.id.toString()}
                                >
                                  {" "}
                                  {/* Ensure value is string */}
                                  {medicine.name}{" "}
                                  {medicine.dosage
                                    ? `- ${medicine.dosage}`
                                    : ""}
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
                          <Input type="number" min={1} {...field} />
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
                <p className="text-sm text-muted-foreground">
                  No orders added yet
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.medicineName}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.packSize}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.quantity}
                        </TableCell>
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
         onClick={() => {
          visitForm.handleSubmit((data) => {
            onSubmit(data); // handle form submission
            navigate("/mr/dashboard"); // navigate after successful submission
          })();
        }}
          disabled={isLoading || orders.length === 0 || isInactiveMr} // Disable if inactive MR
        >
          {isLoading
            ? "Submitting..."
            : isInactiveMr
            ? "Inactive User"
            : "Submit Visit"}{" "}
          {/* Change button text if inactive */}
        </Button>
      </div>
    </div>
  );
}
