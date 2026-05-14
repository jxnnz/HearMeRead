import { Users } from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";

export default function AdminTeachersPage() {
  return (
    <Layout>
      <TopBar title="Teachers" />
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
        <Users size={48} strokeWidth={1.2} />
        <p style={{ margin: 0, fontSize: 14 }}>
          Teacher management — coming soon.
        </p>
      </div>
    </Layout>
  );
}
