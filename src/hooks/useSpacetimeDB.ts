import { useEffect, useState } from 'react';
import { ItineraryItem } from '../types';
import getSupabase from '../services/supabaseClient';

type DbItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  cost: number | null;
  estimated_duration: number | null;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string | null;
  completed: boolean | null;
  is_open: boolean | null;
  // notes column removed - not in database schema
};

const fromDb = (r: DbItem): ItineraryItem => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  category: (r.category || 'Other') as ItineraryItem['category'],
  priority: ((r.priority as ItineraryItem['priority']) || 'low') as ItineraryItem['priority'],
  cost: Number(r.cost || 0),
  estimatedDuration: Number(r.estimated_duration || 0),
  address: r.address || '',
  location: { lat: Number(r.location_lat || 0), lng: Number(r.location_lng || 0) },
  notes: '', // Default empty string since notes column doesn't exist in DB
  isOpen: Boolean(r.is_open),
  createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  completed: Boolean(r.completed)
});

const toDb = (i: ItineraryItem): DbItem => {
  // Validate required fields before conversion
  if (!i.id || !i.title || !i.description) {
    throw new Error(`Invalid item data: missing required fields - id: ${!!i.id}, title: ${!!i.title}, description: ${!!i.description}`);
  }
  
  if (!i.location || typeof i.location.lat !== 'number' || typeof i.location.lng !== 'number') {
    throw new Error(`Invalid item data: invalid location - ${JSON.stringify(i.location)}`);
  }
  
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    priority: i.priority,
    cost: i.cost,
    estimated_duration: i.estimatedDuration,
    address: i.address,
    location_lat: i.location.lat,
    location_lng: i.location.lng,
    created_at: i.createdAt.toISOString(),
    completed: i.completed,
    is_open: i.isOpen
    // notes field removed - not in database schema
    // openingHours field not stored in database
  };
};

export function useSpacetimeDB() {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initial fetch
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data || []).map(fromDb));
      } catch (e) {
        console.error('Supabase fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const addItem = async (item: ItineraryItem): Promise<void> => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.from('items').insert([toDb(item)]);
      if (error) throw error;
      setItems(prev => [item, ...prev]);
    } catch (e) {
      console.error('Supabase insert failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const addItems = async (newItems: ItineraryItem[]): Promise<void> => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      
      // Convert items to database format and log for debugging
      const dbItems = newItems.map(toDb);
      console.log('Attempting to insert items:', dbItems.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        priority: item.priority
      })));
      
      const { error } = await supabase.from('items').insert(dbItems);
      if (error) {
        console.error('Supabase bulk insert error details:', error);
        throw error;
      }
      
      console.log(`Successfully inserted ${newItems.length} items`);
      setItems(prev => [...newItems, ...prev]);
    } catch (e) {
      console.error('Supabase bulk insert failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<ItineraryItem>): Promise<void> => {
    setLoading(true);
    try {
      const existing = items.find(i => i.id === id);
      if (!existing) return;
      const merged: ItineraryItem = { ...existing, ...updates } as ItineraryItem;
      const supabase = await getSupabase();
      const { error } = await supabase.from('items').update(toDb(merged)).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(i => (i.id === id ? merged : i)));
    } catch (e) {
      console.error('Supabase update failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error('Supabase delete failed:', e);
      throw e;
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
        Math.pow(item.location.lat - lat, 2) + Math.pow(item.location.lng - lng, 2)
      ) * 69;
      return distance <= radiusMiles;
    });
  };

  return {
    items,
    loading,
    addItem,
    addItems,
    updateItem,
    deleteItem,
    getItemsByCategory,
    getItemsByPriority,
    getNearbyItems
  };
}
