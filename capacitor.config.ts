import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.attendance.studentapp',
  appName: 'Student Attendance',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#F8FAFF',
  },
};

export default config;
