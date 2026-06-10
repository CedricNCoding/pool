// Villes françaises avec coordonnées — base du géocodage « par ville »
// (recherche d'équipe, zone d'intervention des techniciens). Liste curée,
// hors-ligne, pour éviter tout appel externe.
export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Marseille", lat: 43.2965, lng: 5.3698 },
  { name: "Lyon", lat: 45.764, lng: 4.8357 },
  { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  { name: "Nice", lat: 43.7102, lng: 7.262 },
  { name: "Nantes", lat: 47.2184, lng: -1.5536 },
  { name: "Montpellier", lat: 43.6108, lng: 3.8767 },
  { name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
  { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", lat: 50.6292, lng: 3.0573 },
  { name: "Rennes", lat: 48.1173, lng: -1.6778 },
  { name: "Reims", lat: 49.2583, lng: 4.0317 },
  { name: "Le Havre", lat: 49.4944, lng: 0.1079 },
  { name: "Saint-Etienne", lat: 45.4397, lng: 4.3872 },
  { name: "Toulon", lat: 43.1242, lng: 5.928 },
  { name: "Grenoble", lat: 45.1885, lng: 5.7245 },
  { name: "Dijon", lat: 47.322, lng: 5.0415 },
  { name: "Angers", lat: 47.4784, lng: -0.5632 },
  { name: "Nancy", lat: 48.6921, lng: 6.1844 },
  { name: "Nimes", lat: 43.8367, lng: 4.3601 },
  { name: "Aix-en-Provence", lat: 43.5297, lng: 5.4474 },
  { name: "Brest", lat: 48.3904, lng: -4.4861 },
  { name: "Le Mans", lat: 48.0061, lng: 0.1996 },
  { name: "Clermont-Ferrand", lat: 45.7772, lng: 3.087 },
  { name: "Tours", lat: 47.3941, lng: 0.6848 },
  { name: "Limoges", lat: 45.8336, lng: 1.2611 },
  { name: "Amiens", lat: 49.8941, lng: 2.2958 },
  { name: "Perpignan", lat: 42.6887, lng: 2.8948 },
  { name: "Metz", lat: 49.1193, lng: 6.1757 },
  { name: "Besancon", lat: 47.2378, lng: 6.0241 },
  { name: "Orleans", lat: 47.9029, lng: 1.909 },
  { name: "Mulhouse", lat: 47.7508, lng: 7.3359 },
  { name: "Caen", lat: 49.1829, lng: -0.3707 },
  { name: "Rouen", lat: 49.4432, lng: 1.0993 },
  { name: "Avignon", lat: 43.9493, lng: 4.8055 },
  { name: "Poitiers", lat: 46.5802, lng: 0.3404 },
  { name: "Pau", lat: 43.2951, lng: -0.3708 },
  { name: "La Rochelle", lat: 46.1603, lng: -1.1511 },
  { name: "Annecy", lat: 45.8992, lng: 6.1294 },
  { name: "Bayonne", lat: 43.4929, lng: -1.4748 },
  { name: "Cannes", lat: 43.5528, lng: 7.0174 },
  { name: "Versailles", lat: 48.8014, lng: 2.1301 },
  { name: "Chambery", lat: 45.5646, lng: 5.9178 },
  { name: "Valence", lat: 44.9333, lng: 4.8924 },
  { name: "Troyes", lat: 48.2973, lng: 4.0744 },
  { name: "Lorient", lat: 47.7486, lng: -3.3701 },
  { name: "Vannes", lat: 47.6582, lng: -2.7608 },
  { name: "Angouleme", lat: 45.6484, lng: 0.1562 },
  { name: "Bourges", lat: 47.0810, lng: 2.3987 },
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

export function findCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}

// Ville la plus proche de coordonnées données (pour pré-remplir un select).
export function nearestCity(lat: number, lng: number): City | undefined {
  let best: City | undefined;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  // Tolérance ~0.2° (~20 km) pour considérer que c'est "cette ville".
  return best && bestD < 0.04 ? best : undefined;
}
