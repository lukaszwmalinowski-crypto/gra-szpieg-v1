export type LocationCategory = {
  id: string;
  name: string;
  locations: string[];
};

export const locationCategories: LocationCategory[] = [
  {
    id: 'codzienne',
    name: 'Codzienne miejsca',
    locations: ['szkoła', 'biuro', 'szpital', 'restauracja', 'kino', 'autobus', 'lotnisko', 'hotel', 'siłownia', 'sklep'],
  },
  {
    id: 'wakacje',
    name: 'Wakacje',
    locations: ['plaża', 'statek', 'hotel all inclusive', 'muzeum', 'lotnisko', 'dworzec', 'kemping', 'park wodny'],
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    locations: ['zamek', 'karczma', 'loch', 'obóz wojskowy', 'magiczna akademia', 'wioska elfów', 'jaskinia smoka'],
  },
  {
    id: 'praca',
    name: 'Praca',
    locations: ['urząd', 'sala szkoleniowa', 'sekretariat', 'konferencja', 'magazyn', 'open space', 'rozmowa kwalifikacyjna'],
  },
];

export function pickLocation(categoryId: string) {
  const category = locationCategories.find((item) => item.id === categoryId) ?? locationCategories[0];
  return category.locations[Math.floor(Math.random() * category.locations.length)];
}
