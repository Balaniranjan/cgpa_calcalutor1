/**
 * Department CGPA Calculator - Student Portal Controller
 * Manages Student Profile, Automated Subject Filtering, Dynamic Grade Mapping,
 * Real-time Weighted CGPA Engine, Local Storage Auto-Saving, and PDF / Statement Printing.
 */

let currentStudent = null;
let assignedSubjects = [];
let studentGrades = {};

document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = window.location.pathname.split('/').pop();

  if (currentPage === 'student-dashboard.html') {
    currentStudent = Auth.requireAuth('student');
    if (!currentStudent) return;

    if (typeof syncFromSupabase === 'function') {
      await syncFromSupabase();
    }

    initStudentDashboard();
  }
});

function initStudentDashboard() {
  // Render Student Information Banner
  renderStudentProfile();

  // Initialize Semester Selection Dropdown
  initSemesterSelector();

  // Load Assigned Subjects & Saved Grades for selected semester
  const semSelector = document.getElementById('student-sem-selector');
  const activeSem = semSelector ? semSelector.value : currentStudent.semester;
  loadStudentData(activeSem);

  // Render Grade Entry Table & Calculate Initial Metrics
  renderSubjectGradeTable();
  calculateCGPA();

  // Event Listeners
  document.getElementById('student-sem-selector')?.addEventListener('change', (e) => {
    loadStudentData(e.target.value);
    renderSubjectGradeTable();
    calculateCGPA();
  });

  document.getElementById('recalculate-btn')?.addEventListener('click', () => {
    calculateCGPA();
    showToast('CGPA recalculated successfully!', 'info');
  });

  document.getElementById('save-grades-btn')?.addEventListener('click', saveGradesToStorage);
  document.getElementById('reset-grades-btn')?.addEventListener('click', resetGrades);

  document.getElementById('upload-marksheet-btn')?.addEventListener('click', () => {
    document.getElementById('marksheet-upload-input')?.click();
  });
  document.getElementById('marksheet-upload-input')?.addEventListener('change', handleMarksheetUpload);
}

function initSemesterSelector() {
  const selector = document.getElementById('student-sem-selector');
  if (!selector) return;

  const sems = DB.get(StorageKeys.SEMESTERS) || [
    { name: 'Semester 1' }, { name: 'Semester 2' }, { name: 'Semester 3' }, { name: 'Semester 4' },
    { name: 'Semester 5' }, { name: 'Semester 6' }, { name: 'Semester 7' }, { name: 'Semester 8' }
  ];

  let optionsHtml = `<option value="ALL">All Semesters (Cumulative CGPA)</option>`;
  optionsHtml += sems.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

  selector.innerHTML = optionsHtml;

  // Set default selected semester to Student's assigned current semester
  selector.value = currentStudent.semester || 'Semester 5';
}

function renderStudentProfile() {
  const nameEl = document.getElementById('student-display-name');
  const regEl = document.getElementById('student-display-regno');
  const deptEl = document.getElementById('student-display-dept');
  const yearEl = document.getElementById('student-display-year');
  const semEl = document.getElementById('student-display-sem');

  if (nameEl) nameEl.textContent = currentStudent.name;
  if (regEl) regEl.textContent = currentStudent.registerNumber;
  if (deptEl) deptEl.textContent = currentStudent.department;
  if (yearEl) yearEl.textContent = currentStudent.year;
  if (semEl) semEl.textContent = currentStudent.semester;
}

function loadStudentData(selectedSem) {
  const subjects = DB.get(StorageKeys.SUBJECTS) || [];
  const depts = DB.get(StorageKeys.DEPARTMENTS) || [];
  const allGrades = DB.get(StorageKeys.GRADES) || {};

  // Find target department code and name for robust matching
  const targetDept = (currentStudent.department || '').trim().toLowerCase();
  const deptObj = depts.find(d => 
    d.code.toLowerCase() === targetDept || d.name.toLowerCase() === targetDept
  );
  const deptCode = deptObj ? deptObj.code.toLowerCase() : targetDept;
  const deptName = deptObj ? deptObj.name.toLowerCase() : targetDept;

  const targetSem = selectedSem || currentStudent.semester;

  // Filter subjects matching Student's Department and selected Semester (or ALL semesters)
  assignedSubjects = subjects.filter(sub => {
    const subDept = (sub.department || '').trim().toLowerCase();
    const isDeptMatch = (subDept === deptCode || subDept === deptName);
    const isSemMatch = (targetSem === 'ALL' || sub.semester.trim().toLowerCase() === targetSem.trim().toLowerCase());
    return isDeptMatch && isSemMatch;
  });

  // Retrieve saved grades for this student
  studentGrades = allGrades[currentStudent.id] || {};

  // Handle UI for Marksheet upload
  const uploadSection = document.getElementById('marksheet-upload-section');
  const uploadStatus = document.getElementById('marksheet-upload-status');
  const uploadInput = document.getElementById('marksheet-upload-input');
  
  if (uploadSection) {
    if (targetSem === 'ALL') {
      uploadSection.style.display = 'none';
    } else {
      uploadSection.style.display = 'flex';
      // Check if marksheet already uploaded
      const allMarksheets = DB.get(StorageKeys.MARKSHEETS) || {};
      const studentMarksheets = allMarksheets[currentStudent.id] || {};
      if (studentMarksheets[targetSem]) {
        uploadStatus.innerHTML = `<a href="${studentMarksheets[targetSem]}" target="_blank" style="color: var(--success); font-weight: 500; text-decoration: underline;">✅ View Uploaded Marksheet</a>`;
      } else {
        uploadStatus.innerHTML = `<span style="color: var(--text-muted);">No marksheet uploaded.</span>`;
      }
      if (uploadInput) uploadInput.value = ''; // reset input
    }
  }
}

function renderSubjectGradeTable() {
  const tableBody = document.getElementById('student-grade-tbody');
  if (!tableBody) return;

  if (assignedSubjects.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No subjects have been configured by the Admin for ${currentStudent.department} (${currentStudent.year}, ${currentStudent.semester}) yet.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = assignedSubjects.map(sub => {
    const selectedGrade = studentGrades[sub.id] || '';
    const pointsEarned = selectedGrade ? (sub.credits * (GradePointMap[selectedGrade] || 0)) : 0;

    return `
      <tr>
        <td><strong>${sub.code}</strong></td>
        <td>${sub.name}</td>
        <td><span class="badge badge-primary">${sub.credits} Credits</span></td>
        <td>
          <select class="select-control grade-select" data-subject-id="${sub.id}" onchange="handleGradeChange('${sub.id}', this.value)">
            <option value="">Select Grade</option>
            <option value="O" ${selectedGrade === 'O' ? 'selected' : ''}>O (10 Points)</option>
            <option value="A+" ${selectedGrade === 'A+' ? 'selected' : ''}>A+ (9 Points)</option>
            <option value="A" ${selectedGrade === 'A' ? 'selected' : ''}>A (8 Points)</option>
            <option value="B+" ${selectedGrade === 'B+' ? 'selected' : ''}>B+ (7 Points)</option>
            <option value="B" ${selectedGrade === 'B' ? 'selected' : ''}>B (6 Points)</option>
            <option value="C" ${selectedGrade === 'C' ? 'selected' : ''}>C (5 Points)</option>
            <option value="RA" ${selectedGrade === 'RA' ? 'selected' : ''}>RA (0 Points)</option>
            <option value="Absent" ${selectedGrade === 'Absent' ? 'selected' : ''}>Absent (0 Points)</option>
          </select>
        </td>
        <td><strong id="points-${sub.id}">${pointsEarned}</strong></td>
      </tr>
    `;
  }).join('');
}

function handleGradeChange(subjectId, gradeValue) {
  if (gradeValue) {
    studentGrades[subjectId] = gradeValue;
  } else {
    delete studentGrades[subjectId];
  }

  // Update inline row points earned
  const subject = assignedSubjects.find(s => s.id === subjectId);
  if (subject) {
    const pointsCell = document.getElementById(`points-${subjectId}`);
    if (pointsCell) {
      const points = gradeValue ? (subject.credits * (GradePointMap[gradeValue] || 0)) : 0;
      pointsCell.textContent = points;
    }
  }

  // Auto calculate CGPA metric counters
  calculateCGPA();
}

function calculateCGPA() {
  let totalCredits = 0;
  let totalPoints = 0;
  let completedSubs = 0;

  assignedSubjects.forEach(sub => {
    const grade = studentGrades[sub.id];
    if (grade) {
      completedSubs++;
      const point = GradePointMap[grade] !== undefined ? GradePointMap[grade] : 0;
      totalCredits += sub.credits;
      totalPoints += sub.credits * point;
    }
  });

  const cgpaValue = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  // Display Stat Counters
  const cgpaDisplay = document.getElementById('stat-final-cgpa');
  const creditsDisplay = document.getElementById('stat-total-credits');
  const pointsDisplay = document.getElementById('stat-total-points');
  const subsDisplay = document.getElementById('stat-completed-subs');

  if (cgpaDisplay) cgpaDisplay.textContent = cgpaValue;
  if (creditsDisplay) creditsDisplay.textContent = totalCredits;
  if (pointsDisplay) pointsDisplay.textContent = totalPoints;
  if (subsDisplay) subsDisplay.textContent = `${completedSubs} / ${assignedSubjects.length}`;
}

function saveGradesToStorage() {
  if (assignedSubjects.length === 0) {
    showToast('No subjects available to save.', 'warning');
    return;
  }

  const allGrades = DB.get(StorageKeys.GRADES) || {};
  allGrades[currentStudent.id] = studentGrades;
  DB.set(StorageKeys.GRADES, allGrades);

  showToast('Grades and CGPA calculations saved successfully!', 'success');
}

function resetGrades() {
  if (confirm('Are you sure you want to reset all grades for this semester?')) {
    studentGrades = {};
    const allGrades = DB.get(StorageKeys.GRADES) || {};
    delete allGrades[currentStudent.id];
    DB.set(StorageKeys.GRADES, allGrades);

    renderSubjectGradeTable();
    calculateCGPA();
    showToast('Grades reset successfully.', 'info');
  }
}

async function handleMarksheetUpload(e) {
  const fileInput = e.target;
  const semSelector = document.getElementById('student-sem-selector');
  const targetSem = semSelector ? semSelector.value : currentStudent.semester;
  const uploadStatus = document.getElementById('marksheet-upload-status');

  if (targetSem === 'ALL') {
    if (typeof showToast === 'function') showToast('Cannot upload marksheet for All Semesters. Please select a specific semester.', 'warning');
    return;
  }

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    return;
  }

  const file = fileInput.files[0];

  // Validate PDF
  if (file.type !== 'application/pdf') {
    if (typeof showToast === 'function') showToast('Only PDF files are allowed.', 'warning');
    fileInput.value = '';
    return;
  }

  // Validate Size (1MB = 1048576 bytes)
  if (file.size > 1048576) {
    if (typeof showToast === 'function') showToast('File size must be 1MB or less.', 'warning');
    fileInput.value = '';
    return;
  }
  
  if (uploadStatus) uploadStatus.innerHTML = `<span style="color: var(--primary);">Uploading...</span>`;

  try {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('Supabase client not initialized.');

    const fileName = `${currentStudent.id}_${targetSem.replace(/\s+/g, '')}_${Date.now()}.pdf`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('marksheets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from('marksheets')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Save URL to DB
    const allMarksheets = DB.get(StorageKeys.MARKSHEETS) || {};
    if (!allMarksheets[currentStudent.id]) {
      allMarksheets[currentStudent.id] = {};
    }
    allMarksheets[currentStudent.id][targetSem] = publicUrl;
    DB.set(StorageKeys.MARKSHEETS, allMarksheets);
    
    if (typeof showToast === 'function') showToast('Marksheet uploaded successfully!', 'success');
    
    if (uploadStatus) {
      uploadStatus.innerHTML = `<a href="${publicUrl}" target="_blank" style="color: var(--success); font-weight: 500; text-decoration: underline;">✅ View Uploaded Marksheet</a>`;
    }
  } catch (err) {
    console.error('Upload Error:', err);
    if (typeof showToast === 'function') showToast('Upload failed: ' + err.message, 'error');
    if (uploadStatus) uploadStatus.innerHTML = `<span style="color: var(--danger);">Upload failed.</span>`;
  }

  fileInput.value = ''; // Reset input
}
