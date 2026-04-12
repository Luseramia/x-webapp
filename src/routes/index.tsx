import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import VideoUpload from '../components/VideoUpload';
import Login from '../components/login/login';
import HomeMenu from '../components/home/HomeMenu';
import IncomeExpense from '../components/income-expense';
import VideoPlayer from '../components/video-player';
import VideoFeed from '../components/video-feed';

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
                element={isLoggedIn ? <VideoUpload /> : <Navigate to="/login" />}
            />
            <Route
                path="/income-expense"
                element={isLoggedIn ? <IncomeExpense /> : <Navigate to="/login" />}
            />
            <Route
                path="/watch"
                element={isLoggedIn ? <VideoPlayer /> : <Navigate to="/login" />}
            />
            <Route
                path="/videos"
                element={isLoggedIn ? <VideoFeed /> : <Navigate to="/login" />}
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
