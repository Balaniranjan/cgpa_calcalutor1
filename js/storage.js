/**
 * Department CGPA Calculator - Local Storage Database Manager
 * Handles data persistence, seed initialization, CRUD operations & grade mappings.
 */

const StorageKeys = {
  ADMIN: 'cgpa_admin',
  DEPARTMENTS: 'cgpa_departments',
  YEARS: 'cgpa_years',
  SEMESTERS: 'cgpa_semesters',
  SUBJECTS: 'cgpa_subjects',
  STUDENTS: 'cgpa_students',
  GRADES: 'cgpa_grades',
  ACTIVE_SESSION: 'cgpa_active_session',
  THEME: 'cgpa_theme'
};

// Grade Point Reference Map
const GradePointMap = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'RA': 0,
  'Absent': 0
};

// Supabase Cloud Storage Sync Helpers
async function syncFromSupabase() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('cgpa_app_data')
      .select('*');
    
    if (!error && data && data.length > 0) {
      data.forEach(item => {
        if (item.key_name && item.payload) {
          localStorage.setItem(item.key_name, JSON.stringify(item.payload));
        }
      });
      console.log('Cross-device data synced from Supabase cloud.');
    }
  } catch (err) {
    console.warn('Supabase cloud sync notice:', err.message || err);
  }
}

async function syncToSupabase(key, data) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  if (key === StorageKeys.ACTIVE_SESSION || key === StorageKeys.THEME) return;
  try {
    await supabaseClient
      .from('cgpa_app_data')
      .upsert({ key_name: key, payload: data }, { onConflict: 'key_name' });
  } catch (err) {
    console.warn('Supabase push notice:', err.message || err);
  }
}

async function syncRemoveFromSupabase(key) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  try {
    await supabaseClient
      .from('cgpa_app_data')
      .delete()
      .eq('key_name', key);
  } catch (err) {
    console.warn('Supabase delete notice:', err.message || err);
  }
}

// Helper methods to read/write JSON data safely with Supabase Cloud Sync
const DB = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Error reading key ${key} from LocalStorage:`, e);
      return null;
    }
  },

  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      syncToSupabase(key, data);
      return true;
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
      return false;
    }
  },

  setLocalOnly(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
    syncRemoveFromSupabase(key);
  }
};

/**
 * Initializes standard default seed data into Local Storage & Supabase if not present.
 */
function initSeedData() {
  // 1. Admin Account - Auto-sync if credentials in code are updated
  const codeAdmin = {
    id: 'ADMIN01',
    username: 'admin',
    password: 'cybersecurity@007',
    name: 'System Administrator',
    email: 'admin@university.edu'
  };

  const storedAdmin = DB.get(StorageKeys.ADMIN);
  if (!storedAdmin || storedAdmin.password !== codeAdmin.password || storedAdmin.username !== codeAdmin.username) {
    DB.setLocalOnly(StorageKeys.ADMIN, codeAdmin);
  }

  // 2. Departments
  if (!DB.get(StorageKeys.DEPARTMENTS)) {
    DB.setLocalOnly(StorageKeys.DEPARTMENTS, [
      { id: 'DEP01', name: 'Computer Science & Engineering', code: 'CSE' },
      { id: 'DEP02', name: 'Information Technology', code: 'IT' },
      { id: 'DEP03', name: 'Electronics & Communication', code: 'ECE' },
      { id: 'DEP04', name: 'Electrical & Electronics', code: 'EEE' },
      { id: 'DEP05', name: 'Mechanical Engineering', code: 'MECH' }
    ]);
  }

  // 3. Academic Years
  if (!DB.get(StorageKeys.YEARS)) {
    DB.setLocalOnly(StorageKeys.YEARS, [
      { id: 'YR01', name: '1st Year' },
      { id: 'YR02', name: '2nd Year' },
      { id: 'YR03', name: '3rd Year' },
      { id: 'YR04', name: '4th Year' }
    ]);
  }

  // 4. Semesters
  if (!DB.get(StorageKeys.SEMESTERS)) {
    DB.setLocalOnly(StorageKeys.SEMESTERS, [
      { id: 'SEM01', name: 'Semester 1' },
      { id: 'SEM02', name: 'Semester 2' },
      { id: 'SEM03', name: 'Semester 3' },
      { id: 'SEM04', name: 'Semester 4' },
      { id: 'SEM05', name: 'Semester 5' },
      { id: 'SEM06', name: 'Semester 6' },
      { id: 'SEM07', name: 'Semester 7' },
      { id: 'SEM08', name: 'Semester 8' }
    ]);
  }

  // 5. Subjects Seed
  if (!DB.get(StorageKeys.SUBJECTS)) {
    DB.setLocalOnly(StorageKeys.SUBJECTS, [
      // CSE 1st Year (Sem 1)
      { id: 'SUB001', code: 'HS8151', name: 'Communicative English', credits: 4, department: 'CSE', year: '1st Year', semester: 'Semester 1' },
      { id: 'SUB002', code: 'MA8151', name: 'Engineering Mathematics I', credits: 4, department: 'CSE', year: '1st Year', semester: 'Semester 1' },
      { id: 'SUB003', code: 'PH8151', name: 'Engineering Physics', credits: 3, department: 'CSE', year: '1st Year', semester: 'Semester 1' },

      // CSE 1st Year (Sem 2)
      { id: 'SUB004', code: 'MA8251', name: 'Engineering Mathematics II', credits: 4, department: 'CSE', year: '1st Year', semester: 'Semester 2' },
      { id: 'SUB005', code: 'CS8251', name: 'Programming in C', credits: 3, department: 'CSE', year: '1st Year', semester: 'Semester 2' },

      // CSE 2nd Year (Sem 3)
      { id: 'SUB006', code: 'CS8351', name: 'Data Structures', credits: 4, department: 'CSE', year: '2nd Year', semester: 'Semester 3' },
      { id: 'SUB007', code: 'CS8392', name: 'Object Oriented Programming', credits: 3, department: 'CSE', year: '2nd Year', semester: 'Semester 3' },

      // CSE 2nd Year (Sem 4)
      { id: 'SUB008', code: 'CS8451', name: 'Design and Analysis of Algorithms', credits: 3, department: 'CSE', year: '2nd Year', semester: 'Semester 4' },
      { id: 'SUB009', code: 'CS8492', name: 'Database Management Systems', credits: 3, department: 'CSE', year: '2nd Year', semester: 'Semester 4' },

      // CSE 3rd Year (Sem 5)
      { id: 'SUB101', code: 'CS8591', name: 'Computer Networks', credits: 4, department: 'CSE', year: '3rd Year', semester: 'Semester 5' },
      { id: 'SUB102', code: 'CS8501', name: 'Theory of Computation', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 5' },
      { id: 'SUB103', code: 'CS8592', name: 'Object Oriented Analysis & Design', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 5' },
      { id: 'SUB104', code: 'EC8691', name: 'Microprocessors and Microcontrollers', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 5' },
      { id: 'SUB105', code: 'CS8581', name: 'Networks Laboratory', credits: 2, department: 'CSE', year: '3rd Year', semester: 'Semester 5' },

      // CSE 3rd Year (Sem 6)
      { id: 'SUB106', code: 'CS8651', name: 'Internet Programming', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 6' },
      { id: 'SUB107', code: 'CS8691', name: 'Artificial Intelligence', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 6' },
      { id: 'SUB108', code: 'CS8601', name: 'Mobile Computing', credits: 3, department: 'CSE', year: '3rd Year', semester: 'Semester 6' },

      // IT 2nd Year (Sem 3)
      { id: 'SUB201', code: 'IT8301', name: 'Data Structures and Algorithms', credits: 4, department: 'IT', year: '2nd Year', semester: 'Semester 3' },
      { id: 'SUB202', code: 'IT8302', name: 'Digital Principles & System Design', credits: 3, department: 'IT', year: '2nd Year', semester: 'Semester 3' },
      
      // ECE 2nd Year (Sem 4)
      { id: 'SUB301', code: 'EC8451', name: 'Electromagnetic Fields', credits: 4, department: 'ECE', year: '2nd Year', semester: 'Semester 4' },
      { id: 'SUB302', code: 'EC8452', name: 'Linear Integrated Circuits', credits: 3, department: 'ECE', year: '2nd Year', semester: 'Semester 4' }
    ]);
  }

  // 6. Students Seed
  if (!DB.get(StorageKeys.STUDENTS)) {
    DB.setLocalOnly(StorageKeys.STUDENTS, [
      {
        id: 'STU001',
        registerNumber: '312221104001',
        name: 'Alex Johnson',
        department: 'CSE',
        year: '3rd Year',
        semester: 'Semester 5',
        username: 'alex',
        password: 'student123'
      },
      {
        id: 'STU002',
        registerNumber: '312221104002',
        name: 'Sophia Williams',
        department: 'CSE',
        year: '3rd Year',
        semester: 'Semester 5',
        username: 'sophia',
        password: 'student123'
      },
      {
        id: 'STU003',
        registerNumber: '312221205001',
        name: 'Ethan Smith',
        department: 'IT',
        year: '2nd Year',
        semester: 'Semester 3',
        username: 'ethan',
        password: 'student123'
      }
    ]);
  }

  // 7. Initial Student Sample Grades
  if (!DB.get(StorageKeys.GRADES)) {
    DB.setLocalOnly(StorageKeys.GRADES, {
      'STU001': {
        // Sem 1
        'SUB001': 'O',
        'SUB002': 'A+',
        'SUB003': 'A',
        // Sem 2
        'SUB004': 'A+',
        'SUB005': 'O',
        // Sem 3
        'SUB006': 'A',
        'SUB007': 'A+',
        // Sem 4
        'SUB008': 'O',
        'SUB009': 'A+',
        // Sem 5
        'SUB101': 'O',
        'SUB102': 'A+',
        'SUB103': 'A',
        'SUB104': 'B+',
        'SUB105': 'O'
      },
      'STU002': {
        'SUB101': 'A+',
        'SUB102': 'A',
        'SUB103': 'A+',
        'SUB104': 'O',
        'SUB105': 'A+'
      }
    });
  }
}

// Execute Seed Data & Cloud Sync on Load
initSeedData();
syncFromSupabase();
