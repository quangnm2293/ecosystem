import {
  mapWatchlist,
  mapWatchlistItem,
} from '@/lib/trend-intelligence/domain/mappers';
import type {
  Watchlist,
  WatchlistItem,
  WatchlistItemRow,
  WatchlistRow,
} from '@/lib/trend-intelligence/domain/types';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export const watchlistRepository = {
  async getOrCreateForUser(userId: string): Promise<Watchlist> {
    const { data: existing, error: findError } = await getTiktokDb()
      .from('watchlists')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return mapWatchlist(existing as WatchlistRow);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await getTiktokDb()
      .from('watchlists')
      .insert({ id, user_id: userId, created_at: now, updated_at: now })
      .select('*')
      .single();

    if (error) throw error;
    return mapWatchlist(data as WatchlistRow);
  },

  async listItems(watchlistId: string): Promise<WatchlistItem[]> {
    const { data, error } = await getTiktokDb()
      .from('watchlist_items')
      .select('*')
      .eq('watchlist_id', watchlistId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return (data as WatchlistItemRow[]).map(mapWatchlistItem);
  },

  async addItem(input: {
    watchlistId: string;
    productId: string;
    notes?: string;
  }): Promise<WatchlistItem> {
    const { data: existing } = await getTiktokDb()
      .from('watchlist_items')
      .select('*')
      .eq('watchlist_id', input.watchlistId)
      .eq('product_id', input.productId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await getTiktokDb()
        .from('watchlist_items')
        .update({ notes: input.notes ?? (existing as WatchlistItemRow).notes })
        .eq('id', (existing as WatchlistItemRow).id)
        .select('*')
        .single();
      if (error) throw error;
      return mapWatchlistItem(data as WatchlistItemRow);
    }

    const { data, error } = await getTiktokDb()
      .from('watchlist_items')
      .insert({
        id: crypto.randomUUID(),
        watchlist_id: input.watchlistId,
        product_id: input.productId,
        notes: input.notes ?? null,
        added_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapWatchlistItem(data as WatchlistItemRow);
  },

  async removeItem(watchlistId: string, productId: string): Promise<void> {
    const { error } = await getTiktokDb()
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('product_id', productId);

    if (error) throw error;
  },
};
