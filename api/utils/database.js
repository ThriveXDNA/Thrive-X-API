// api/utils/database.js - Shared database utilities for serverless functions
const { createClient } = require('@supabase/supabase-js');

// Singleton pattern for Supabase client to enable connection reuse
let supabaseClient = null;

/**
 * Get a Supabase client instance. Reuses the existing client if one exists.
 * This is important for serverless environments to maintain connection pooling.
 * 
 * @returns {Object} Supabase client instance
 */
const getSupabaseClient = () => {
  if (!supabaseClient) {
    console.log('Creating new Supabase client');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }
  return supabaseClient;
};

module.exports = { getSupabaseClient };
