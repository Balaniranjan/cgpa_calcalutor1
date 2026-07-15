# Department CGPA Calculator Management System

A modern, responsive, professional web application built using standard HTML5, CSS3, and ES6 JavaScript (no framework overhead). The system includes dedicated Admin and Student portals, responsive glassmorphic/material design UI, full Local Storage database persistence, weighted CGPA calculation engine, analytics reporting, and PDF/Print export support.

---

## 🚀 Key Features

### 🛡️ Admin Portal
- **Dashboard Overview**: Statistical card counters (Total Students, Total Subjects, Departments, Academic Years) and live department breakdown.
- **Department Management**: Create and configure custom academic departments.
- **Subject Management (CRUD)**:
  - Add, Edit, Delete subjects with fields: *Subject Code*, *Subject Name*, *Credits*, *Department*, *Year*, *Semester*.
  - Validates unique subject codes and positive credits.
  - Searchable and filterable data table (by Department, Academic Year, Semester).
- **Student Account Management (CRUD)**:
  - Create student credentials with *Register Number*, *Student Name*, *Department*, *Year*, *Semester*, *Username*, *Password*.
  - Searchable by name, register number, or username.
- **Analytics & Performance Reports**:
  - Detailed student performance summary.
  - Top 5 Rank Holders leaderboard.
  - Export report data to Microsoft Excel (CSV format).
  - Print or Save as PDF statement format.

---

### 🎓 Student Portal
- **Student Dashboard**: Personalized academic profile displaying Name, Register Number, Department, Year, and Semester.
- **Automated Subject Filtering**: Automatically fetches subjects configured by the Admin matching the student's exact department, year, and semester.
- **Dynamic Grade Selector**: Select grades for each course (`O`, `A+`, `A`, `B+`, `B`, `C`, `RA`, `Absent`).
- **Weighted CGPA Engine**:
  $$\text{CGPA} = \frac{\sum (\text{Credits} \times \text{Grade Point})}{\sum \text{Credits}}$$
  Calculates Total Credits, Total Credit Points, and Final CGPA rounded to 2 decimal places.
- **Actions**:
  - Instant Recalculation & Grade Reset.
  - Save grades directly to Local Storage.
  - Official Printable Statement & PDF Download format.

---

## 🎨 Theme & UI Aesthetics
- **Design Language**: Glassmorphism and modern dashboard style.
- **Typography**: Google Fonts **Poppins**.
- **Dark Mode Support**: One-click theme toggle switch with preference persistence.
- **Responsive Layout**: Works smoothly on Desktop, Tablet, and Mobile devices with collapsible sidebar navigation.
- **Notifications**: Integrated floating toast alert system.

---

## 📊 Grade Point System Reference

| Grade | Description | Grade Point |
|-------|-------------|-------------|
| **O** | Outstanding | 10 |
| **A+**| Excellent | 9 |
| **A** | Very Good | 8 |
| **B+**| Good | 7 |
| **B** | Above Average| 6 |
| **C** | Satisfactory | 5 |
| **RA**| Re-appear | 0 |
| **Absent**| Absent | 0 |

---

## 📂 Project Directory Structure

```
cgpa calculator/
├── index.html               # Main Landing Page
├── admin-login.html         # Administrator Login Page
├── student-login.html       # Student Login Page
├── admin-dashboard.html     # Admin Overview & Quick Actions
├── subjects.html            # Subject Catalog Management (CRUD)
├── students.html            # Student Account Management (CRUD)
├── reports.html             # Performance Reports & CSV/PDF Export
├── student-dashboard.html   # Student Grade Entry & CGPA Calculator
├── css/
│   └── style.css            # Complete Styling, Glassmorphism, Dark Theme & Print Media Queries
├── js/
│   ├── storage.js           # LocalStorage DB engine & pre-configured Seed Data
│   ├── auth.js              # Authentication, Session State & Route Protection
│   ├── script.js            # Theme Toggle, Mobile Nav, Custom Modals & Toasts
│   ├── admin.js             # Controller for Admin Portal operations
│   └── student.js           # Controller for Student CGPA calculation & export
└── README.md                # System Documentation
```

---

## 🔑 Demo Access Credentials

### Admin Login
- **Username**: `admin`
- **Password**: `admin123`

### Student Login Samples
- **Student 1**: Username: `alex` | Register No: `312221104001` | Password: `student123`
- **Student 2**: Username: `sophia` | Register No: `312221104002` | Password: `student123`
- **Student 3**: Username: `ethan` | Register No: `312221205001` | Password: `student123`
