import type { MarketDataProvider } from './types';
import { PokemonPriceTrackerProvider } from './pokemon-price-tracker';

export function getMarketProvider(): MarketDataProvider {
  return new PokemonPriceTrackerProvider();
}
