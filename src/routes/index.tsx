import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/login/login';
import HomeMenu from '../components/home/HomeMenu';
import IncomeExpense from '../components/income-expense';
import BankStatement from '../components/bank-statement';
import Dashboard from '../components/bank-statement/bank-statement-dashboard';
import VideoPlayer from '../components/video-player';
import VideoFeed from '../components/video-feed';
import FileUpload from '../components/file-upload';
import MyFiles from '../components/my-files';
import PublicFiles from '../components/public-files';

interface AppRoutesProps {
    isLoggedIn: boolean;
    onLogin: () => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ isLoggedIn, onLogin }) => {
    return (
        <Routes>
            <Route
                path="/login"
                element={isLoggedIn ? <Navigate to="/home" /> : <Login onLoginSuccess={onLogin} />}
            />
            <Route
                path="/home"
                element={isLoggedIn ? <HomeMenu /> : <Navigate to="/login" />}
            />
            <Route
                path="/upload"
                element={<Navigate to="/file-upload" />}
            />
            {/* <Route
                path="/income-expense"
                element={isLoggedIn ? <IncomeExpense /> : <Navigate to="/login" />}
            /> */}
            <Route
                path="/bank-statement"
                element={isLoggedIn ? <BankStatement /> : <Navigate to="/login" />}
            />
            {/* <Route
                path="/dashboard"
                element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />}
            /> */}
            <Route
                path="/watch"
                element={isLoggedIn ? <VideoPlayer /> : <Navigate to="/login" />}
            />
            <Route
                path="/videos"
                element={isLoggedIn ? <VideoFeed /> : <Navigate to="/login" />}
            />
            <Route
                path="/file-upload"
                element={isLoggedIn ? <FileUpload /> : <Navigate to="/login" />}
            />
            <Route
                path="/my-files"
                element={isLoggedIn ? <MyFiles /> : <Navigate to="/login" />}
            />
            <Route
                path="/public-files"
                element={isLoggedIn ? <PublicFiles /> : <Navigate to="/login" />}
            />
            <Route
                path="/"
                element={<Navigate to={isLoggedIn ? "/home" : "/login"} />}
            />
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRoutes;
