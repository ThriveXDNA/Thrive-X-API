// admin.js - Complete file with admin token authentication
document.addEventListener('DOMContentLoaded', function() {
    // Admin token - You will need to update this manually for security reasons
    // NOTE: In a production environment, you would use a more secure method
    const ADMIN_TOKEN = 'your_generated_admin_secret_here'; // Replace with your actual admin token
    
    // Get dashboard elements
    const userCountElement = document.getElementById('user-count');
    const activeUsersElement = document.getElementById('active-users');
    const reviewCountElement = document.getElementById('review-count');
    const pendingReviewsElement = document.getElementById('pending-reviews');
    const tierChartCanvas = document.getElementById('tier-chart');
    const reviewTableBody = document.getElementById('review-table-body');
    
    // Load dashboard stats
    loadDashboardStats();
    loadLatestReviews();
    
    // Set up event listeners for approve/reject buttons
    document.addEventListener('click', function(event) {
      if (event.target.classList.contains('approve-btn')) {
        const reviewId = event.target.dataset.reviewId;
        handleReviewAction(reviewId, 'approve');
      } else if (event.target.classList.contains('reject-btn')) {
        const reviewId = event.target.dataset.reviewId;
        handleReviewAction(reviewId, 'reject');
      }
    });
    
    // Function to load dashboard statistics
    function loadDashboardStats() {
      fetch('/api/v1/admin/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'admin-token': ADMIN_TOKEN
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Admin authentication failed. Check your admin token.');
        }
        return response.json();
      })
      .then(data => {
        // Update user statistics
        userCountElement.textContent = data.users.total;
        activeUsersElement.textContent = data.users.active;
        reviewCountElement.textContent = data.reviews.total;
        pendingReviewsElement.textContent = data.reviews.pending;
        
        // Create subscription tier chart
        createTierChart(data.users.tierDistribution);
      })
      .catch(error => {
        console.error('Error loading dashboard stats:', error);
        alert('Error loading dashboard: ' + error.message);
      });
    }
    
    // Function to create subscription tier chart
    function createTierChart(tierDistribution) {
      const tiers = Object.keys(tierDistribution);
      const counts = Object.values(tierDistribution);
      
      // Use Chart.js to create a pie chart
      new Chart(tierChartCanvas, {
        type: 'pie',
        data: {
          labels: tiers,
          datasets: [{
            data: counts,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          title: {
            display: true,
            text: 'Subscription Tier Distribution'
          }
        }
      });
    }
    
    // Function to load latest reviews
    function loadLatestReviews() {
      fetch('/api/v1/admin/reviews/latest', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'admin-token': ADMIN_TOKEN
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Admin authentication failed. Check your admin token.');
        }
        return response.json();
      })
      .then(data => {
        // Clear existing table rows
        reviewTableBody.innerHTML = '';
        
        // Add each review to the table
        data.reviews.forEach(review => {
          const row = document.createElement('tr');
          
          // Format date
          const date = new Date(review.created_at);
          const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          
          row.innerHTML = `
            <td>${review.id}</td>
            <td>${review.user_id}</td>
            <td>${review.product_name}</td>
            <td>${review.rating} / 5</td>
            <td>${review.review_text.substring(0, 50)}${review.review_text.length > 50 ? '...' : ''}</td>
            <td>${formattedDate}</td>
            <td>${review.review_status}</td>
            <td>
              ${review.review_status === 'pending' ? `
                <button class="approve-btn" data-review-id="${review.id}">Approve</button>
                <button class="reject-btn" data-review-id="${review.id}">Reject</button>
              ` : 'Processed'}
            </td>
          `;
          
          reviewTableBody.appendChild(row);
        });
      })
      .catch(error => {
        console.error('Error loading latest reviews:', error);
        reviewTableBody.innerHTML = `<tr><td colspan="8">Error loading reviews: ${error.message}</td></tr>`;
      });
    }
    
    // Function to handle review approval/rejection
    function handleReviewAction(reviewId, action) {
      fetch(`/api/v1/admin/reviews/${reviewId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admin-token': ADMIN_TOKEN
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to ${action} review`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Reload the reviews list
          loadLatestReviews();
          // Reload the stats to update counts
          loadDashboardStats();
          
          alert(`Review ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        }
      })
      .catch(error => {
        console.error(`Error ${action}ing review:`, error);
        alert(`Error: ${error.message}`);
      });
    }
  });