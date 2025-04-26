const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Validate API key
router.post('/validate', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    console.error('No API key provided for /auth/validate');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('Validating API key:', apiKey);

  const { data, error } = await supabase
    .from('users')
    .select('plan, role, email, email_verified, requestsRemaining')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found for /auth/validate:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Return user profile
  res.json({ 
    plan: data.plan || 'essential', 
    role: data.role || 'user',
    email: data.email,
    email_verified: data.email_verified,
    requestsRemaining: data.requestsRemaining
  });
});

// Check email verification
router.post('/check-email-verified', async (req, res) => {
  const { email } = req.body;
  const apiKey = req.headers['x-api-key'];
  
  console.log('Reached /check-email-verified with email:', email);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('email', email)
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      console.error('Supabase error or no user found:', error);
      return res.status(400).json({ error: 'User not found' });
    }

    res.status(200).json({ verified: data.email_verified });
  } catch (err) {
    console.error('Error in /check-email-verified:', err.message);
    res.status(500).json({ error: 'Server error during verification check' });
  }
});

// Send verification code
router.post('/send-verification-code', async (req, res) => {
  const { email } = req.body;
  console.log('Reached /send-verification-code with email:', email);
  
  try {
    // Check for rate limiting of codes (max 3 within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingCodes, error: countError } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('email', email)
      .gte('created_at', fifteenMinutesAgo);

    if (countError) {
      console.error('Error checking existing codes:', countError);
      return res.status(500).json({ error: 'Failed to check rate limits' });
    }

    if (existingCodes && existingCodes.length >= 3) {
      console.error('Rate limit exceeded for email:', email);
      return res.status(429).json({ error: 'Too many verification attempts. Please try again in 15 minutes.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase
      .from('verification_codes')
      .insert({ email, code, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store verification code' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thrive-X Fitness Verification Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nBest,\nThrive-X Team`
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification code sent to:', email);

    res.status(200).json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Error in /send-verification-code:', err.message);
    res.status(500).json({ error: 'Server error during code sending' });
  }
});

// Verify code
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  console.log('Reached /verify-code with email:', email, 'code:', code);

  try {
    const { data, error } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('email', email)
      .eq('code', code)
      .single();

    if (error || !data) {
      console.error('Invalid or expired code:', error);
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (new Date(data.expires_at) < new Date()) {
      console.error('Code expired for email:', email);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', email);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email);

    console.log('Email verified for:', email);
    res.status(200).json({ message: 'Email verified' });
  } catch (err) {
    console.error('Error in /verify-code:', err.message);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// Resend verification code endpoint
router.post('/resend-verification-code', async (req, res) => {
  const { email, apiKey } = req.body;
  console.log('Reached /resend-verification-code with email:', email);
  
  if (!email || !apiKey) {
    return res.status(400).json({ error: 'Email and API key are required' });
  }

  try {
    // Verify the API key
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, email_verified')
      .eq('api_key', apiKey)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check for rate limiting of codes (max 3 within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingCodes, error: countError } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('email', email)
      .gte('created_at', fifteenMinutesAgo);

    if (countError) {
      console.error('Error checking existing codes:', countError);
      return res.status(500).json({ error: 'Failed to check rate limits' });
    }

    if (existingCodes && existingCodes.length >= 3) {
      console.error('Rate limit exceeded for email:', email);
      return res.status(429).json({ error: 'Too many verification attempts. Please try again in 15 minutes.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase
      .from('verification_codes')
      .insert({ email, code, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store verification code' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thrive-X Fitness Verification Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nBest,\nThrive-X Team`
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification code sent to:', email);

    res.status(200).json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Error in /resend-verification-code:', err.message);
    res.status(500).json({ error: 'Server error during code sending' });
  }
});

module.exports = router;