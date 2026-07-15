/**
 * Supabase Client Initialization
 * Department CGPA Calculator Management System
 */

// Base Supabase Project URL
const SUPABASE_URL = 'https://jrfhegmqqnwxngvimbnw.supabase.co';

// Paste your Supabase Anon / Public API Key below
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZmhlZ21xcW53eG5ndmltYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzg5MjIsImV4cCI6MjA5OTY1NDkyMn0.6wd84S-ceyHkbWmWJcnnrNTTvmIsHdRBHzZf522VWzM';

// Initialize Global Supabase Client Instance
let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase initialized successfully.');
} else {
  console.warn('Supabase SDK library not loaded.');
}
