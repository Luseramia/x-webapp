import { TabView, TabPanel } from "primereact/tabview";
import Container from "../../utilities/container";
import CryptoAnalysisImport from "./crypto-analysis-import";
import CryptoAnalysisList from "./crypto-analysis-list";

export default function CryptoAnalysis() {
  return (
    <Container>
      <TabView>
        {/* <TabPanel header="บันทึกการวิเคราะห์" leftIcon="pi pi-plus mr-2">
          <CryptoAnalysisImport />
        </TabPanel> */}
        <TabPanel header="รายการที่บันทึกไว้" rightIcon="pi pi-list ml-2">
          <CryptoAnalysisList />
        </TabPanel>
      </TabView>
    </Container>
  );
}
