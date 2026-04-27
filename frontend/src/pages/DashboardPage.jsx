import { LayoutDashboard } from "lucide-react";
import Layout from "../components/Layout";

export default function DashboardPage() {
  return (
    <Layout>
      <div className="db-page">
        <h1 className="db-title">Dashboard</h1>
        <div className="db-coming-soon">
          <LayoutDashboard size={48} strokeWidth={1.2} className="db-icon" />
          <h2 className="db-cs-heading">Coming Soon</h2>
          <p className="db-cs-text">
            The dashboard with reading analytics and class overview is under development.
          </p>
        </div>
      </div>

      <style>{`
        .db-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 8px 0 32px;
        }
        .db-title {
          font-size: 22px;
          font-weight: 700;
          color: #1a2340;
          margin: 0 0 32px;
        }
        .db-coming-soon {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #dde3f0;
          padding: 64px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .db-icon {
          color: #9099b8;
        }
        .db-cs-heading {
          font-size: 20px;
          font-weight: 700;
          color: #1a2340;
          margin: 0;
        }
        .db-cs-text {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          max-width: 360px;
        }
      `}</style>
    </Layout>
  );
}
