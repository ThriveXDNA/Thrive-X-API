import React, { useState, useEffect } from 'react';

// API Client Component
export const ThriveXClient = ({ 
  apiKey, 
  userId, 
  className = '',
  theme = 'light'
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchFood = async (query) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/food/search?query=${query}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Id': userId
        }
      });
      const data = await response.json();
      setSearchResults(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`thrivex-container ${className} ${theme}`}>
      <SearchBar onSearch={searchFood} />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      <ResultsList results={searchResults} />
    </div>
  );
};

// Searchbar Component
const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods..."
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Search
      </button>
    </form>
  );
};

// Results List Component
const ResultsList = ({ results }) => (
  <div className="mt-6 space-y-4">
    {results.map((result) => (
      <FoodCard key={result.id} food={result} />
    ))}
  </div>
);

// Food Card Component
const FoodCard = ({ food }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{food.name}</h3>
          <p className="text-sm text-gray-600">
            Carnivore Score: {food.carnivore_score}/10
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-800"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4 space-y-2">
          <NutritionInfo nutrition={food.nutrition} />
          <PreparationGuide guidelines={food.preparation} />
          <CarnivoreAnalysis analysis={food.carnivore_analysis} />
        </div>
      )}
    </div>
  );
};

// Usage Example:
/*
import { ThriveXClient } from '@thrivex/ui';

function App() {
  return (
    <ThriveXClient
      apiKey="your-api-key"
      userId="user-id"
      theme="dark"
    />
  );
}
*/

export default ThriveXClient;