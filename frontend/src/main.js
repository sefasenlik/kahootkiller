import { createApp } from 'vue';
import axios from 'axios';
import App from './App.vue';

// Configure axios baseURL for subpath deployment
const basePath = import.meta.env.VITE_BASE_PATH || '';
axios.defaults.baseURL = basePath;

createApp(App).mount('#app');
