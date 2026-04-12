import React from 'react';
import { Link } from 'react-router-dom';
import './HomeMenu.css';

const HomeMenu: React.FC = () => {
    return (
        <div className="home-menu-container">
            <h2 className="home-title">เลือกเมนูการใช้งาน</h2>
            <div className="menu-grid">
                <Link to="/videos" className="menu-card watch-card">
                    <div className="card-icon">📺</div>
                    <h3>หน้าแรก (วีดีโอ)</h3>
                    <p>รับชมวิดีโอ คลิป และเนื้อหาที่น่าสนใจ</p>
                </Link>
                <Link to="/upload" className="menu-card upload-card">
                    <div className="card-icon">📤</div>
                    <h3>อัปโหลดวิดีโอ</h3>
                    <p>ระบบสำหรับอัปโหลดและจัดการวิดีโอของคุณ</p>
                </Link>
                <Link to="/income-expense" className="menu-card finance-card">
                    <div className="card-icon">💰</div>
                    <h3>รายรับ-รายจ่าย</h3>
                    <p>จัดการบัญชีรายรับรายจ่ายได้อย่างง่ายดาย</p>
                </Link>
            </div>
        </div>
    );
};

export default HomeMenu;
