import { INTERESTS } from '@/config/preferences'
// Fallback + starter data. Admin can upload it to Firestore with activitiesStore.seedFirestore().
// type: events | outdoor | volunteering | paid | openjio   energy: high | low   region: Central|East|West|North|South
export const categories = INTERESTS.map((i) => i.id)
export const activityTypes = ['events', 'outdoor', 'volunteering', 'paid', 'openjio']

export const seedActivities = [
  { id: 's1', title: 'Neon Pottery Jam', category: 'workshops', type: 'paid', cost: 45, durationHrs: 2, setting: 'Indoor', energyLevel: 'low', area: 'Bras Basah', region: 'central', lat: 1.2966, lng: 103.8510, slotsLeft: 3, groupFriendly: true, source: 'curated' },
  { id: 's2', title: 'Sunset Skate Crew', category: 'sports', type: 'outdoor', cost: 0, durationHrs: 2, setting: 'Outdoor', energyLevel: 'high', area: 'Marina Bay', region: 'central', lat: 1.2816, lng: 103.8636, slotsLeft: null, groupFriendly: true, source: 'curated' },
  { id: 's3', title: 'Southern Ridges Walk', category: 'outdoors', type: 'outdoor', cost: 0, durationHrs: 3, setting: 'Outdoor', energyLevel: 'high', area: 'Telok Blangah', region: 'central', lat: 1.2746, lng: 103.8010, slotsLeft: null, groupFriendly: true, source: 'curated' },
  { id: 's4', title: 'Museum Late Night', category: 'arts', type: 'events', cost: 15, durationHrs: 2, setting: 'Indoor', energyLevel: 'low', area: 'Museum', region: 'central', lat: 1.2966, lng: 103.8485, slotsLeft: null, groupFriendly: false, source: 'curated' },
  { id: 's5', title: 'Board Game Blitz', category: 'games', type: 'paid', cost: 8, durationHrs: 3, setting: 'Indoor', energyLevel: 'low', area: 'Tiong Bahru', region: 'central', lat: 1.2858, lng: 103.8325, slotsLeft: 0, groupFriendly: true, source: 'curated' },
  { id: 's6', title: 'Hawker Food Crawl', category: 'food', type: 'events', cost: 12, durationHrs: 2, setting: 'Outdoor', energyLevel: 'low', area: 'Maxwell', region: 'central', lat: 1.2803, lng: 103.8445, slotsLeft: null, groupFriendly: true, source: 'curated' },
  { id: 's7', title: 'East Coast Park Cycle', category: 'outdoors', type: 'outdoor', cost: 10, durationHrs: 2, setting: 'Outdoor', energyLevel: 'high', area: 'East Coast Park', region: 'east', lat: 1.3010, lng: 103.9120, slotsLeft: null, groupFriendly: true, source: 'curated' },
  { id: 's8', title: 'Beach Clean-up', category: 'volunteering', type: 'volunteering', cost: 0, durationHrs: 3, setting: 'Outdoor', energyLevel: 'high', area: 'East Coast Park', region: 'east', lat: 1.3005, lng: 103.9100, slotsLeft: 20, groupFriendly: true, source: 'curated' },
  { id: 's9', title: 'Sunrise Yoga in the Gardens', category: 'wellness', type: 'events', cost: 0, durationHrs: 1, setting: 'Outdoor', energyLevel: 'low', area: 'Botanic Gardens', region: 'central', lat: 1.3138, lng: 103.8159, slotsLeft: null, groupFriendly: false, source: 'curated' },
  { id: 's10', title: 'Pasir Ris Mangrove Walk', category: 'outdoors', type: 'outdoor', cost: 0, durationHrs: 2, setting: 'Outdoor', energyLevel: 'low', area: 'Pasir Ris', region: 'east', lat: 1.3815, lng: 103.9520, slotsLeft: null, groupFriendly: false, source: 'curated' },
  { id: 's11', title: 'Hip-hop Dance Drop-in', category: 'sports', type: 'paid', cost: 18, durationHrs: 1, setting: 'Indoor', energyLevel: 'high', area: 'Bugis', region: 'central', lat: 1.3009, lng: 103.8559, slotsLeft: 6, groupFriendly: true, source: 'curated' },
  { id: 's12', title: 'Tampines Escape Room', category: 'games', type: 'paid', cost: 25, durationHrs: 1.5, setting: 'Indoor', energyLevel: 'low', area: 'Tampines', region: 'east', lat: 1.3526, lng: 103.9450, slotsLeft: 4, groupFriendly: true, source: 'curated' },
]
