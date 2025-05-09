
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

export function SettingsManagement() {
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "MR Tracking",
    emailNotifications: true,
    autoGenerateReports: true,
    defaultDoctorApproval: false,
  });

  const [regions, setRegions] = useState([
    { id: "1", name: "North" },
    { id: "2", name: "South" },
    { id: "3", name: "East" },
    { id: "4", name: "West" },
    { id: "5", name: "Central" }
  ]);
  
  const [specialties, setSpecialties] = useState([
    { id: "1", name: "Cardiology" },
    { id: "2", name: "Neurology" },
    { id: "3", name: "Pediatrics" },
    { id: "4", name: "Dermatology" },
    { id: "5", name: "Orthopedics" }
  ]);

  const [medicineCategories, setMedicineCategories] = useState([
    { id: "1", name: "Cardiovascular" },
    { id: "2", name: "Neurology" },
    { id: "3", name: "Pediatrics" },
    { id: "4", name: "Dermatology" },
    { id: "5", name: "Orthopedics" }
  ]);

  const [newRegion, setNewRegion] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleGeneralSettingsChange = (key: string, value: any) => {
    setGeneralSettings(prev => ({
      ...prev,
      [key]: value
    }));
    toast.success(`${key} updated successfully`);
  };

  const addRegion = () => {
    if (newRegion.trim() === "") {
      toast.error("Region name cannot be empty");
      return;
    }
    
    setRegions([...regions, { id: Date.now().toString(), name: newRegion }]);
    setNewRegion("");
    toast.success("Region added successfully");
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() === "") {
      toast.error("Specialty name cannot be empty");
      return;
    }
    
    setSpecialties([...specialties, { id: Date.now().toString(), name: newSpecialty }]);
    setNewSpecialty("");
    toast.success("Specialty added successfully");
  };

  const addCategory = () => {
    if (newCategory.trim() === "") {
      toast.error("Category name cannot be empty");
      return;
    }
    
    setMedicineCategories([...medicineCategories, { id: Date.now().toString(), name: newCategory }]);
    setNewCategory("");
    toast.success("Category added successfully");
  };

  const removeItem = (type: string, id: string) => {
    switch (type) {
      case "region":
        setRegions(regions.filter(region => region.id !== id));
        toast.success("Region removed successfully");
        break;
      case "specialty":
        setSpecialties(specialties.filter(specialty => specialty.id !== id));
        toast.success("Specialty removed successfully");
        break;
      case "category":
        setMedicineCategories(medicineCategories.filter(category => category.id !== id));
        toast.success("Category removed successfully");
        break;
      default:
        break;
    }
  };

  const handleSaveSettings = () => {
    toast.success("All settings saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">Configure the MR Tracking system settings.</p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="specialties">Specialties</TabsTrigger>
          <TabsTrigger value="categories">Medicine Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure the general settings for the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={generalSettings.companyName}
                    onChange={(e) => handleGeneralSettingsChange("companyName", e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Notify users via email for important events
                    </div>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={generalSettings.emailNotifications}
                    onCheckedChange={(checked) => handleGeneralSettingsChange("emailNotifications", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoGenerateReports">Auto-Generate Monthly Reports</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically generate monthly reports at the end of each month
                    </div>
                  </div>
                  <Switch
                    id="autoGenerateReports"
                    checked={generalSettings.autoGenerateReports}
                    onCheckedChange={(checked) => handleGeneralSettingsChange("autoGenerateReports", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="defaultDoctorApproval">Auto-Approve New Doctors</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically approve new doctors added by MRs
                    </div>
                  </div>
                  <Switch
                    id="defaultDoctorApproval"
                    checked={generalSettings.defaultDoctorApproval}
                    onCheckedChange={(checked) => handleGeneralSettingsChange("defaultDoctorApproval", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regions Management</CardTitle>
              <CardDescription>
                Add, edit, or remove regions for the MRs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="newRegion">Add New Region</Label>
                  <Input
                    id="newRegion"
                    placeholder="Region name"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                  />
                </div>
                <Button onClick={addRegion}>Add Region</Button>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between">
                    <span>{region.name}</span>
                    <Menubar>
                      <MenubarMenu>
                        <MenubarTrigger>Actions</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>Edit</MenubarItem>
                          <MenubarSeparator />
                          <MenubarItem onClick={() => removeItem("region", region.id)}>
                            Delete
                          </MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                    </Menubar>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="specialties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Specialties</CardTitle>
              <CardDescription>
                Manage doctor specialty categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="newSpecialty">Add New Specialty</Label>
                  <Input
                    id="newSpecialty"
                    placeholder="Specialty name"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                  />
                </div>
                <Button onClick={addSpecialty}>Add Specialty</Button>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                {specialties.map((specialty) => (
                  <div key={specialty.id} className="flex items-center justify-between">
                    <span>{specialty.name}</span>
                    <Menubar>
                      <MenubarMenu>
                        <MenubarTrigger>Actions</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>Edit</MenubarItem>
                          <MenubarSeparator />
                          <MenubarItem onClick={() => removeItem("specialty", specialty.id)}>
                            Delete
                          </MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                    </Menubar>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medicine Categories</CardTitle>
              <CardDescription>
                Manage medicine categories for the catalog
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="newCategory">Add New Category</Label>
                  <Input
                    id="newCategory"
                    placeholder="Category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <Button onClick={addCategory}>Add Category</Button>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                {medicineCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <Menubar>
                      <MenubarMenu>
                        <MenubarTrigger>Actions</MenubarTrigger>
                        <MenubarContent>
                          <MenubarItem>Edit</MenubarItem>
                          <MenubarSeparator />
                          <MenubarItem onClick={() => removeItem("category", category.id)}>
                            Delete
                          </MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                    </Menubar>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>Save All Settings</Button>
      </div>
    </div>
  );
}
