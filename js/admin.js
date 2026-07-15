/**
 * Department CGPA Calculator - Admin Portal Controller
 * Covers Dashboard Metrics, Subject CRUD, Student CRUD, Department Setup, and Performance Analytics Reports.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Guard Admin Pages
  const adminPages = ['admin-dashboard.html', 'subjects.html', 'students.html', 'reports.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (adminPages.includes(currentPage)) {
    const adminUser = Auth.requireAuth('admin');
    if (!adminUser) return;

    // Render User Header Profile
    const adminNameEl = document.getElementById('admin-display-name');
    if (adminNameEl) adminNameEl.textContent = adminUser.name;

    // Initialize specific page views
    if (currentPage === 'admin-dashboard.html') initAdminDashboard();
    if (currentPage === 'subjects.html') initSubjectManagement();
    if (currentPage === 'students.html') initStudentManagement();
    if (currentPage === 'reports.html') initReportsView();
  }
});

/* ==========================================================================
   1. Admin Dashboard View
   ========================================================================== */
function initAdminDashboard() {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const departments = DB.get(StorageKeys.DEPARTMENTS) || [];
  const years = DB.get(StorageKeys.YEARS) || [];

  // Stat Counter Elements
  const totalStudentsEl = document.getElementById('stat-total-students');
  const totalSubjectsEl = document.getElementById('stat-total-subjects');
  const totalDeptsEl = document.getElementById('stat-total-depts');
  const totalYearsEl = document.getElementById('stat-total-years');

  if (totalStudentsEl) totalStudentsEl.textContent = students.length;
  if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
  if (totalDeptsEl) totalDeptsEl.textContent = departments.length;
  if (totalYearsEl) totalYearsEl.textContent = years.length;

  // Render Department Quick List Table
  renderDepartmentSummaryTable(departments, students, subjects);

  // Render Department Modal Form Listener
  const addDeptBtn = document.getElementById('add-dept-btn');
  if (addDeptBtn) {
    addDeptBtn.addEventListener('click', handleAddDepartment);
  }
}

function renderDepartmentSummaryTable(departments, students, subjects) {
  const tableBody = document.getElementById('dept-summary-tbody');
  if (!tableBody) return;

  if (departments.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">No departments configured yet. Click '+ Create Department' above to add one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept.code || s.department === dept.name);
    const deptSubjects = subjects.filter(sub => sub.department === dept.code || sub.department === dept.name);

    return `
      <tr>
        <td><strong>${dept.code}</strong></td>
        <td>${dept.name}</td>
        <td><span class="badge badge-primary">${deptStudents.length} Students</span></td>
        <td><span class="badge badge-success">${deptSubjects.length} Subjects</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteDepartment('${dept.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAddDepartment() {
  const codeInput = document.getElementById('dept-code-input');
  const nameInput = document.getElementById('dept-name-input');

  const code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();

  if (!code || !name) {
    showToast('Department Code and Name are required.', 'danger');
    return;
  }

  const departments = DB.get(StorageKeys.DEPARTMENTS) || [];
  if (departments.some(d => d.code === code)) {
    showToast('Department Code already exists.', 'warning');
    return;
  }

  departments.push({
    id: 'DEP' + Date.now(),
    code: code,
    name: name
  });

  DB.set(StorageKeys.DEPARTMENTS, departments);
  showToast('Department created successfully!', 'success');
  
  codeInput.value = '';
  nameInput.value = '';
  closeModal('dept-modal');
  initAdminDashboard();
}

function confirmDeleteDepartment(deptId) {
  const departments = DB.get(StorageKeys.DEPARTMENTS) || [];
  const dept = departments.find(d => d.id === deptId);
  if (!dept) return;

  if (confirm(`Are you sure you want to delete the department '${dept.name} (${dept.code})'?`)) {
    const updatedDepts = departments.filter(d => d.id !== deptId);
    DB.set(StorageKeys.DEPARTMENTS, updatedDepts);

    showToast(`Department '${dept.code}' deleted successfully.`, 'success');
    initAdminDashboard();
  }
}

/* ==========================================================================
   2. Subject Management (CRUD)
   ========================================================================== */
let editingSubjectId = null;

function initSubjectManagement() {
  populateDropdownFilters('sub-dept-filter', 'sub-year-filter', 'sub-sem-filter');
  populateFormDropdowns('subject-dept', 'subject-year', 'subject-sem');

  renderSubjectTable();

  // Search & Filter Events
  document.getElementById('subject-search-input')?.addEventListener('input', renderSubjectTable);
  document.getElementById('sub-dept-filter')?.addEventListener('change', renderSubjectTable);
  document.getElementById('sub-year-filter')?.addEventListener('change', renderSubjectTable);
  document.getElementById('sub-sem-filter')?.addEventListener('change', renderSubjectTable);

  // Form Submit (Save / Update)
  document.getElementById('subject-form')?.addEventListener('submit', handleSaveSubject);
  document.getElementById('reset-subject-btn')?.addEventListener('click', resetSubjectForm);
}

function renderSubjectTable() {
  const tableBody = document.getElementById('subject-tbody');
  if (!tableBody) return;

  let subjects = DB.get(StorageKeys.SUBJECTS) || [];

  const searchQuery = document.getElementById('subject-search-input')?.value.trim().toLowerCase() || '';
  const deptFilter = document.getElementById('sub-dept-filter')?.value || '';
  const yearFilter = document.getElementById('sub-year-filter')?.value || '';
  const semFilter = document.getElementById('sub-sem-filter')?.value || '';

  // Apply Filters
  subjects = subjects.filter(sub => {
    const matchesSearch = sub.code.toLowerCase().includes(searchQuery) || sub.name.toLowerCase().includes(searchQuery);
    const matchesDept = !deptFilter || sub.department === deptFilter;
    const matchesYear = !yearFilter || sub.year === yearFilter;
    const matchesSem = !semFilter || sub.semester === semFilter;
    return matchesSearch && matchesDept && matchesYear && matchesSem;
  });

  if (subjects.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No subjects found matching filters.</td></tr>`;
    return;
  }

  tableBody.innerHTML = subjects.map(sub => `
    <tr>
      <td><strong>${sub.code}</strong></td>
      <td>${sub.name}</td>
      <td><span class="badge badge-primary">${sub.credits} Credits</span></td>
      <td>${sub.department}</td>
      <td>${sub.year}</td>
      <td>${sub.semester}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="editSubject('${sub.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteSubject('${sub.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function handleSaveSubject(e) {
  e.preventDefault();
  const code = document.getElementById('subject-code').value.trim().toUpperCase();
  const name = document.getElementById('subject-name').value.trim();
  const credits = parseInt(document.getElementById('subject-credits').value, 10);
  const dept = document.getElementById('subject-dept').value;
  const year = document.getElementById('subject-year').value;
  const sem = document.getElementById('subject-sem').value;

  if (!code || !name || isNaN(credits) || !dept || !year || !sem) {
    showToast('Please fill all required fields properly.', 'danger');
    return;
  }

  if (credits <= 0) {
    showToast('Credits must be a positive number.', 'warning');
    return;
  }

  let subjects = DB.get(StorageKeys.SUBJECTS) || [];

  // Check unique code (if creating or editing to a new code)
  const existingIndex = subjects.findIndex(s => s.code === code);
  if (existingIndex !== -1 && (!editingSubjectId || subjects[existingIndex].id !== editingSubjectId)) {
    showToast(`Subject Code '${code}' already exists!`, 'warning');
    return;
  }

  if (editingSubjectId) {
    // Update existing
    subjects = subjects.map(s => s.id === editingSubjectId ? { ...s, code, name, credits, department: dept, year, semester: sem } : s);
    showToast('Subject updated successfully!', 'success');
  } else {
    // Create new
    subjects.push({
      id: 'SUB' + Date.now(),
      code,
      name,
      credits,
      department: dept,
      year,
      semester: sem
    });
    showToast('New Subject added successfully!', 'success');
  }

  DB.set(StorageKeys.SUBJECTS, subjects);
  resetSubjectForm();
  renderSubjectTable();
}

function editSubject(subjectId) {
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  editingSubjectId = subject.id;
  document.getElementById('subject-code').value = subject.code;
  document.getElementById('subject-name').value = subject.name;
  document.getElementById('subject-credits').value = subject.credits;
  document.getElementById('subject-dept').value = subject.department;
  document.getElementById('subject-year').value = subject.year;
  document.getElementById('subject-sem').value = subject.semester;

  document.getElementById('save-subject-btn').textContent = 'Update Subject';
  openModal('subject-modal');
}

function confirmDeleteSubject(subjectId) {
  if (confirm('Are you sure you want to delete this subject?')) {
    let subjects = DB.get(StorageKeys.SUBJECTS) || [];
    subjects = subjects.filter(s => s.id !== subjectId);
    DB.set(StorageKeys.SUBJECTS, subjects);
    showToast('Subject deleted successfully.', 'success');
    renderSubjectTable();
  }
}

function resetSubjectForm() {
  editingSubjectId = null;
  document.getElementById('subject-form')?.reset();
  const saveBtn = document.getElementById('save-subject-btn');
  if (saveBtn) saveBtn.textContent = 'Save Subject';
  closeModal('subject-modal');
}

/* ==========================================================================
   3. Student Management (CRUD)
   ========================================================================== */
let editingStudentId = null;

function initStudentManagement() {
  populateDropdownFilters('stu-dept-filter', 'stu-year-filter', 'stu-sem-filter');
  populateFormDropdowns('student-dept', 'student-year', 'student-sem');

  renderStudentTable();

  // Search & Filters
  document.getElementById('student-search-input')?.addEventListener('input', renderStudentTable);
  document.getElementById('stu-dept-filter')?.addEventListener('change', renderStudentTable);
  document.getElementById('stu-year-filter')?.addEventListener('change', renderStudentTable);
  document.getElementById('stu-sem-filter')?.addEventListener('change', renderStudentTable);

  // Form submit
  document.getElementById('student-form')?.addEventListener('submit', handleSaveStudent);
  document.getElementById('reset-student-btn')?.addEventListener('click', resetStudentForm);
}

function renderStudentTable() {
  const tableBody = document.getElementById('student-tbody');
  if (!tableBody) return;

  let students = DB.get(StorageKeys.STUDENTS) || [];

  const searchQuery = document.getElementById('student-search-input')?.value.trim().toLowerCase() || '';
  const deptFilter = document.getElementById('stu-dept-filter')?.value || '';
  const yearFilter = document.getElementById('stu-year-filter')?.value || '';
  const semFilter = document.getElementById('stu-sem-filter')?.value || '';

  students = students.filter(stu => {
    const matchesSearch = stu.registerNumber.toLowerCase().includes(searchQuery) ||
                          stu.name.toLowerCase().includes(searchQuery) ||
                          stu.username.toLowerCase().includes(searchQuery);
    const matchesDept = !deptFilter || stu.department === deptFilter;
    const matchesYear = !yearFilter || stu.year === yearFilter;
    const matchesSem = !semFilter || stu.semester === semFilter;
    return matchesSearch && matchesDept && matchesYear && matchesSem;
  });

  if (students.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No student accounts found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = students.map(stu => `
    <tr>
      <td><strong>${stu.registerNumber}</strong></td>
      <td>${stu.name}</td>
      <td>${stu.department}</td>
      <td>${stu.year}</td>
      <td>${stu.semester}</td>
      <td><code>${stu.username}</code></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="editStudent('${stu.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteStudent('${stu.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function handleSaveStudent(e) {
  e.preventDefault();
  const regNo = document.getElementById('student-regno').value.trim();
  const name = document.getElementById('student-name').value.trim();
  const dept = document.getElementById('student-dept').value;
  const year = document.getElementById('student-year').value;
  const sem = document.getElementById('student-sem').value;
  const username = document.getElementById('student-username').value.trim();
  const password = document.getElementById('student-password').value;

  if (!regNo || !name || !dept || !year || !sem || !username || !password) {
    showToast('All student fields are required.', 'danger');
    return;
  }

  let students = DB.get(StorageKeys.STUDENTS) || [];

  // Uniqueness validation
  const duplicateReg = students.find(s => s.registerNumber === regNo && s.id !== editingStudentId);
  if (duplicateReg) {
    showToast(`Register Number '${regNo}' is already registered!`, 'warning');
    return;
  }

  const duplicateUser = students.find(s => s.username.toLowerCase() === username.toLowerCase() && s.id !== editingStudentId);
  if (duplicateUser) {
    showToast(`Username '${username}' is already taken!`, 'warning');
    return;
  }

  if (editingStudentId) {
    students = students.map(s => s.id === editingStudentId ? {
      ...s, registerNumber: regNo, name, department: dept, year, semester: sem, username, password
    } : s);
    showToast('Student account updated successfully!', 'success');
  } else {
    students.push({
      id: 'STU' + Date.now(),
      registerNumber: regNo,
      name,
      department: dept,
      year,
      semester: sem,
      username,
      password
    });
    showToast('New Student account created!', 'success');
  }

  DB.set(StorageKeys.STUDENTS, students);
  resetStudentForm();
  renderStudentTable();
}

function editStudent(studentId) {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  editingStudentId = student.id;
  document.getElementById('student-regno').value = student.registerNumber;
  document.getElementById('student-name').value = student.name;
  document.getElementById('student-dept').value = student.department;
  document.getElementById('student-year').value = student.year;
  document.getElementById('student-sem').value = student.semester;
  document.getElementById('student-username').value = student.username;
  document.getElementById('student-password').value = student.password;

  document.getElementById('save-student-btn').textContent = 'Update Account';
  openModal('student-modal');
}

function confirmDeleteStudent(studentId) {
  if (confirm('Are you sure you want to delete this student account?')) {
    let students = DB.get(StorageKeys.STUDENTS) || [];
    students = students.filter(s => s.id !== studentId);
    DB.set(StorageKeys.STUDENTS, students);

    // Also clean up grades map
    const allGrades = DB.get(StorageKeys.GRADES) || {};
    delete allGrades[studentId];
    DB.set(StorageKeys.GRADES, allGrades);

    showToast('Student account deleted.', 'success');
    renderStudentTable();
  }
}

function resetStudentForm() {
  editingStudentId = null;
  document.getElementById('student-form')?.reset();
  const saveBtn = document.getElementById('save-student-btn');
  if (saveBtn) saveBtn.textContent = 'Create Student';
  closeModal('student-modal');
}

/* ==========================================================================
   4. Performance Analytics & Reports
   ========================================================================= */
function initReportsView() {
  renderReportsData();

  document.getElementById('export-excel-btn')?.addEventListener('click', exportReportsCSV);
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
}

function renderReportsData() {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const allGrades = DB.get(StorageKeys.GRADES) || {};

  // Compute stats for each student
  const studentStats = students.map(student => {
    const studentGrades = allGrades[student.id] || {};
    const relevantSubjects = subjects.filter(sub => 
      sub.department === student.department &&
      sub.year === student.year &&
      sub.semester === student.semester
    );

    let totalCredits = 0;
    let totalPoints = 0;
    let completedSubs = 0;
    let hasFailures = false;

    relevantSubjects.forEach(sub => {
      const grade = studentGrades[sub.id];
      if (grade) {
        completedSubs++;
        const gradePoint = GradePointMap[grade] !== undefined ? GradePointMap[grade] : 0;
        if (grade === 'RA' || grade === 'Absent') hasFailures = true;
        totalCredits += sub.credits;
        totalPoints += sub.credits * gradePoint;
      }
    });

    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    return {
      ...student,
      totalCredits,
      totalPoints,
      completedSubs,
      cgpa: parseFloat(cgpa),
      status: (completedSubs > 0 && !hasFailures && parseFloat(cgpa) >= 5.0) ? 'PASS' : (completedSubs === 0 ? 'PENDING' : 'FAIL')
    };
  });

  // Render Top Rankers Table
  const sortedStudents = [...studentStats].sort((a, b) => b.cgpa - a.cgpa);
  const rankerTable = document.getElementById('rankers-tbody');
  if (rankerTable) {
    rankerTable.innerHTML = sortedStudents.slice(0, 5).map((stu, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>${stu.name}</td>
        <td>${stu.registerNumber}</td>
        <td>${stu.department}</td>
        <td><span class="badge badge-primary">${stu.cgpa.toFixed(2)} CGPA</span></td>
      </tr>
    `).join('');
  }

  // Render All Student CGPA Summary
  const allReportTable = document.getElementById('all-report-tbody');
  if (allReportTable) {
    allReportTable.innerHTML = studentStats.map(stu => `
      <tr>
        <td><strong>${stu.registerNumber}</strong></td>
        <td>${stu.name}</td>
        <td>${stu.department}</td>
        <td>${stu.year} - ${stu.semester}</td>
        <td>${stu.totalCredits}</td>
        <td><strong>${stu.cgpa.toFixed(2)}</strong></td>
        <td>
          <span class="badge badge-${stu.status === 'PASS' ? 'success' : (stu.status === 'FAIL' ? 'danger' : 'warning')}">
            ${stu.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
}

function exportReportsCSV() {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const allGrades = DB.get(StorageKeys.GRADES) || {};

  let csvContent = "Register Number,Student Name,Department,Year,Semester,Total Credits,CGPA,Status\n";

  students.forEach(student => {
    const studentGrades = allGrades[student.id] || {};
    const relevantSubjects = subjects.filter(sub => 
      sub.department === student.department &&
      sub.year === student.year &&
      sub.semester === student.semester
    );

    let totalCredits = 0;
    let totalPoints = 0;
    let hasFailures = false;
    let completedSubs = 0;

    relevantSubjects.forEach(sub => {
      const grade = studentGrades[sub.id];
      if (grade) {
        completedSubs++;
        const gradePoint = GradePointMap[grade] !== undefined ? GradePointMap[grade] : 0;
        if (grade === 'RA' || grade === 'Absent') hasFailures = true;
        totalCredits += sub.credits;
        totalPoints += sub.credits * gradePoint;
      }
    });

    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    const status = (completedSubs > 0 && !hasFailures && parseFloat(cgpa) >= 5.0) ? 'PASS' : 'FAIL/PENDING';

    csvContent += `"${student.registerNumber}","${student.name}","${student.department}","${student.year}","${student.semester}",${totalCredits},${cgpa},"${status}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Department_CGPA_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Excel/CSV report exported successfully!', 'success');
}

/* ==========================================================================
   Helper Methods for Populating Dropdowns
   ========================================================================== */
function populateDropdownFilters(deptId, yearId, semId) {
  const depts = DB.get(StorageKeys.DEPARTMENTS) || [];
  const years = DB.get(StorageKeys.YEARS) || [];
  const sems = DB.get(StorageKeys.SEMESTERS) || [];

  const deptEl = document.getElementById(deptId);
  const yearEl = document.getElementById(yearId);
  const semEl = document.getElementById(semId);

  if (deptEl) {
    deptEl.innerHTML = `<option value="">All Departments</option>` + depts.map(d => `<option value="${d.code}">${d.name} (${d.code})</option>`).join('');
  }

  if (yearEl) {
    yearEl.innerHTML = `<option value="">All Academic Years</option>` + years.map(y => `<option value="${y.name}">${y.name}</option>`).join('');
  }

  if (semEl) {
    semEl.innerHTML = `<option value="">All Semesters</option>` + sems.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  }
}

function populateFormDropdowns(deptId, yearId, semId) {
  const depts = DB.get(StorageKeys.DEPARTMENTS) || [];
  const years = DB.get(StorageKeys.YEARS) || [];
  const sems = DB.get(StorageKeys.SEMESTERS) || [];

  const deptEl = document.getElementById(deptId);
  const yearEl = document.getElementById(yearId);
  const semEl = document.getElementById(semId);

  if (deptEl) {
    deptEl.innerHTML = `<option value="">Select Department</option>` + depts.map(d => `<option value="${d.code}">${d.name} (${d.code})</option>`).join('');
  }

  if (yearEl) {
    yearEl.innerHTML = `<option value="">Select Academic Year</option>` + years.map(y => `<option value="${y.name}">${y.name}</option>`).join('');
  }

  if (semEl) {
    semEl.innerHTML = `<option value="">Select Semester</option>` + sems.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  }
}
