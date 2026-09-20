import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminApp from './admin/AdminApp';
import './styles.css';

const Root = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/') ? AdminApp : App;
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
