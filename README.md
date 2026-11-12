# Student Attendance App

Modern, minimalistic Android mobile app for program-wise and semester-wise student attendance with instant Excel (`.xlsx`) generation.

## Features
- **Minimalistic Pill UI**: Large horizontal pill buttons (`#6495ED`, `#002B5B`, 50% border radius, flat design).
- **Home Screen**: Starts with `Setup`, `Reports`, and `Overview` buttons, and dynamically adds a button for every Program you create (e.g., `BBA`).
- **Drill-down Navigation**: Tap a Program (e.g., `BBA`) -> see all its Semesters -> tap a Semester -> see all Subjects with Teacher names -> mark **Present**, **Absent**, or **Leave** for every student.
- **Excel Export**: Generate daily attendance `.xlsx` sheets or full subject registers directly from the app and share/open on Android.

## Build APK on GitHub
1. Push this folder (`student-attendance-app`) to a GitHub repository.
2. Open the **Actions** tab in your GitHub repository.
3. The **Build Android APK** workflow will run automatically (or click **Run workflow**).
4. Download **Student-Attendance-APK** from the workflow artifacts and install `app-debug.apk` on any Android 7.0+ mobile device.
