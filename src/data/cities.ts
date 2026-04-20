export type City = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  whisper: string;
  major?: boolean; // show label always
};

export const cities: City[] = [
  // ── Asia ──────────────────────────────────────────────
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, whisper: "Neon rain on Shibuya glass.", major: true },
  { id: "seoul", name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978, whisper: "Late-night neon in a quiet alley.", major: true },
  { id: "beijing", name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, whisper: "Wind across an old hutong wall.", major: true },
  { id: "shanghai", name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, whisper: "River horns under a violet skyline.", major: true },
  { id: "hongkong", name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694, whisper: "Tram bells in the harbour mist." },
  { id: "taipei", name: "Taipei", country: "Taiwan", lat: 25.033, lng: 121.5654, whisper: "Night market sizzle and lantern hum." },
  { id: "manila", name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842, whisper: "Jeepney horns at golden hour." },
  { id: "bangkok", name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, whisper: "Tuk-tuks weaving through neon dusk.", major: true },
  { id: "hanoi", name: "Hanoi", country: "Vietnam", lat: 21.0285, lng: 105.8542, whisper: "Steam curling from a bowl of pho." },
  { id: "saigon", name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297, whisper: "Scooters humming past café chairs." },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, whisper: "Tropic rain on glass towers.", major: true },
  { id: "kualalumpur", name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869, whisper: "Call to prayer over palm canopy." },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, whisper: "Warung chatter under monsoon clouds." },
  { id: "bali", name: "Denpasar", country: "Indonesia", lat: -8.6705, lng: 115.2126, whisper: "Gamelan drifting from a rice terrace." },
  { id: "delhi", name: "Delhi", country: "India", lat: 28.6139, lng: 77.209, whisper: "Auto-rickshaws in the marigold dusk.", major: true },
  { id: "mumbai", name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777, whisper: "Monsoon footsteps on warm stone.", major: true },
  { id: "bangalore", name: "Bengaluru", country: "India", lat: 12.9716, lng: 77.5946, whisper: "Filter coffee and jacaranda wind." },
  { id: "kolkata", name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, whisper: "Tram bells on a misty morning." },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", lat: 27.7172, lng: 85.324, whisper: "Prayer flags whisper to the Himalayas." },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125, whisper: "Rickshaw bells along the river." },
  { id: "karachi", name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011, whisper: "Sea breeze through clifftop streets." },
  { id: "lahore", name: "Lahore", country: "Pakistan", lat: 31.5497, lng: 74.3436, whisper: "Qawwali rising from old courtyards." },
  { id: "tehran", name: "Tehran", country: "Iran", lat: 35.6892, lng: 51.389, whisper: "Mountain wind over tiled domes." },
  { id: "dubai", name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, whisper: "Desert hush behind glass spires.", major: true },
  { id: "doha", name: "Doha", country: "Qatar", lat: 25.2854, lng: 51.531, whisper: "Dhow sails on a turquoise bay." },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, whisper: "Evening coolness over warm sand." },
  { id: "jerusalem", name: "Jerusalem", country: "Israel", lat: 31.7683, lng: 35.2137, whisper: "Old stone cooling at sundown." },
  { id: "telaviv", name: "Tel Aviv", country: "Israel", lat: 32.0853, lng: 34.7818, whisper: "Boardwalk waves and jasmine air." },
  { id: "almaty", name: "Almaty", country: "Kazakhstan", lat: 43.222, lng: 76.8512, whisper: "Snow wind off the Tian Shan." },

  // ── Europe ────────────────────────────────────────────
  { id: "london", name: "London", country: "UK", lat: 51.5074, lng: -0.1278, whisper: "Rain on red brick, a far-off bell.", major: true },
  { id: "edinburgh", name: "Edinburgh", country: "UK", lat: 55.9533, lng: -3.1883, whisper: "Bagpipes drifting from a stone close." },
  { id: "dublin", name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603, whisper: "Fiddle warmth from a corner pub." },
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, whisper: "An accordion drifts across the Seine.", major: true },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041, whisper: "Bicycle bells on a misty canal." },
  { id: "brussels", name: "Brussels", country: "Belgium", lat: 50.8503, lng: 4.3517, whisper: "Cobblestones under café laughter." },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405, whisper: "U-Bahn hum at three a.m.", major: true },
  { id: "munich", name: "Munich", country: "Germany", lat: 48.1351, lng: 11.582, whisper: "Bavarian wind off alpine meadows." },
  { id: "vienna", name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738, whisper: "Piano keys behind a velvet curtain." },
  { id: "prague", name: "Prague", country: "Czechia", lat: 50.0755, lng: 14.4378, whisper: "Bells tumbling over red roofs." },
  { id: "warsaw", name: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122, whisper: "Snow hush in an old square." },
  { id: "budapest", name: "Budapest", country: "Hungary", lat: 47.4979, lng: 19.0402, whisper: "Steam rising off a thermal bath." },
  { id: "zurich", name: "Zürich", country: "Switzerland", lat: 47.3769, lng: 8.5417, whisper: "Lake stillness under alpine sky." },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, whisper: "Fountain water and warm stone.", major: true },
  { id: "milan", name: "Milan", country: "Italy", lat: 45.4642, lng: 9.19, whisper: "Tram bells in a marble arcade." },
  { id: "venice", name: "Venice", country: "Italy", lat: 45.4408, lng: 12.3155, whisper: "Oar splashes echo down a canal." },
  { id: "barcelona", name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734, whisper: "Sea breeze through Gothic arches.", major: true },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, whisper: "Late dinner laughter in a plaza." },
  { id: "lisbon", name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, whisper: "Fado echoing down tiled streets." },
  { id: "athens", name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275, whisper: "Cicadas under marble columns." },
  { id: "santorini", name: "Santorini", country: "Greece", lat: 36.3932, lng: 25.4615, whisper: "Aegean wind on whitewashed walls." },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", lat: 41.0082, lng: 28.9784, whisper: "Call to prayer crossing two continents.", major: true },
  { id: "stockholm", name: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, whisper: "Pale dawn over still archipelago." },
  { id: "oslo", name: "Oslo", country: "Norway", lat: 59.9139, lng: 10.7522, whisper: "Pine wind down a quiet fjord." },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", lat: 55.6761, lng: 12.5683, whisper: "Bicycle wheels on harbor stone." },
  { id: "helsinki", name: "Helsinki", country: "Finland", lat: 60.1699, lng: 24.9384, whisper: "Sauna steam against winter glass." },
  { id: "reykjavik", name: "Reykjavík", country: "Iceland", lat: 64.1466, lng: -21.9426, whisper: "Aurora hush above black sand." },
  { id: "moscow", name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, whisper: "Snow muffles the midnight metro.", major: true },
  { id: "stpetersburg", name: "St. Petersburg", country: "Russia", lat: 59.9311, lng: 30.3609, whisper: "White nights on the Neva." },
  { id: "kyiv", name: "Kyiv", country: "Ukraine", lat: 50.4501, lng: 30.5234, whisper: "Chestnut blossoms in spring wind." },

  // ── Africa ────────────────────────────────────────────
  { id: "cairo", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, whisper: "Wind across ancient stone at dusk.", major: true },
  { id: "marrakech", name: "Marrakech", country: "Morocco", lat: 31.6295, lng: -7.9811, whisper: "Spice and lantern light in the medina.", major: true },
  { id: "casablanca", name: "Casablanca", country: "Morocco", lat: 33.5731, lng: -7.5898, whisper: "Atlantic waves beyond white walls." },
  { id: "tunis", name: "Tunis", country: "Tunisia", lat: 36.8065, lng: 10.1815, whisper: "Mediterranean light on blue doors." },
  { id: "lagos", name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, whisper: "Afrobeats spilling onto the street." },
  { id: "accra", name: "Accra", country: "Ghana", lat: 5.6037, lng: -0.187, whisper: "Atlantic surf and drumlines." },
  { id: "dakar", name: "Dakar", country: "Senegal", lat: 14.7167, lng: -17.4677, whisper: "Kora strings on an evening breeze." },
  { id: "addis", name: "Addis Ababa", country: "Ethiopia", lat: 9.0054, lng: 38.7636, whisper: "Coffee ceremony in highland air." },
  { id: "nairobi", name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219, whisper: "Highland breeze and distant thunder." },
  { id: "darsalaam", name: "Dar es Salaam", country: "Tanzania", lat: -6.7924, lng: 39.2083, whisper: "Indian Ocean lapping warm sand." },
  { id: "kampala", name: "Kampala", country: "Uganda", lat: 0.3476, lng: 32.5825, whisper: "Hillside markets at golden hour." },
  { id: "luanda", name: "Luanda", country: "Angola", lat: -8.839, lng: 13.2894, whisper: "Atlantic wind through palm crowns." },
  { id: "joburg", name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473, whisper: "Highveld thunder rolling in." },
  { id: "capetown", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, whisper: "Ocean wind under Table Mountain.", major: true },

  // ── North America ─────────────────────────────────────
  { id: "nyc", name: "New York", country: "USA", lat: 40.7128, lng: -74.006, whisper: "Steam rising from a midnight street.", major: true },
  { id: "boston", name: "Boston", country: "USA", lat: 42.3601, lng: -71.0589, whisper: "Harbor bells in autumn fog." },
  { id: "washington", name: "Washington", country: "USA", lat: 38.9072, lng: -77.0369, whisper: "Cherry blossoms on a marble walk." },
  { id: "miami", name: "Miami", country: "USA", lat: 25.7617, lng: -80.1918, whisper: "Salt wind and neon palm trees." },
  { id: "chicago", name: "Chicago", country: "USA", lat: 41.8781, lng: -87.6298, whisper: "Lakefront wind through steel canyons." },
  { id: "neworleans", name: "New Orleans", country: "USA", lat: 29.9511, lng: -90.0715, whisper: "A trumpet drifts down Frenchmen Street." },
  { id: "denver", name: "Denver", country: "USA", lat: 39.7392, lng: -104.9903, whisper: "Mountain air over thin pines." },
  { id: "seattle", name: "Seattle", country: "USA", lat: 47.6062, lng: -122.3321, whisper: "Drizzle on a ferry deck." },
  { id: "sf", name: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194, whisper: "Foghorn under the red bridge.", major: true },
  { id: "la", name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, whisper: "Palms hissing in a warm canyon.", major: true },
  { id: "vancouver", name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, whisper: "Cedar mist drifting off the inlet." },
  { id: "toronto", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, whisper: "Lake wind through glass towers.", major: true },
  { id: "montreal", name: "Montréal", country: "Canada", lat: 45.5017, lng: -73.5673, whisper: "Snow muffles a brick alley." },
  { id: "mexico", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, whisper: "Marimba on a sunlit plaza.", major: true },
  { id: "havana", name: "Havana", country: "Cuba", lat: 23.1136, lng: -82.3666, whisper: "Son cubano on a peeling balcony." },
  { id: "panama", name: "Panama City", country: "Panama", lat: 8.9824, lng: -79.5199, whisper: "Pacific wind over old stone." },

  // ── South America ─────────────────────────────────────
  { id: "bogota", name: "Bogotá", country: "Colombia", lat: 4.711, lng: -74.0721, whisper: "Andean drizzle and warm bread." },
  { id: "lima", name: "Lima", country: "Peru", lat: -12.0464, lng: -77.0428, whisper: "Pacific fog along a clifftop." },
  { id: "cusco", name: "Cusco", country: "Peru", lat: -13.5319, lng: -71.9675, whisper: "Pan flutes in thin mountain air." },
  { id: "quito", name: "Quito", country: "Ecuador", lat: -0.1807, lng: -78.4678, whisper: "Volcano clouds over red tile." },
  { id: "santiago", name: "Santiago", country: "Chile", lat: -33.4489, lng: -70.6693, whisper: "Andes wind down quiet avenidas." },
  { id: "buenosaires", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, whisper: "Tango drifting from an open window.", major: true },
  { id: "montevideo", name: "Montevideo", country: "Uruguay", lat: -34.9011, lng: -56.1645, whisper: "Mate steam at the rambla." },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, whisper: "Distant samba over the bay.", major: true },
  { id: "saopaulo", name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, whisper: "Helicopters over endless lights." },
  { id: "salvador", name: "Salvador", country: "Brazil", lat: -12.9777, lng: -38.5016, whisper: "Berimbau under colonial stone." },
  { id: "caracas", name: "Caracas", country: "Venezuela", lat: 10.4806, lng: -66.9036, whisper: "Mountain shadow at evening." },

  // ── Oceania ───────────────────────────────────────────
  { id: "sydney", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, whisper: "Harbour wind and ferry bells.", major: true },
  { id: "melbourne", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, whisper: "Trams humming through laneways." },
  { id: "perth", name: "Perth", country: "Australia", lat: -31.9505, lng: 115.8605, whisper: "Indian Ocean wind, late summer." },
  { id: "brisbane", name: "Brisbane", country: "Australia", lat: -27.4698, lng: 153.0251, whisper: "River cicadas on a warm night." },
  { id: "auckland", name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633, whisper: "Sail lines clinking in the harbor." },
  { id: "wellington", name: "Wellington", country: "New Zealand", lat: -41.2865, lng: 174.7762, whisper: "Southerly wind down wooden hills." },
  { id: "honolulu", name: "Honolulu", country: "USA", lat: 21.3069, lng: -157.8583, whisper: "Slack-key guitar and trade winds." },
];

// Convert lat/lng → 3D position on a sphere of given radius.
// Texture is mapped so that lng = 0 sits at the back (-Z) of the default sphere.
// Three.js SphereGeometry uses θ (around Y) starting at +X (lng = -90 in our map).
// Formulas below give the standard "Earth texture" placement.
export function latLngToVector3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}
