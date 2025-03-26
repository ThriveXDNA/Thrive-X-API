import { supabase } from '../config/supabase.js';
import Papa from 'papaparse';

// Enhanced CSV reading with caching
let dataCache = {};

export async function readCSVFromStorage(bucketName, fileName, forceRefresh = false) {
  const cacheKey = `${bucketName}-${fileName}`;
  
  if (!forceRefresh && dataCache[cacheKey]) {
    return dataCache[cacheKey];
  }

  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .download(fileName);
    
    if (error) throw error;

    const text = await data.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          dataCache[cacheKey] = results.data;
          resolve(results.data);
        },
        error: reject
      });
    });
  } catch (error) {
    console.error(`Error reading ${fileName} from ${bucketName}:`, error);
    throw error;
  }
}

// Function to search and filter food data
export async function searchFoodData(searchTerm, filters = {}) {
  try {
    // Get data from both sources
    const usdaData = await readCSVFromStorage('USDA', 'sr_legacy_food.csv');
    const fdaData = await readCSVFromStorage('FDA', 'food_attribute.csv');

    // Search and filter function
    const filterData = (data, term, sourceType) => {
      return data.filter(item => {
        const matchesSearch = Object.values(item).some(value => 
          String(value).toLowerCase().includes(term.toLowerCase())
        );

        const matchesFilters = Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return String(item[key]).toLowerCase() === String(value).toLowerCase();
        });

        return matchesSearch && matchesFilters;
      }).map(item => ({
        ...item,
        source: sourceType
      }));
    };

    // Get filtered results from both sources
    const usdaResults = filterData(usdaData, searchTerm, 'USDA');
    const fdaResults = filterData(fdaData, searchTerm, 'FDA');

    // Combine and deduplicate results
    const combinedResults = mergeAndDedupeFoodData(usdaResults, fdaResults);

    return combinedResults;
  } catch (error) {
    console.error('Error searching food data:', error);
    throw error;
  }
}

// Function to merge and deduplicate food data
function mergeAndDedupeFoodData(usdaData, fdaData) {
  const combinedData = [...usdaData, ...fdaData];
  const seenItems = new Set();
  
  return combinedData.reduce((unique, item) => {
    // Create a unique identifier based on name and nutrients
    const identifier = item.description || item.food_name;
    
    if (!seenItems.has(identifier)) {
      seenItems.add(identifier);
      unique.push({
        name: identifier,
        sources: [item.source],
        nutritionData: item.nutrient_data || item.nutrition,
        originalData: item
      });
    } else {
      // If item exists, add the source
      const existingItem = unique.find(u => u.name === identifier);
      if (existingItem && !existingItem.sources.includes(item.source)) {
        existingItem.sources.push(item.source);
      }
    }
    return unique;
  }, []);
}

// Function to get detailed nutrition data
export async function getNutritionData(foodId, source) {
  try {
    let nutritionData;
    
    if (source === 'USDA') {
      const usdaNutrients = await readCSVFromStorage('USDA', 'nutrient.csv');
      nutritionData = usdaNutrients.filter(n => n.food_id === foodId);
    } else {
      const fdaNutrients = await readCSVFromStorage('FDA', 'food_attribute.csv');
      nutritionData = fdaNutrients.filter(n => n.food_id === foodId);
    }

    return nutritionData;
  } catch (error) {
    console.error('Error getting nutrition data:', error);
    throw error;
  }
}