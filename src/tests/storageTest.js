import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test access to all buckets and their contents
const testStorageAccess = async () => {
  try {
    // 1. First list all buckets
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }
    console.log('Available buckets:', buckets.map(b => b.name));

    // 2. Test each specific bucket
    const bucketsToTest = ['NPI', 'FDA', 'USDA', 'Exercise', 'food_images'];
    
    for (const bucketName of bucketsToTest) {
      console.log(`\nTesting bucket: ${bucketName}`);
      
      const { data: files, error } = await supabase
        .storage
        .from(bucketName)
        .list();

      if (error) {
        console.error(`Error accessing ${bucketName}:`, error);
        continue;
      }

      console.log(`Files in ${bucketName}:`, files);
      
      // If files exist, show more details about the first file
      if (files && files.length > 0) {
        const firstFile = files[0];
        console.log(`First file in ${bucketName}:`, {
          name: firstFile.name,
          size: firstFile.metadata?.size,
          created: firstFile.created_at
        });
      } else {
        console.log(`No files found in ${bucketName}`);
      }
    }

  } catch (error) {
    console.error('General error:', error);
  }
};

// Run the test
console.log('Starting storage access test...');
testStorageAccess()
  .then(() => console.log('Test complete'))
  .catch(err => console.error('Test failed:', err));