import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Capacitor } from '@capacitor/core';
import MobileApp from './mobile/MobileApp.jsx';
import './mobile/mobile.css';
import './style.css';
import './layout.css';
const mobile = Capacitor.getPlatform() === 'android' || import.meta.env.MODE === 'mobile';
createRoot(document.getElementById('root')).render(mobile ? <MobileApp/> : <App />);

import './appearance.css';

import './desktop.css';
