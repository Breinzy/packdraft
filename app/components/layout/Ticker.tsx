'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { League, Profile } from '@/types';

interface TickerItem {
  label: string;
  value: string;
  color: string;
}

export default function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([
          { label: 'STATUS', value: 'NOT SIGNED IN', color: '#94a3b8' },
          { label: 'ACTION', value: 'SIGN UP TO PLAY', color: '#a78bfa' },
        ]);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>();

      if (!profile?.current_league_id) {
        setItems([{ label: 'STATUS', value: 'NO ACTIVE LEAGUE', color: '#94a3b8' }]);
        return;
      }

      const { data: league } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', profile.current_league_id)
        .single<League>();

      if (!league) return;

      const tickerItems: TickerItem[] = [
        { label: 'LEAGUE', value: league.name.toUpperCase(), color: '#a78bfa' },
        { label: 'PLAYERS', value: `${league.player_count} / 20`, color: '#60a5fa' },
        {
          label: 'LOCK STATUS',
          value: league.all_locked_at ? 'ALL LOCKED' : 'DRAFTING',
          color: league.all_locked_at ? '#34d399' : '#fbbf24',
        },
      ];

      // Fetch hot pick — product with best 7d change
      const { data: hotPick } = await supabase
        .from('price_snapshots')
        .select('change_7d, product_id, products(name, image_code)')
        .order('change_7d', { ascending: false })
        .limit(1)
        .single();

      if (hotPick && hotPick.products) {
        const product = hotPick.products as unknown as { name: string; image_code: string };
        tickerItems.push({
          label: 'HOT PICK',
          value: `${product.image_code} +${hotPick.change_7d}%`,
          color: '#34d399',
        });
      }

      setItems(tickerItems);
    }
    load();
  }, [supabase]);

  if (items.length === 0) return null;

  return (
    <div className="bg-accent/[0.08] border-b border-accent/[0.15] px-6 py-1.5 flex gap-8 overflow-x-auto text-[10px] tracking-wider">
      {items.map((item) => (
        <div key={item.label} className="flex gap-2 whitespace-nowrap items-center">
          <span className="text-slate-600">{item.label}</span>
          <span style={{ color: item.color }} className="font-semibold">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
