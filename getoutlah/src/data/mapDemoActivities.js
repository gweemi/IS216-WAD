// Map-only prototype data. It deliberately does not replace SAMPLE_ACTIVITIES,
// which remains the shared data source for recommendations and check-ins.
const STANDARD_FIELDS = {
  description: null,
  locationName: null,
  address: null,
  startDateTime: null,
  endDateTime: null,
  openingHours: null,
  externalId: null,
  externalUrl: null,
  imageUrl: null,
}

function mapActivity(activity) {
  return { ...STANDARD_FIELDS, ...activity, source: 'sample' }
}

export const MAP_DEMO_ACTIVITIES = [
  mapActivity({
    id: 'act-bedok', title: 'Bedok Reservoir walk', category: 'nature', tags: ['walk', 'reservoir', 'outdoor'], activityType: 'anytime',
    region: 'east', lat: 1.3404, lng: 103.9246, energy: 'moderate', cost: 0, duration: 60, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-pasir-kayak', title: 'Pasir Ris kayaking', category: 'sports', tags: ['kayaking', 'water-sports', 'outdoor'], activityType: 'anytime',
    region: 'east', lat: 1.3812, lng: 103.9551, energy: 'high', cost: 35, duration: 120, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-bukit-timah', title: 'Bukit Timah summit hike', category: 'nature', tags: ['hiking', 'fitness', 'trail', 'outdoor'], activityType: 'anytime',
    region: 'central', lat: 1.3546, lng: 103.7764, energy: 'high', cost: 0, duration: 120, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-botanic', title: 'Botanic Gardens slow stroll', category: 'nature', tags: ['walk', 'garden', 'relaxing'], activityType: 'anytime',
    region: 'central', lat: 1.3138, lng: 103.8159, energy: 'calm', cost: 0, duration: 60, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-pottery', title: 'Pottery jam OPENJIO', category: 'workshops', tags: ['pottery', 'creative', 'beginner'], activityType: 'scheduled',
    region: 'central', lat: 1.3346, lng: 103.852, energy: 'calm', cost: 45, duration: 120, isOpenJio: true,
  }),
  mapActivity({
    id: 'act-library', title: 'Library@Orchard zine corner', category: 'arts', tags: ['zines', 'reading', 'creative'], activityType: 'anytime',
    region: 'central', lat: 1.3007, lng: 103.8395, energy: 'calm', cost: 0, duration: 90, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-gallery', title: 'National Gallery free entry', category: 'arts', tags: ['gallery', 'museum', 'culture'], activityType: 'anytime',
    region: 'central', lat: 1.2903, lng: 103.8515, energy: 'calm', cost: 0, duration: 90, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-ecp-cycle', title: 'East Coast Park cycling', category: 'sports', tags: ['cycling', 'fitness', 'outdoor'], activityType: 'anytime',
    region: 'east', lat: 1.3008, lng: 103.9122, energy: 'moderate', cost: 10, duration: 90, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-bball', title: 'Pickup basketball OPENJIO', category: 'sports', tags: ['basketball', 'team-sport', 'social'], activityType: 'scheduled',
    region: 'west', lat: 1.347, lng: 103.699, energy: 'high', cost: 0, duration: 90, isOpenJio: true,
  }),
  mapActivity({
    id: 'act-foodbank', title: 'Food Bank packing session', category: 'community', tags: ['volunteering', 'community', 'food'], activityType: 'scheduled',
    region: 'north', lat: 1.429, lng: 103.835, energy: 'moderate', cost: 0, duration: 120, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-boulder', title: 'Bouldering intro class', category: 'sports', tags: ['bouldering', 'fitness', 'beginner'], activityType: 'scheduled',
    region: 'west', lat: 1.3151, lng: 103.7649, energy: 'high', cost: 28, duration: 90, isOpenJio: false,
  }),
  mapActivity({
    id: 'act-jurong-lake', title: 'Jurong Lake Gardens picnic', category: 'nature', tags: ['picnic', 'park', 'outdoor'], activityType: 'anytime',
    region: 'west', lat: 1.3378, lng: 103.7283, energy: 'calm', cost: 0, duration: 90, isOpenJio: true,
  }),
  mapActivity({
    id: 'demo-live-indie', title: 'Demo: Indie music night', category: 'music', tags: ['live-music', 'nightlife', 'social'], activityType: 'scheduled',
    region: 'north', lat: 1.417, lng: 103.833, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-outdoor-concert', title: 'Demo: Outdoor concert', category: 'music', tags: ['concert', 'outdoor', 'live-music'], activityType: 'scheduled',
    region: 'north', lat: 1.447, lng: 103.82, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-art-exhibition', title: 'Demo: Art exhibition', category: 'arts', tags: ['exhibition', 'art', 'culture'], activityType: 'anytime',
    region: 'north-east', lat: 1.405, lng: 103.902, energy: 'calm', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-painting-workshop', title: 'Demo: Painting workshop', category: 'workshops', tags: ['painting', 'creative', 'beginner'], activityType: 'scheduled',
    region: 'east', lat: 1.354, lng: 103.945, energy: 'calm', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-weekend-yoga', title: 'Demo: Weekend yoga class', category: 'sports', tags: ['yoga', 'wellness', 'outdoor'], activityType: 'scheduled',
    region: 'east', lat: 1.352, lng: 103.988, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-food-festival', title: 'Demo: Food festival', category: 'food', tags: ['festival', 'market', 'food'], activityType: 'scheduled',
    region: 'south', lat: 1.265, lng: 103.822, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-flea-market', title: 'Demo: Flea market', category: 'festivals', tags: ['market', 'shopping', 'weekend'], activityType: 'scheduled',
    region: 'central', lat: 1.285, lng: 103.833, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
  mapActivity({
    id: 'demo-beach-cleanup', title: 'Demo: Community beach cleanup', category: 'community', tags: ['volunteering', 'environment', 'outdoor'], activityType: 'scheduled',
    region: 'west', lat: 1.294, lng: 103.767, energy: 'moderate', cost: null, duration: null, isOpenJio: false,
  }),
]
