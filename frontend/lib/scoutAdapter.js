// Backend → frontend field-name bridge for POST /scout/lookup.
//
// Backend returns Amazon-domain names (current_price, bsr, fba_score,
// total_sellers, reviews); frontend display reads legacy alias names
// (price, bsr_rank, score, number_of_sellers, ratings_count). This
// adapter is the SINGLE acceptable bridge — do not add the snake_case
// names to the display block in scout.js, and do not add the alias
// names to the backend response. See CLAUDE.md §8.
//
// Fields that already match on both sides (asin, title, brand,
// category, rating, monthly_sales) pass through untouched via the
// spread. ?? (nullish coalescing) is preferred over || so a legitimate
// 0 or "" from the backend isn't silently swapped for an alias value.
export function adaptScoutResult(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    price: raw.current_price ?? raw.price,
    bsr_rank: raw.bsr ?? raw.bsr_rank,
    number_of_sellers: raw.total_sellers ?? raw.number_of_sellers,
    ratings_count: raw.reviews ?? raw.ratings_count,
    score: raw.fba_score ?? raw.score,
  };
}
