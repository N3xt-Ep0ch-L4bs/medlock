import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { DashboardHeader } from "./components/DashboardHeader";
import "../dashboard.css";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="dashboard">
      <DashboardSidebar />
      <div>
        <DashboardHeader />
        <div className="main-area">
          <main className="main-content">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};
