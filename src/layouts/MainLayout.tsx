import React from 'react';
import { NavLink } from 'react-router-dom';
import './MainLayout.css'; // Assuming we might want to drop some styles here, but we'll use inline or existing for now
import appIcon from '../assets/icon.png';

interface MainLayoutProps {
    children: React.ReactNode;
    isLoggedIn: boolean;
    onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, isLoggedIn, onLogout }) => {
    return (
        <div className="app-layout">
            <header className="app-header">
                 <NavLink to="/home" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <div className="logo-section">
                    {/* <span className="logo-sparkle">✨</span> */}
                    <img src={appIcon} alt="App Icon"></img>
                    <h1>X-WEBAPP</h1>
                </div>
                    </NavLink>
                {isLoggedIn && (
                    <nav className="main-nav">
                        {/* <NavLink to="/home" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            หน้าหลัก
                        </NavLink> */}
                        {/* <NavLink to="/income-expense" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            รายรับ-รายจ่าย
                        </NavLink> */}
                        {/* <NavLink to="/bank-statement" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            รายการเดินบัญชี
                        </NavLink> */}
                        {/* <NavLink to="/file-upload" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            อัปโหลดไฟล์
                        </NavLink>
                        <NavLink to="/my-files" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            ไฟล์ของฉัน
                        </NavLink>
                        <NavLink to="/public-files" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                            ไฟล์สาธารณะ
                        </NavLink> */}
                   
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
