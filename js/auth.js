/**
 * Department CGPA Calculator - Authentication & Session Manager
 */

const Auth = {
  // Key for session in sessionStorage
  SESSION_KEY: 'cgpa_user_session',

  /**
   * Authenticate Admin User (Async Cloud Synced)
   */
  async loginAdmin(username, password) {
    if (typeof syncFromSupabase === 'function') {
      await syncFromSupabase();
    }
    const admin = DB.get(StorageKeys.ADMIN);
    if (!admin) return { success: false, message: 'Admin account not configured.' };

    if (admin.username === username.trim() && admin.password === password) {
      const session = {
        role: 'admin',
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    return { success: false, message: 'Invalid Admin Credentials.' };
  },

  /**
   * Authenticate Student User by Username or Register Number (Async Cloud Synced)
   */
  async loginStudent(identifier, password) {
    if (typeof syncFromSupabase === 'function') {
      await syncFromSupabase();
    }
    const students = DB.get(StorageKeys.STUDENTS) || [];
    const target = identifier.trim().toLowerCase();

    const student = students.find(s => 
      s.username.toLowerCase() === target || s.registerNumber.toLowerCase() === target
    );

    if (!student) {
      return { success: false, message: 'Student account not found on cloud database.' };
    }

    if (student.password === password) {
      const session = {
        role: 'student',
        id: student.id,
        registerNumber: student.registerNumber,
        name: student.name,
        department: student.department,
        year: student.year,
        semester: student.semester,
        username: student.username,
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return { success: true, user: session };
    }

    return { success: false, message: 'Invalid Password.' };
  },

  /**
   * Get Active Session Payload
   */
  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Logout current active user
   */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'index.html';
  },

  /**
   * Route Guard: Ensure proper role access on protected dashboard pages
   */
  requireAuth(requiredRole) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = requiredRole === 'admin' ? 'admin-login.html' : 'student-login.html';
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
      return null;
    }
    return user;
  }
};
