// src/api/reviewEndpoints.js
import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Submit a review
router.post('/reviews', async (req, res) => {
  try {
    const { 
      userId, 
      productId, 
      rating, 
      reviewText,
      preparationMethod,
      dietaryPractices,
      photos 
    } = req.body;

    // Check user verification status
    const { data: verification, error: verificationError } = await supabase
      .from('user_verification')
      .select('verification_status, payment_method_verified')
      .eq('user_id', userId)
      .single();

    if (verificationError || !verification?.payment_method_verified) {
      return res.status(403).json({
        success: false,
        error: 'Account verification required',
        details: 'Please verify your payment method to submit reviews'
      });
    }

    // Start a Supabase transaction
    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .insert([{
        user_id: userId,
        product_id: productId,
        rating,
        review_text: reviewText,
        preparation_method: preparationMethod,
        dietary_practices: dietaryPractices,
        purchase_verified: true,
        certification_verified: verification.verification_status === 'verified'
      }])
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Handle photo uploads if any
    if (photos && photos.length > 0) {
      const photoPromises = photos.map(async (photo) => {
        const fileName = `${review.id}/${Date.now()}-${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('review-photos')
          .upload(fileName, photo.buffer);

        if (uploadError) throw uploadError;

        return supabase
          .from('review_photos')
          .insert([{
            review_id: review.id,
            photo_url: uploadData.path
          }]);
      });

      await Promise.all(photoPromises);
    }

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get reviews for a product
router.get('/reviews/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { dietaryPractices, preparationMethod, rating, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        user:users(email, subscription_tier),
        photos:review_photos(photo_url),
        votes:review_votes(vote_type, count)
      `)
      .eq('product_id', productId)
      .eq('review_status', 'approved');

    // Apply filters
    if (dietaryPractices) {
      query = query.contains('dietary_practices', [dietaryPractices]);
    }
    if (preparationMethod) {
      query = query.contains('preparation_method', [preparationMethod]);
    }
    if (rating) {
      query = query.eq('rating', rating);
    }

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: reviews, error, count } = await query;

    if (error) throw error;

    // Get review statistics
    const { data: stats } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('review_status', 'approved');

    const averageRating = stats.reduce((acc, rev) => acc + rev.rating, 0) / stats.length;

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_reviews: count
        },
        statistics: {
          average_rating: averageRating.toFixed(1),
          rating_distribution: stats.reduce((acc, rev) => {
            acc[rev.rating] = (acc[rev.rating] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('Review fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Vote on a review
router.post('/reviews/:reviewId/vote', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, voteType } = req.body;

    const { data: existingVote } = await supabase
      .from('review_votes')
      .select()
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .eq('vote_type', voteType)
      .single();

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'Already voted'
      });
    }

    const { data: vote, error } = await supabase
      .from('review_votes')
      .insert([{
        review_id: reviewId,
        user_id: userId,
        vote_type: voteType
      }])
      .select();

    if (error) throw error;

    // Update helpful_votes count
    if (voteType === 'helpful') {
      await supabase
        .from('product_reviews')
        .update({ helpful_votes: supabase.rpc('increment') })
        .eq('id', reviewId);
    }

    res.json({
      success: true,
      data: vote
    });

  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;