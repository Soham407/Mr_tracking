
import { AppLayout } from "@/components/layout/AppLayout";
import { NewVisitForm } from "@/components/visits/NewVisitForm";
import { NewMedicalVisit } from "./NewMedicalVisit"; // Import the new component
import { useLocation } from "react-router-dom";

const NewVisit = () => {
  const location = useLocation();
  const type = new URLSearchParams(location.search).get("type");

  return (
    <AppLayout>
      {type === "medical" ? <NewMedicalVisit /> : <NewVisitForm />}
    </AppLayout>
  );
};

export default NewVisit;
