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
                <Link to="/file-upload" className="menu-card upload-card">
                    <div className="card-icon">📤</div>
                    <h3>อัปโหลดไฟล์</h3>
                    <p>อัปโหลดวิดีโอ, รูปภาพ, เอกสาร และไฟล์อื่นๆ</p>
                </Link>
                {/* <Link to="/income-expense" className="menu-card finance-card">
                    <div className="card-icon">💰</div>
                    <h3>รายรับ-รายจ่าย</h3>
                    <p>จัดการบัญชีรายรับรายจ่ายได้อย่างง่ายดาย</p>
                </Link> */}
                <Link to="/my-files" className="menu-card finance-card">
                    <div className="card-icon">📂</div>
                    <h3>ไฟล์ของฉัน</h3>
                    <p>ดูและดาวน์โหลดไฟล์ที่คุณอัปโหลด</p>
                </Link>
                <Link to="/public-files" className="menu-card watch-card">
                    <div className="card-icon">🌐</div>
                    <h3>ไฟล์สาธารณะ</h3>
                    <p>เรียกดูไฟล์ที่ถูกแชร์เป็นสาธารณะ</p>
                </Link>
            </div>
        </div>
    );
};

export default HomeMenu;
