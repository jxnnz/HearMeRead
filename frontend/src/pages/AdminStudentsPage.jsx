import { GraduationCap } from "lucide-react";
import Layout from "../components/Layout";

export default function AdminStudentsPage() {
  return (
    <Layout>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        gap: 16,
        fontFamily: "Poppins, sans-serif",
        color: "#8a94b2",
      }}>
        <GraduationCap size={48} strokeWidth={1.2} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a2340" }}>
          Students
        </h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Student overview — coming soon.
        </p>
      </div>
    </Layout>
  );
}
