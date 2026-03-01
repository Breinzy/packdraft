'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { League, Profile, Contest } from '@/types';

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
          { label: 'ACTION', value: 'SIGN UP TO PLAY', color: '#9fc0e6' },
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

      const { data: contest } = await supabase
        .from('contests')
        .select('*')
        .eq('id', league.contest_id)
        .single<Contest>();

      const tickerItems: TickerItem[] = [
        { label: 'LEAGUE', value: league.name.toUpperCase(), color: '#9fc0e6' },
        { label: 'PLAYERS', value: `${league.player_count} / ${league.max_players}`, color: '#60a5fa' },
        {
          label: 'STATUS',
          value: contest?.status === 'registration'
            ? 'REGISTRATION'
            : league.all_locked_at
            ? 'ALL LOCKED'
            : 'DRAFTING',
          color: contest?.status === 'registration'
            ? '#9fc0e6'
            : league.all_locked_at
            ? '#34d399'
            : '#fbbf24',
        },
      ];

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
          value: `${product.name} +${hotPick.change_7d}%`,
          color: '#34d399',
        });
      }

      setItems(tickerItems);
    }
    load();
  }, [supabase]);

  if (items.length === 0) return null;

  return (
    <div className="bg-accent/[0.06] border-b border-accent/[0.12] px-4 md:px-16 py-2 md:py-2.5 flex gap-4 md:gap-10 overflow-x-auto text-xs md:text-sm tracking-wider">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1.5 md:gap-2 whitespace-nowrap items-center">
          <span className="text-slate-600">{item.label}</span>
          <span style={{ color: item.color }} className="font-semibold">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
