import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'e2e',use:{baseURL:'http://127.0.0.1:3107',permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},webServer:{command:'npm run start -- --port 3107',url:'http://127.0.0.1:3107',reuseExistingServer:false,timeout:60000}});
