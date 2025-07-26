'use client';

import { useState, useEffect } from 'react';
import { useBatchPythPrices, useTokenMetadata } from '../../components/pyth/pyth-data-access';
import { priceFeedIds as priceFeedIdsLocal } from '../../lib/constants';

// Helper function to remove 0x prefix from a price feed ID
function stripHexPrefix(id: string): string {
  return id.startsWith('0x') ? id.slice(2) : id;
}

export default function PythTestPage() {
  const tokenMetadata = useTokenMetadata();
  const [priceFeedIds, setPriceFeedIds] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Set up price feed IDs when metadata loads
  useEffect(() => {
    // Use price feed IDs directly from constants
    const feedIds = Object.values(priceFeedIdsLocal);
    setPriceFeedIds(feedIds);
    setTestResults([`Using ${feedIds.length} price feeds to test: ${feedIds.map(id => id.substring(0, 8) + '...').join(', ')}`]);
  }, []);
  
  // Fetch batch prices
  const pythPrices = useBatchPythPrices(priceFeedIds);
  
  // Log results when prices update
  useEffect(() => {
    if (pythPrices.data) {
      const results = Object.entries(pythPrices.data).map(([id, data]) => {
        return `Feed ${id.substring(0, 8)}...: Price = $${data.price.toFixed(4)}, Updated at ${new Date(data.timestamp * 1000).toLocaleString()}`;
      });
      
      setTestResults(prev => [...prev, `Successfully fetched ${results.length} prices:`, ...results]);
    }
  }, [pythPrices.data]);
  
  // Test single price feed metadata endpoint
  const testPriceFeedMetadata = async () => {
    if (!priceFeedIds.length) return;
    
    setIsLoading(true);
    setTestResults(prev => [...prev, 'Testing price feed metadata endpoint...']);
    
    try {
      const cleanId = stripHexPrefix(priceFeedIds[0]);
      const response = await fetch(`https://hermes.pyth.network/v2/price_feeds?query=${cleanId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResults(prev => [
        ...prev, 
        'Price feed metadata test succeeded:', 
        `Received ${data.length} price feeds`,
        JSON.stringify(data[0], null, 2).substring(0, 200) + '...'
      ]);
    } catch (error) {
      setTestResults(prev => [...prev, `Price feed metadata test failed: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test latest price update endpoint (single feed)
  const testSingleEndpoint = async () => {
    if (!priceFeedIds.length) return;
    
    setIsLoading(true);
    setTestResults(prev => [...prev, 'Testing single price update endpoint...']);
    
    try {
      const cleanId = stripHexPrefix(priceFeedIds[0]);
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${cleanId}&encoding=hex&parsed=true`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResults(prev => [
        ...prev, 
        'Single price update endpoint test succeeded:',
        `Received data with format: ${Object.keys(data).join(', ')}`,
        `Parsed data length: ${data.parsed?.length || 0}`,
        data.parsed && data.parsed.length > 0 
          ? `First price: ${JSON.stringify(data.parsed[0].price, null, 2)}`
          : 'No parsed data available'
      ]);
    } catch (error) {
      setTestResults(prev => [...prev, `Single price update endpoint test failed: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test batch price updates endpoint
  const testBatchEndpoint = async () => {
    if (!priceFeedIds.length) return;
    
    setIsLoading(true);
    setTestResults(prev => [...prev, 'Testing batch price updates endpoint...']);
    
    try {
      const cleanIds = priceFeedIds.map(id => stripHexPrefix(id));
      const queryParams = cleanIds.map(id => `ids[]=${id}`).join('&') + '&encoding=hex&parsed=true';
      const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResults(prev => [
        ...prev, 
        'Batch price updates endpoint test succeeded:',
        `Received ${data.parsed?.length || 0} price updates`,
        data.parsed && data.parsed.length > 0 
          ? `First price ID: ${data.parsed[0].id}, Price: ${data.parsed[0].price.price}, Exponent: ${data.parsed[0].price.expo}`
          : 'No parsed data available'
      ]);
    } catch (error) {
      setTestResults(prev => [...prev, `Batch price updates endpoint test failed: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Pyth Network API Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Testing Pyth Price Feeds</h2>
        {priceFeedIds.length === 0 ? (
          <p>No price feeds available for testing</p>
        ) : (
          <div>
            <p className="mb-2">Using {priceFeedIds.length} price feeds for testing</p>
            <ul className="mb-4 list-disc pl-5">
              {priceFeedIds.map((id, index) => (
                <li key={index}>
                  {id.substring(0, 8)}... (without 0x: {stripHexPrefix(id).substring(0, 8)}...)
                </li>
              ))}
            </ul>
            
            <div className="flex flex-wrap gap-4 mt-4">
              <button 
                onClick={testPriceFeedMetadata}
                disabled={isLoading || !priceFeedIds.length}
                className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
              >
                Test Price Feed Metadata
              </button>
              
              <button 
                onClick={testSingleEndpoint}
                disabled={isLoading || !priceFeedIds.length}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Test Single Price Update
              </button>
              
              <button 
                onClick={testBatchEndpoint}
                disabled={isLoading || !priceFeedIds.length}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                Test Batch Price Updates
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))}
          
          {isLoading && <div className="animate-pulse">Loading...</div>}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Price Data</h2>
        {pythPrices.isLoading ? (
          <p>Loading price data...</p>
        ) : pythPrices.isError ? (
          <p className="text-red-500">Error loading price data</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(pythPrices.data || {}).map(([id, data]) => {
              // Find the token that corresponds to this price feed ID
              const tokenSymbol = Object.entries(priceFeedIdsLocal).find(([symbol, feedId]) => feedId === id)?.[0] || 'Unknown';
              
              return (
                <div key={id} className="border rounded p-4">
                  <div className="font-semibold">{tokenSymbol}</div>
                  <div className="text-xs text-gray-500 mb-2">{id.substring(0, 8)}...</div>
                  <div className="text-2xl">${data.price.toFixed(4)}</div>
                  <div className="text-sm text-gray-500">
                    Confidence: ±${data.confidence.toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Updated: {new Date(data.timestamp * 1000).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
