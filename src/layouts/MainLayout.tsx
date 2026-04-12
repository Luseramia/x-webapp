import React from 'react';
import { NavLink } from 'react-router-dom';
import './MainLayout.css'; // Assuming we might want to drop some styles here, but we'll use inline or existing for now

interface MainLayoutProps {
    children: React.ReactNode;
    isLoggedIn: boolean;
    onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isLoggedIn, onLogout }) => {
    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="logo-section">
                    <span className="logo-sparkle">✨</span>
                    <h1>Video Portal</h1>
                </div>
                {isLoggedIn && (
                    <nav className="main-nav">
                        <NavLink to="/home" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            หน้าหลัก
                        </NavLink>
                        <NavLink to="/upload" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            อัปโหลดวิดีโอ
                        </NavLink>
                        <NavLink to="/income-expense" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            รายรับ-รายจ่าย
                        </NavLink>
                        <button className="logout-button" onClick={onLogout}>
                            ออกจากระบบ
                        </button>
                    </nav>
                )}
            </header>

            <main id="center">
                {children}
            </main>

            <div className="ticks"></div>
            <section id="spacer"></section>
        </div>
    );
};

export default MainLayout;
