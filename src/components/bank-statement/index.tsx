import { useRef, useState } from "react";
import Button from "../../utilities/button";
import BankStatementService, {
  type Transaction,
} from "../../services/bank-statement.service";
import { errortoast, successtoast, warntoast } from "../../utilities/toast";
import { TabView, TabPanel } from "primereact/tabview";
import Container from "../../utilities/container";
import BankStatementImportFile from "./bank-statement-import-file";
import BankStatementDashboard from "./bank-statement-dashboard";

type Step = "upload" | "review";

export default function BankStatement() {

  return (
    <Container>
      <TabView>
        <TabPanel header="นำเข้าไฟล์" leftIcon="pi pi-file-pdf mr-2">
          <BankStatementImportFile></BankStatementImportFile>
        </TabPanel>
        <TabPanel header="dashboard" rightIcon="pi pi-chart-bar ml-2">
          <BankStatementDashboard></BankStatementDashboard>
        </TabPanel>
      </TabView>
    </Container>
   
  );
}
