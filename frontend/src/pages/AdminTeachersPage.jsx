import { Users } from "lucide-react";
import Layout from "../components/Layout";

export default function AdminTeachersPage() {
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
        <Users size={48} strokeWidth={1.2} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a2340" }}>
          Teachers
        </h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Teacher management — coming soon.
        </p>
      </div>
    </Layout>
  );
}
