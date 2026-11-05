// Approximate town/area centres, not project addresses. Coordinates use a regional
// equirectangular projection shared by the schematic coastline and markers.
const places: [string[], number, number][] = [
  [['berwick', 'berwick upon tweed'], -2.00, 55.77],
  [['alnwick'], -1.71, 55.41],
  [['northumberland'], -2.08, 55.30],
  [['morpeth'], -1.69, 55.17],
  [['ashington'], -1.57, 55.18],
  [['blyth'], -1.51, 55.13],
  [['hexham'], -2.10, 54.97],
  [['newcastle', 'newcastle upon tyne'], -1.61, 54.98],
  [['gateshead'], -1.60, 54.95],
  [['north shields', 'south shields', 'tyneside', 'north tyneside', 'south tyneside'], -1.44, 55.00],
  [['sunderland'], -1.38, 54.91],
  [['durham', 'county durham'], -1.58, 54.78],
  [['hartlepool'], -1.21, 54.69],
  [['darlington'], -1.55, 54.52],
  [['stockton', 'stockton on tees'], -1.31, 54.57],
  [['middlesbrough', 'teesside'], -1.24, 54.57],
  [['redcar'], -1.06, 54.62],
]
const fold = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export function projectPoint(longitude: number, latitude: number) {
  return { x: 35 + (longitude + 2.7) * 205, y: 40 + (55.85 - latitude) * 300 }
}
export function locateProject(location: string) {
  const value = fold(location)
  // Exact town or a town followed by county/country. Never guess from a partial
  // word or a broad "North East" location; retain those projects in the list.
  const place = places.find(([names]) => names.some(name => value === name || value.startsWith(`${name} `)))
  return place ? projectPoint(place[1], place[2]) : null
}
