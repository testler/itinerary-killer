import { useState, useEffect } from 'react';
import { ItineraryItem } from '../types';

// For now, we'll use localStorage as a fallback until Spacetime DB is fully integrated
// This can be easily replaced with actual Spacetime DB calls later

export function useSpacetimeDB() {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('itinerary-items');
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }));
        setItems(parsedItems);
      } catch (error) {
        console.error('Error loading saved items:', error);
      }
    }
  }, []);

  // Save items to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('itinerary-items', JSON.stringify(items));
  }, [items]);

  const addItem = async (item: ItineraryItem): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      setItems(prev => [...prev, item]);
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<ItineraryItem>): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getItemsByCategory = (category: string): ItineraryItem[] => {
    return items.filter(item => item.category === category);
  };

  const getItemsByPriority = (priority: ItineraryItem['priority']): ItineraryItem[] => {
    return items.filter(item => item.priority === priority);
  };

  const getNearbyItems = (lat: number, lng: number, radiusMiles: number = 10): ItineraryItem[] => {
    return items.filter(item => {
      const distance = Math.sqrt(
        Math.pow(item.location.lat - lat, 2) + 
        Math.pow(item.location.lng - lng, 2)
      ) * 69; // Rough conversion to miles
      return distance <= radiusMiles;
    });
  };

  // TODO: Replace with actual Spacetime DB integration
  // const spacetimeClient = new SpacetimeClient({
  //   url: process.env.REACT_APP_SPACETIME_URL,
  //   token: process.env.REACT_APP_SPACETIME_TOKEN
  // });

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    getItemsByCategory,
    getItemsByPriority,
    getNearbyItems,
  };
}
