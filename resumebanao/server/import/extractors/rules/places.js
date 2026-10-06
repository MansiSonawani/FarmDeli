// Well-known places: countries, US states, and large cities. Used where a short piece of text could be either a
// place or a company ("Product Manager, Orbit Apps" versus "Product Manager, London"). Not exhaustive; places
// outside the list are still found by their position and shape (see isLocation in contact.js).

const COUNTRIES =
  'afghanistan|albania|algeria|argentina|armenia|australia|austria|azerbaijan|bahrain|bangladesh|belarus|belgium|bolivia|bosnia|brazil|bulgaria|cambodia|cameroon|canada|chile|china|colombia|costa rica|croatia|cuba|cyprus|czech republic|czechia|denmark|ecuador|egypt|el salvador|estonia|ethiopia|finland|france|georgia|germany|ghana|greece|guatemala|honduras|hong kong|hungary|iceland|india|indonesia|iran|iraq|ireland|israel|italy|ivory coast|jamaica|japan|jordan|kazakhstan|kenya|korea|south korea|kuwait|latvia|lebanon|libya|lithuania|luxembourg|malaysia|malta|mexico|moldova|morocco|myanmar|nepal|netherlands|the netherlands|new zealand|nicaragua|nigeria|norway|oman|pakistan|panama|paraguay|peru|philippines|poland|portugal|qatar|romania|russia|rwanda|saudi arabia|senegal|serbia|singapore|slovakia|slovenia|south africa|spain|sri lanka|sudan|sweden|switzerland|syria|taiwan|tanzania|thailand|tunisia|turkey|uganda|ukraine|united arab emirates|uae|united kingdom|uk|great britain|england|scotland|wales|northern ireland|united states|united states of america|usa|us|uruguay|uzbekistan|venezuela|vietnam|yemen|zambia|zimbabwe|europe|emea|apac'

const US_STATES =
  'alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|ontario|quebec|british columbia|alberta|manitoba|nova scotia|bavaria|catalonia|andalusia|lombardy|tuscany'

const STATE_CODES =
  'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|ON|QC|BC|AB'

const CITIES =
  'london|manchester|birmingham|leeds|liverpool|bristol|edinburgh|glasgow|cardiff|belfast|oxford|cambridge|dublin|cork|paris|lyon|marseille|toulouse|nice|nantes|bordeaux|lille|berlin|munich|hamburg|frankfurt|cologne|stuttgart|dusseldorf|leipzig|dresden|madrid|barcelona|valencia|seville|bilbao|malaga|lisbon|porto|rome|milan|turin|naples|florence|venice|bologna|amsterdam|rotterdam|the hague|utrecht|eindhoven|brussels|antwerp|ghent|zurich|geneva|basel|bern|vienna|salzburg|prague|brno|warsaw|krakow|wroclaw|gdansk|budapest|bucharest|sofia|athens|istanbul|ankara|stockholm|gothenburg|malmo|uppsala|oslo|bergen|copenhagen|aarhus|helsinki|tampere|tallinn|riga|vilnius|reykjavik|moscow|kyiv|kiev|minsk|new york|new york city|nyc|los angeles|san francisco|san jose|san diego|seattle|portland|austin|dallas|houston|chicago|boston|philadelphia|washington dc|atlanta|miami|denver|phoenix|las vegas|salt lake city|minneapolis|detroit|pittsburgh|raleigh|charlotte|nashville|orlando|tampa|toronto|vancouver|montreal|ottawa|calgary|edmonton|mexico city|bogota|lima|santiago|buenos aires|sao paulo|rio de janeiro|brasilia|dubai|abu dhabi|doha|riyadh|tel aviv|jerusalem|cairo|lagos|nairobi|accra|johannesburg|cape town|casablanca|mumbai|delhi|new delhi|bengaluru|bangalore|hyderabad|chennai|pune|kolkata|ahmedabad|gurgaon|gurugram|noida|jaipur|madurai|kochi|karachi|lahore|islamabad|dhaka|colombo|kathmandu|singapore|kuala lumpur|jakarta|bangkok|hanoi|ho chi minh city|manila|hong kong|shenzhen|shanghai|beijing|guangzhou|taipei|seoul|busan|tokyo|osaka|kyoto|sydney|melbourne|brisbane|perth|adelaide|canberra|auckland|wellington|christchurch|remote'

const set = (list) => new Set(list.split('|'))
const COUNTRY_SET = set(COUNTRIES)
const STATE_SET = set(US_STATES)
const CITY_SET = set(CITIES)
const CODE_SET = new Set(STATE_CODES.split('|'))

// Is the whole text a known city, country or state, or "City, Country"?
export function isKnownPlace(text) {
  const parts = text
    .trim()
    .split(/\s*,\s*/)
    .filter(Boolean)
  if (parts.length === 0 || parts.length > 3) return false
  return parts.every((part, i) => {
    const key = part.toLowerCase().replace(/\s+\d{4,6}$/, '')
    return (
      CITY_SET.has(key) ||
      COUNTRY_SET.has(key) ||
      STATE_SET.has(key) ||
      (i > 0 && CODE_SET.has(part.replace(/\s+\d{4,6}$/, '')))
    )
  })
}
