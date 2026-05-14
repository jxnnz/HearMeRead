import { GraduationCap } from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";

export default function AdminStudentsPage() {
  return (
    <Layout>
      <TopBar title="Students" />
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "50vh",
        gap: 16,
        fontFamily: "Poppins, sans-serif",
        color: "#8a94b2",
      }}>
        <GraduationCap size={48} strokeWidth={1.2} />
        <p style={{ margin: 0, fontSize: 14 }}>
          Student overview — coming soon.
        </p>
      </div>
    </Layout>
  );
}
