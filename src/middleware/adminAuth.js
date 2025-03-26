// src/middleware/adminAuth.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const adminAuth = async (req, res, next) => {
  try {
    // Check for auth token in cookies
    const token = req.cookies.supabase_auth_token;
    
    if (!token) {
      return res.redirect('/admin-login');
    }
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.redirect('/admin-login');
    }
    
    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!roles || roles.role !== 'admin') {
      return res.status(403).redirect('/admin-login');
    }
    
    // If all checks pass, attach user to request and proceed
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.redirect('/admin-login');
  }
};