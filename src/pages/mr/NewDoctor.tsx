import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
// TODO: Add form handling (e.g., react-hook-form, zod) and Supabase integration

const NewDoctor = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Placeholder submit handler
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    console.log("Form submitted - needs implementation");
    // TODO: Implement form data collection and submission to Supabase
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    toast.success("Doctor submitted for verification (placeholder)");
    setIsLoading(false);
    navigate("/mr/doctors"); // Navigate back to the list after submission
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>Back to Doctors</Button>
        <Card>
          <CardHeader>
            <CardTitle>Add New Doctor</CardTitle>
            <CardDescription>Enter the details of the new doctor. They will be submitted for verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic form fields - needs proper implementation */}
              <div className="grid gap-2">
                <Label htmlFor="name">Doctor's Name</Label>
                <Input id="name" placeholder="Dr. John Smith" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" placeholder="Cardiology" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hospital">Hospital/Clinic</Label>
                <Input id="hospital" placeholder="General Hospital" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact (Phone or Email)</Label>
                <Input id="contact" placeholder="555-1234 or dr.smith@email.com" />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Doctor for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NewDoctor;
