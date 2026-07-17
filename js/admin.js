/**
 * Department CGPA Calculator - Admin Portal Controller
 * Covers Dashboard Metrics, Subject CRUD, Student CRUD, Department Setup, and Performance Analytics Reports.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Guard Admin Pages
  const adminPages = ['admin-dashboard.html', 'subjects.html', 'students.html', 'reports.html', 'arrears.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (adminPages.includes(currentPage)) {
    const adminUser = Auth.requireAuth('admin');
    if (!adminUser) return;

    if (typeof syncFromSupabase === 'function') {
      await syncFromSupabase();
    }

    // Render User Header Profile
    const adminNameEl = document.getElementById('admin-display-name');
    if (adminNameEl) adminNameEl.textContent = adminUser.name;

    // Initialize specific page views
    if (currentPage === 'admin-dashboard.html') initAdminDashboard();
    if (currentPage === 'subjects.html') initSubjectManagement();
    if (currentPage === 'students.html') initStudentManagement();
    if (currentPage === 'reports.html') initReportsView();
    if (currentPage === 'arrears.html') initArrearsView();
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

async function handleAddDepartment() {
  const codeInput = document.getElementById('dept-code-input');
  const nameInput = document.getElementById('dept-name-input');

  const code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();

  if (!code || !name) {
    showToast('Department Code and Name are required.', 'danger');
    return;
  }

  if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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

async function confirmDeleteDepartment(deptId) {
  if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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

async function handleSaveSubject(e) {
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

  if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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

async function confirmDeleteSubject(subjectId) {
  if (confirm('Are you sure you want to delete this subject?')) {
    if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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
  document.getElementById('stu-sort-filter')?.addEventListener('change', renderStudentTable);
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

  const sortFilter = document.getElementById('stu-sort-filter')?.value || 'none';
  if (sortFilter === 'name_asc') {
    students.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortFilter === 'name_desc') {
    students.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortFilter === 'regno_asc') {
    students.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
  } else if (sortFilter === 'regno_desc') {
    students.sort((a, b) => b.registerNumber.localeCompare(a.registerNumber));
  }

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
          <button class="btn btn-sm btn-info" onclick="viewStudentMarksheets('${stu.id}')">Docs</button>
          <button class="btn btn-sm btn-secondary" onclick="editStudent('${stu.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteStudent('${stu.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function handleSaveStudent(e) {
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

  if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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

async function confirmDeleteStudent(studentId) {
  if (confirm('Are you sure you want to delete this student account?')) {
    if (typeof syncFromSupabase === 'function') await syncFromSupabase();
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

function viewStudentMarksheets(studentId) {
  const allMarksheets = DB.get(StorageKeys.MARKSHEETS) || {};
  const studentMarksheets = allMarksheets[studentId] || {};
  const listContainer = document.getElementById('marksheets-list');
  
  if (!listContainer) return;
  
  const semesters = Object.keys(studentMarksheets);
  if (semesters.length === 0) {
    listContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); background: var(--bg-hover); border-radius: 4px;">No marksheets uploaded by this student yet.</div>`;
  } else {
    listContainer.innerHTML = semesters.map(sem => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-hover); border-radius: 4px; border: 1px solid var(--border-color);">
        <strong>${sem}</strong>
        <a href="${studentMarksheets[sem]}" target="_blank" class="btn btn-primary btn-sm">View PDF</a>
      </div>
    `).join('');
  }
  
  openModal('marksheets-modal');
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

/* ==========================================================================
   5. Arrears Overview
   ========================================================================= */
function initArrearsView() {
  renderArrearsData();
  document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
  document.getElementById('standing-count-filter')?.addEventListener('change', renderArrearsData);
  document.getElementById('standing-sort-filter')?.addEventListener('change', renderArrearsData);
  document.getElementById('history-count-filter')?.addEventListener('change', renderArrearsData);
  document.getElementById('history-sort-filter')?.addEventListener('change', renderArrearsData);
}

function renderArrearsData() {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const allGrades = DB.get(StorageKeys.GRADES) || {};
  const arrearHistory = DB.get(StorageKeys.ARREAR_HISTORY) || {};
  
  const standingCountFilter = document.getElementById('standing-count-filter')?.value || 'all';
  const standingSortFilter = document.getElementById('standing-sort-filter')?.value || 'none';
  const historyCountFilter = document.getElementById('history-count-filter')?.value || 'all';
  const historySortFilter = document.getElementById('history-sort-filter')?.value || 'date_desc';

  const standingArrearsTbody = document.getElementById('standing-arrears-tbody');
  const arrearHistoryTbody = document.getElementById('arrear-history-tbody');

  let standingRecords = [];
  let historyRecords = [];

  students.forEach(student => {
    // 1. Standing Arrears
    const studentGrades = allGrades[student.id] || {};
    let studentStandingArrears = [];
    Object.keys(studentGrades).forEach(subId => {
      const grade = studentGrades[subId];
      if (grade === 'RA' || grade === 'Absent') {
        const sub = subjects.find(s => s.id === subId);
        if (sub) {
          studentStandingArrears.push({
            studentId: student.id,
            studentName: student.name,
            registerNumber: student.registerNumber,
            department: student.department,
            subjectCode: sub.code,
            subjectName: sub.name,
            grade: grade
          });
        }
      }
    });

    const standingCount = studentStandingArrears.length;
    let includeStanding = false;
    if (standingCountFilter === 'all') includeStanding = true;
    else if (standingCountFilter === '10+') includeStanding = standingCount >= 10;
    else includeStanding = standingCount === parseInt(standingCountFilter);

    if (includeStanding && standingCount > 0) {
      standingRecords.push({
        studentId: student.id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        count: standingCount,
        records: studentStandingArrears
      });
    }

    // 2. Arrear History
    const studentHistory = arrearHistory[student.id] || [];
    const historyCount = studentHistory.length;
    let includeHistory = false;
    if (historyCountFilter === 'all') includeHistory = true;
    else if (historyCountFilter === '10+') includeHistory = historyCount >= 10;
    else includeHistory = historyCount === parseInt(historyCountFilter);

    if (includeHistory && historyCount > 0) {
      historyRecords.push({
        studentId: student.id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        count: historyCount,
        records: studentHistory.map((r, i) => ({ ...r, originalIndex: i }))
      });
    }
  });

  // Sort Standing Records
  if (standingSortFilter === 'name_asc') {
    standingRecords.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } else if (standingSortFilter === 'reg_asc') {
    standingRecords.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
  } else if (standingSortFilter === 'count_desc') {
    standingRecords.sort((a, b) => b.count - a.count);
  }

  // Sort History Records
  if (historySortFilter === 'name_asc') {
    historyRecords.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } else if (historySortFilter === 'count_desc') {
    historyRecords.sort((a, b) => b.count - a.count);
  }

  // Render Standing
  if (standingArrearsTbody) {
    if (standingRecords.length === 0) {
      standingArrearsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No standing arrears found matching criteria.</td></tr>`;
    } else {
      standingArrearsTbody.innerHTML = standingRecords.map(r => `
        <tr>
          <td><a href="#" onclick="viewStudentStandingArrears('${r.studentId}'); return false;" style="color: var(--primary); font-weight: 500; text-decoration: underline;">${r.studentName}</a></td>
          <td>${r.registerNumber}</td>
          <td>${r.department}</td>
          <td><span class="badge badge-danger">${r.count}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewStudentStandingArrears('${r.studentId}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">View Details</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Render History
  if (arrearHistoryTbody) {
    if (historyRecords.length === 0) {
      arrearHistoryTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No arrear history recorded yet for matching criteria.</td></tr>`;
    } else {
      arrearHistoryTbody.innerHTML = historyRecords.map(r => `
        <tr>
          <td><a href="#" onclick="viewStudentArrearHistory('${r.studentId}'); return false;" style="color: var(--primary); font-weight: 500; text-decoration: underline;">${r.studentName}</a></td>
          <td>${r.registerNumber}</td>
          <td><span class="badge badge-warning">${r.count}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewStudentArrearHistory('${r.studentId}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">View Details</button>
          </td>
        </tr>
      `).join('');
    }
  }
}

window.viewStudentArrearHistory = function(studentId) {
  const arrearHistory = DB.get(StorageKeys.ARREAR_HISTORY) || {};
  let studentHistory = arrearHistory[studentId] || [];
  
  const modal = document.getElementById('history-modal');
  const tbody = document.getElementById('history-modal-tbody');
  const title = document.getElementById('history-modal-title');
  
  if (title) {
    const students = DB.get(StorageKeys.STUDENTS) || [];
    const st = students.find(s => s.id === studentId);
    if (st) title.textContent = `Arrear History - ${st.name} (${st.registerNumber})`;
  }
  
  if (studentHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No historical arrears found for this student.</td></tr>`;
  } else {
    const historyWithIndex = studentHistory.map((r, i) => ({ ...r, originalIndex: i }));
    historyWithIndex.sort((a, b) => new Date(b.dateRecorded) - new Date(a.dateRecorded));
    
    tbody.innerHTML = historyWithIndex.map(r => {
      const dateObj = new Date(r.dateRecorded);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString() : r.dateRecorded;
      return `
        <tr>
          <td><strong>${r.subjectCode}</strong></td>
          <td>${r.subjectName}</td>
          <td>${r.semester}</td>
          <td>${dateStr}</td>
          <td><span class="badge badge-warning">${r.grade}</span></td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteArrearHistoryRecord('${studentId}', ${r.originalIndex})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  if (modal) modal.classList.add('active');
};

window.closeHistoryModal = function() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.classList.remove('active');
};

window.deleteArrearHistoryRecord = function(studentId, recordIndex) {
  if (!confirm('Are you sure you want to delete this historical arrear record?')) return;
  
  const arrearHistory = DB.get(StorageKeys.ARREAR_HISTORY) || {};
  if (arrearHistory[studentId] && arrearHistory[studentId].length > recordIndex) {
    arrearHistory[studentId].splice(recordIndex, 1);
    DB.set(StorageKeys.ARREAR_HISTORY, arrearHistory);
    
    if (typeof showToast === 'function') {
      showToast('Historical arrear record deleted successfully.', 'success');
    }
    
    renderArrearsData();
    viewStudentArrearHistory(studentId); // Refresh modal
  }
};

window.viewStudentStandingArrears = function(studentId) {
  const students = DB.get(StorageKeys.STUDENTS) || [];
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const allGrades = DB.get(StorageKeys.GRADES) || {};
  
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const studentGrades = allGrades[studentId] || {};
  let studentStandingArrears = [];
  
  Object.keys(studentGrades).forEach(subId => {
    const grade = studentGrades[subId];
    if (grade === 'RA' || grade === 'Absent') {
      const sub = subjects.find(s => s.id === subId);
      if (sub) {
        studentStandingArrears.push({
          subjectCode: sub.code,
          subjectName: sub.name,
          department: sub.department,
          grade: grade
        });
      }
    }
  });

  const modal = document.getElementById('standing-modal');
  const tbody = document.getElementById('standing-modal-tbody');
  const title = document.getElementById('standing-modal-title');
  
  if (title) {
    title.textContent = `Standing Arrears - ${student.name} (${student.registerNumber})`;
  }
  
  if (studentStandingArrears.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No standing arrears found for this student.</td></tr>`;
  } else {
    tbody.innerHTML = studentStandingArrears.map(r => `
      <tr>
        <td><strong>${r.subjectCode}</strong></td>
        <td>${r.subjectName}</td>
        <td>${r.department}</td>
        <td><span class="badge badge-danger">${r.grade}</span></td>
      </tr>
    `).join('');
  }
  
  if (modal) modal.classList.add('active');
};

window.closeStandingModal = function() {
  const modal = document.getElementById('standing-modal');
  if (modal) modal.classList.remove('active');
};
