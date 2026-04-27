import Sidebar from "./Sidebar";
import "./component css/Layout.css";
 
export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">{children}</main>
    </div>
  );
}