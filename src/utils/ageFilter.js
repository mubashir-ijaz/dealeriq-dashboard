// src/utils/ageFilter.js
// "How old is this car since it was bought?" filter — separate from
// dateFilter.js (which limits the whole dashboard to a recent window).
// This one is a minimum-age threshold used on pages that track aging
// inventory (Title Status, CarMax), e.g. "show me cars 1 month+ old".

export const AGE_FILTERS = [
  { id: 'all',  label: 'Any Age',    min: 0   },
  { id: '7d',   label: '1 Week+',    min: 7   },
  { id: '10d',  label: '10 Days+',   min: 10  },
  { id: '14d',  label: '2 Weeks+',   min: 14  },
  { id: '30d',  label: '1 Month+',   min: 30  },
  { id: '60d',  label: '2 Months+',  min: 60  },
  { id: '90d',  label: '3 Months+',  min: 90  },
  { id: '180d', label: '6 Months+',  min: 180 },
];

export function getAgeMinDays(filterId) {
  const f = AGE_FILTERS.find(x => x.id === filterId);
  return f ? f.min : 0;
}

// Keep rows whose ageDays >= min. Rows with no parseable date (ageDays ==
// null) are excluded once a real threshold is picked — an unknown age can't
// be known to satisfy "1 month+".
export function filterByAge(rows, filterId) {
  const min = getAgeMinDays(filterId);
  if (!min) return rows;
  return rows.filter(r => r.ageDays !== null && r.ageDays !== undefined && r.ageDays >= min);
}
