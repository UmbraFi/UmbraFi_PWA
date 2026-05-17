export interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
  imageCids?: string[]
  category: string
  feedType: FeedType
  description: string
  seller: string
  sellerPubkey?: string
  listedAt: string
  size?: string
  condition: 'New' | 'Like New' | 'Used'
  sellerReputation: number
  qualityScore: number
  shipFromCountry: string
  deliverableCountries: string[]
  sellType?: string
  tags?: string[]
  review?: {
    approved: boolean
    reason: string
    minerPubkey?: string
    timestamp?: number
  }
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const feedTypes = [
  'electronics',
  'womensFashion',
  'mensFashion',
  'beverages',
  'tobacco',
  'beauty',
  'sports',
  'gaming',
  'homeLiving',
  'collectibles',
] as const
export type FeedType = (typeof feedTypes)[number]

export const feedTypeLabels: Record<FeedType, string> = {
  electronics: 'Electronics',
  womensFashion: 'Women Fashion',
  mensFashion: 'Men Fashion',
  beverages: 'Beverages',
  tobacco: 'Tobacco',
  beauty: 'Beauty',
  sports: 'Sports',
  gaming: 'Gaming',
  homeLiving: 'Home Living',
  collectibles: 'Collectibles',
}

// 20 fake sellers
const sellers = [
  '7xKz...9fRm',
  '4pQw...2nXk',
  '9mBv...3hTp',
  '2kLp...8wQz',
  '6jNr...1aDe',
  '3sYt...5cVb',
  '8hFg...7mWx',
  '1dCn...4kSz',
  '5wAe...0pLj',
  '0qRi...6yUf',
  '7bXo...2tHm',
  '4gMk...9eJv',
  '9nZl...5rBw',
  '2fDs...8xCq',
  '6tPa...3iKn',
  '3yWh...7oGe',
  '8cVj...1uTb',
  '1kSf...4dNr',
  '5xBm...0gYp',
  '0pLw...6aRz',
]

const img = (seed: string) => `https://picsum.photos/seed/${seed}/400/500?blur=3`

const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'South Korea', 'Singapore', 'Australia', 'Italy', 'Netherlands', 'Spain', 'Brazil', 'Mexico', 'Sweden']

const deliverable = (from: string) => {
  const others = countries.filter(c => c !== from).sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3))
  return [from, ...others]
}

const productData: Omit<Product, 'id' | 'seller' | 'listedAt' | 'sellerReputation' | 'qualityScore' | 'shipFromCountry' | 'deliverableCountries'>[] = [
  // Electronics (15)
  { name: 'Stealth Wireless Earbuds', brand: 'NOIR AUDIO', price: 1.2, image: img('earbuds1'), category: 'Audio', feedType: 'electronics', description: 'True wireless earbuds with ANC and 30hr battery.', condition: 'New' },
  { name: 'Shadow Mechanical Keyboard', brand: 'VOID TECH', price: 2.8, image: img('keyboard1'), category: 'Peripherals', feedType: 'electronics', description: '75% hot-swappable keyboard with RGB underglow.', condition: 'New' },
  { name: 'Phantom Gaming Mouse', brand: 'DARK PERIPHERALS', price: 0.9, image: img('mouse1'), category: 'Peripherals', feedType: 'electronics', description: 'Ultra-light 49g mouse with PAW3395 sensor.', condition: 'Like New' },
  { name: 'Eclipse 4K Monitor', brand: 'VOID TECH', price: 8.5, image: img('monitor1'), category: 'Displays', feedType: 'electronics', description: '27" 4K 144Hz OLED gaming monitor.', condition: 'New' },
  { name: 'Cipher USB-C Hub', brand: 'NOIR AUDIO', price: 0.6, image: img('usbhub1'), category: 'Accessories', feedType: 'electronics', description: '7-in-1 USB-C hub with 100W PD passthrough.', condition: 'New' },
  { name: 'Wraith Portable SSD 2TB', brand: 'SHADOW STORAGE', price: 1.8, image: img('ssd1'), category: 'Storage', feedType: 'electronics', description: 'IP68 rugged portable SSD, 2000MB/s read.', condition: 'New' },
  { name: 'Obsidian Smartwatch Pro', brand: 'DARK PERIPHERALS', price: 3.2, image: img('watch1'), category: 'Wearables', feedType: 'electronics', description: 'AMOLED smartwatch with SpO2 and 14-day battery.', condition: 'Like New' },
  { name: 'Void Noise Cancelling Headphones', brand: 'NOIR AUDIO', price: 2.1, image: img('headphones1'), category: 'Audio', feedType: 'electronics', description: 'Over-ear ANC headphones, 40hr battery, LDAC.', condition: 'New' },
  { name: 'Stealth Webcam 4K', brand: 'VOID TECH', price: 0.7, image: img('webcam1'), category: 'Peripherals', feedType: 'electronics', description: '4K webcam with auto-framing and privacy shutter.', condition: 'New' },
  { name: 'Shadow Power Bank 20K', brand: 'DARK PERIPHERALS', price: 0.5, image: img('powerbank1'), category: 'Accessories', feedType: 'electronics', description: '20000mAh power bank, 65W USB-C PD output.', condition: 'Used' },
  { name: 'Phantom Drone Mini', brand: 'VOID TECH', price: 4.5, image: img('drone1'), category: 'Drones', feedType: 'electronics', description: 'Sub-250g drone with 4K camera and 3-axis gimbal.', condition: 'New' },
  { name: 'Eclipse Tablet Pro 12"', brand: 'SHADOW STORAGE', price: 6.0, image: img('tablet1'), category: 'Tablets', feedType: 'electronics', description: '12" OLED tablet with M-series chip, 256GB.', condition: 'Like New' },
  { name: 'Cipher Bluetooth Speaker', brand: 'NOIR AUDIO', price: 0.8, image: img('speaker1'), category: 'Audio', feedType: 'electronics', description: 'IP67 waterproof speaker with 360° sound.', condition: 'New' },
  { name: 'Wraith Action Cam', brand: 'VOID TECH', price: 2.5, image: img('actioncam1'), category: 'Cameras', feedType: 'electronics', description: '5K action camera with HyperSmooth stabilization.', condition: 'New' },
  { name: 'Obsidian VR Headset', brand: 'DARK PERIPHERALS', price: 5.5, image: img('vrheadset1'), category: 'VR', feedType: 'electronics', description: 'Standalone VR headset with pancake lenses, 4K per eye.', condition: 'New' },

  // Women's Fashion (10)
  { name: 'Noir Silk Blouse', brand: 'UMBRA', price: 1.5, image: img('wblouse1'), category: 'Tops', feedType: 'womensFashion', description: 'Mulberry silk blouse in jet black.', size: 'S', condition: 'New' },
  { name: 'Shadow Pleated Skirt', brand: 'DARK FOREST', price: 1.2, image: img('wskirt1'), category: 'Bottoms', feedType: 'womensFashion', description: 'High-waist pleated midi skirt.', size: 'M', condition: 'New' },
  { name: 'Eclipse Leather Bag', brand: 'VOID JEWELRY', price: 3.8, image: img('wbag1'), category: 'Bags', feedType: 'womensFashion', description: 'Matte black calfskin crossbody bag.', condition: 'Like New' },
  { name: 'Phantom Cashmere Scarf', brand: 'UMBRA', price: 2.0, image: img('wscarf1'), category: 'Accessories', feedType: 'womensFashion', description: '100% cashmere oversized scarf.', condition: 'New' },
  { name: 'Stealth Yoga Set', brand: 'SHADOW STEP', price: 1.6, image: img('wyoga1'), category: 'Activewear', feedType: 'womensFashion', description: 'Seamless leggings + sports bra set.', size: 'M', condition: 'New' },
  { name: 'Void Trench Coat', brand: 'DARK FOREST', price: 4.2, image: img('wtrench1'), category: 'Outerwear', feedType: 'womensFashion', description: 'Double-breasted water-repellent trench.', size: 'S', condition: 'New' },
  { name: 'Cipher Ankle Boots', brand: 'SHADOW STEP', price: 2.9, image: img('wboots1'), category: 'Shoes', feedType: 'womensFashion', description: 'Chelsea boots in matte black leather.', size: '38', condition: 'Like New' },
  { name: 'Wraith Sunglasses', brand: 'VOID JEWELRY', price: 1.1, image: img('wsunglasses1'), category: 'Accessories', feedType: 'womensFashion', description: 'Cat-eye polarized sunglasses, matte frame.', condition: 'New' },
  { name: 'Obsidian Evening Dress', brand: 'UMBRA', price: 5.0, image: img('wdress1'), category: 'Dresses', feedType: 'womensFashion', description: 'Floor-length satin gown with slit.', size: 'S', condition: 'New' },
  { name: 'Spectre Wool Cardigan', brand: 'DARK FOREST', price: 1.8, image: img('wcardigan1'), category: 'Tops', feedType: 'womensFashion', description: 'Oversized merino blend cardigan.', size: 'L', condition: 'Used' },

  // Men's Fashion (10)
  { name: 'Phantom Hoodie', brand: 'UMBRA', price: 2.5, image: img('mhoodie1'), category: 'Tops', feedType: 'mensFashion', description: 'Oversized heavyweight hoodie with reflective ghost print. 450 GSM cotton.', size: 'L', condition: 'New' },
  { name: 'Void Runner V2', brand: 'SHADOW STEP', price: 3.8, image: img('mrunner1'), category: 'Shoes', feedType: 'mensFashion', description: 'Triple-black mesh runner with carbon fiber sole plate.', size: '42', condition: 'New' },
  { name: 'Stealth Cargo Pants', brand: 'UMBRA', price: 1.9, image: img('mcargo1'), category: 'Bottoms', feedType: 'mensFashion', description: 'Water-resistant ripstop cargo with hidden zip pockets.', size: 'M', condition: 'Like New' },
  { name: 'Cipher Tee', brand: 'DARK FOREST', price: 0.8, image: img('mtee1'), category: 'Tops', feedType: 'mensFashion', description: 'Washed black tee with encrypted text graphic.', size: 'XL', condition: 'New' },
  { name: 'Eclipse Jacket', brand: 'UMBRA', price: 4.1, image: img('mjacket1'), category: 'Outerwear', feedType: 'mensFashion', description: 'Heavyweight waxed cotton jacket with concealed hood.', size: 'M', condition: 'Like New' },
  { name: 'Wraith Denim', brand: 'SHADOW STEP', price: 2.2, image: img('mdenim1'), category: 'Bottoms', feedType: 'mensFashion', description: 'Raw selvedge denim, triple-washed black.', size: '32', condition: 'Used' },
  { name: 'Shadow Bomber Jacket', brand: 'DARK FOREST', price: 3.0, image: img('mbomber1'), category: 'Outerwear', feedType: 'mensFashion', description: 'MA-1 bomber with satin lining, matte black.', size: 'L', condition: 'New' },
  { name: 'Obsidian Polo Shirt', brand: 'UMBRA', price: 1.1, image: img('mpolo1'), category: 'Tops', feedType: 'mensFashion', description: 'Pique cotton polo, embroidered crest.', size: 'M', condition: 'New' },
  { name: 'Phantom Swim Shorts', brand: 'SHADOW STEP', price: 0.7, image: img('mswim1'), category: 'Bottoms', feedType: 'mensFashion', description: 'Quick-dry stretch swim shorts.', size: 'L', condition: 'New' },
  { name: 'Void Leather Belt', brand: 'VOID JEWELRY', price: 0.9, image: img('mbelt1'), category: 'Accessories', feedType: 'mensFashion', description: 'Full-grain leather belt, matte gunmetal buckle.', condition: 'New' },

  // Beverages (10)
  { name: 'Aged Single Malt 18yr', brand: 'SHADOW SPIRITS', price: 6.5, image: img('whisky1'), category: 'Whisky', feedType: 'beverages', description: 'Islay single malt, 18 year old, sherry cask finish.', condition: 'New' },
  { name: 'Craft IPA 12-Pack', brand: 'VOID BREWING', price: 0.4, image: img('beer1'), category: 'Beer', feedType: 'beverages', description: 'Hazy New England IPA, 6.8% ABV.', condition: 'New' },
  { name: 'Reserve Cabernet 2019', brand: 'NOIR VINEYARDS', price: 3.2, image: img('wine1'), category: 'Wine', feedType: 'beverages', description: 'Napa Valley Cabernet Sauvignon, 95pts.', condition: 'New' },
  { name: 'Artisan Cold Brew Concentrate', brand: 'DARK ROAST', price: 0.3, image: img('coffee1'), category: 'Coffee', feedType: 'beverages', description: '12x concentrate cold brew, single-origin Ethiopian.', condition: 'New' },
  { name: 'Premium Matcha Powder 100g', brand: 'SHADOW TEA', price: 0.5, image: img('matcha1'), category: 'Tea', feedType: 'beverages', description: 'Ceremonial grade Uji matcha from Kyoto.', condition: 'New' },
  { name: 'Añejo Tequila Reserve', brand: 'SHADOW SPIRITS', price: 4.8, image: img('tequila1'), category: 'Spirits', feedType: 'beverages', description: 'Extra añejo tequila, 3 year oak barrel aged.', condition: 'New' },
  { name: 'Small Batch Gin', brand: 'VOID BREWING', price: 1.5, image: img('gin1'), category: 'Spirits', feedType: 'beverages', description: 'London dry gin with juniper and citrus botanicals.', condition: 'New' },
  { name: 'Sparkling Water 24-Pack', brand: 'NOIR VINEYARDS', price: 0.2, image: img('sparkling1'), category: 'Water', feedType: 'beverages', description: 'Italian sparkling mineral water, 750ml bottles.', condition: 'New' },
  { name: 'Sake Junmai Daiginjo', brand: 'SHADOW SPIRITS', price: 3.5, image: img('sake1'), category: 'Sake', feedType: 'beverages', description: 'Junmai Daiginjo, polished to 40%, Niigata.', condition: 'New' },
  { name: 'Organic Kombucha Variety', brand: 'DARK ROAST', price: 0.3, image: img('kombucha1'), category: 'Fermented', feedType: 'beverages', description: '6-pack organic kombucha, assorted flavors.', condition: 'New' },

  // Tobacco (8)
  { name: 'Premium Cuban Selection', brand: 'NOIR TOBACCO', price: 8.0, image: img('cigar1'), category: 'Cigars', feedType: 'tobacco', description: 'Box of 10 hand-rolled Cuban cigars, aged 5 years.', condition: 'New' },
  { name: 'Artisan Pipe Tobacco Blend', brand: 'SHADOW SMOKE', price: 1.2, image: img('pipe1'), category: 'Pipe Tobacco', feedType: 'tobacco', description: 'English blend with Latakia and Virginia.', condition: 'New' },
  { name: 'Limited Edition Lighter', brand: 'VOID FLAME', price: 2.5, image: img('lighter1'), category: 'Accessories', feedType: 'tobacco', description: 'Matte black windproof lighter, lifetime warranty.', condition: 'New' },
  { name: 'Briar Wood Pipe', brand: 'SHADOW SMOKE', price: 3.0, image: img('briarpipe1'), category: 'Pipes', feedType: 'tobacco', description: 'Hand-carved Italian briar pipe, bent billiard.', condition: 'Like New' },
  { name: 'Cedar Humidor 50ct', brand: 'NOIR TOBACCO', price: 4.5, image: img('humidor1'), category: 'Storage', feedType: 'tobacco', description: 'Spanish cedar humidor with digital hygrometer.', condition: 'New' },
  { name: 'Torpedo Maduro 5-Pack', brand: 'SHADOW SMOKE', price: 2.0, image: img('maduro1'), category: 'Cigars', feedType: 'tobacco', description: 'Maduro torpedo cigars, medium-full body.', condition: 'New' },
  { name: 'Vintage Cigarette Case', brand: 'VOID FLAME', price: 1.0, image: img('cigcase1'), category: 'Accessories', feedType: 'tobacco', description: 'Art deco style stainless steel cigarette case.', condition: 'Used' },
  { name: 'Aromatic Loose Leaf Blend', brand: 'NOIR TOBACCO', price: 0.8, image: img('looseleaf1'), category: 'Pipe Tobacco', feedType: 'tobacco', description: 'Cherry cavendish aromatic blend, 100g tin.', condition: 'New' },

  // Beauty (8)
  { name: 'Midnight Serum 30ml', brand: 'NOIR BEAUTY', price: 1.8, image: img('serum1'), category: 'Skincare', feedType: 'beauty', description: 'Retinol + niacinamide anti-aging serum.', condition: 'New' },
  { name: 'Charcoal Face Mask Set', brand: 'SHADOW SKIN', price: 0.6, image: img('facemask1'), category: 'Skincare', feedType: 'beauty', description: '10-pack activated charcoal sheet masks.', condition: 'New' },
  { name: 'Obsidian Fragrance EDP', brand: 'VOID SCENT', price: 3.5, image: img('perfume1'), category: 'Fragrance', feedType: 'beauty', description: 'Dark oud, leather, and amber EDP 100ml.', condition: 'New' },
  { name: 'Matte Black Nail Set', brand: 'NOIR BEAUTY', price: 0.4, image: img('nailset1'), category: 'Nails', feedType: 'beauty', description: 'Gel polish kit with UV lamp, 12 shades.', condition: 'New' },
  { name: 'Volcanic Ash Cleanser', brand: 'SHADOW SKIN', price: 0.5, image: img('cleanser1'), category: 'Skincare', feedType: 'beauty', description: 'Jeju volcanic ash deep pore foaming cleanser.', condition: 'New' },
  { name: 'Hair Styling Clay 100ml', brand: 'VOID SCENT', price: 0.3, image: img('hairclay1'), category: 'Hair', feedType: 'beauty', description: 'Matte finish strong hold clay, no shine.', condition: 'New' },
  { name: 'Eye Palette Smoky Edition', brand: 'NOIR BEAUTY', price: 1.2, image: img('eyepalette1'), category: 'Makeup', feedType: 'beauty', description: '16-shade smoky eye palette, matte and shimmer.', condition: 'Like New' },
  { name: 'Luxury Lip Set', brand: 'SHADOW SKIN', price: 0.8, image: img('lipset1'), category: 'Makeup', feedType: 'beauty', description: '4 velvet matte liquid lipsticks, dark tones.', condition: 'New' },

  // Sports (8)
  { name: 'Carbon Road Bike Frame', brand: 'VOID CYCLE', price: 12.0, image: img('bikeframe1'), category: 'Cycling', feedType: 'sports', description: 'Full carbon monocoque frame, 780g, matte black.', size: '56cm', condition: 'New' },
  { name: 'Stealth Boxing Gloves 16oz', brand: 'SHADOW FIGHT', price: 1.0, image: img('boxgloves1'), category: 'Boxing', feedType: 'sports', description: 'Premium leather boxing gloves, triple-density foam.', condition: 'New' },
  { name: 'Titanium Water Bottle 750ml', brand: 'VOID CYCLE', price: 0.4, image: img('waterbottle1'), category: 'Accessories', feedType: 'sports', description: 'Double-wall titanium insulated bottle.', condition: 'New' },
  { name: 'Night Runner Shoes', brand: 'SHADOW STEP', price: 2.0, image: img('runshoes1'), category: 'Running', feedType: 'sports', description: 'Reflective running shoes with carbon plate.', size: '43', condition: 'Like New' },
  { name: 'Resistance Band Set Pro', brand: 'SHADOW FIGHT', price: 0.3, image: img('bands1'), category: 'Fitness', feedType: 'sports', description: '5-band set, 10-50lb, with door anchor.', condition: 'New' },
  { name: 'Yoga Mat Premium 6mm', brand: 'VOID CYCLE', price: 0.5, image: img('yogamat1'), category: 'Yoga', feedType: 'sports', description: 'Natural rubber mat, non-slip, alignment lines.', condition: 'New' },
  { name: 'Hiking Backpack 40L', brand: 'SHADOW FIGHT', price: 1.5, image: img('hiking1'), category: 'Outdoor', feedType: 'sports', description: 'Ultralight hiking pack, rain cover included.', condition: 'New' },
  { name: 'Jump Rope Speed Pro', brand: 'SHADOW FIGHT', price: 0.2, image: img('jumprope1'), category: 'Fitness', feedType: 'sports', description: 'Adjustable steel cable speed rope, ball bearings.', condition: 'New' },

  // Gaming (8)
  { name: 'Limited Edition Controller', brand: 'VOID GAMING', price: 1.2, image: img('controller1'), category: 'Controllers', feedType: 'gaming', description: 'Custom matte black controller, hall effect sticks.', condition: 'New' },
  { name: 'RGB Desk Mat XXL', brand: 'DARK PERIPHERALS', price: 0.5, image: img('deskmat1'), category: 'Accessories', feedType: 'gaming', description: '900x400mm RGB edge-lit desk mat.', condition: 'New' },
  { name: 'Gaming Headset 7.1', brand: 'NOIR AUDIO', price: 1.5, image: img('gamingheadset1'), category: 'Audio', feedType: 'gaming', description: 'Wireless 7.1 surround headset, 50mm drivers.', condition: 'Like New' },
  { name: 'Retro Console Collection', brand: 'VOID GAMING', price: 2.0, image: img('retroconsole1'), category: 'Consoles', feedType: 'gaming', description: 'Multi-system emulator console, 10K+ games.', condition: 'New' },
  { name: 'Streaming Capture Card 4K', brand: 'DARK PERIPHERALS', price: 1.8, image: img('capturecard1'), category: 'Streaming', feedType: 'gaming', description: '4K60 HDR capture card, USB-C passthrough.', condition: 'New' },
  { name: 'Mechanical Keypad Numpad', brand: 'VOID GAMING', price: 0.4, image: img('numpad1'), category: 'Peripherals', feedType: 'gaming', description: 'Programmable macro numpad, hot-swappable.', condition: 'New' },
  { name: 'Gaming Chair Stealth', brand: 'DARK PERIPHERALS', price: 4.0, image: img('gamingchair1'), category: 'Furniture', feedType: 'gaming', description: 'Ergonomic gaming chair, 4D armrests, lumbar.', condition: 'Used' },
  { name: 'Collectible Figurine Set', brand: 'VOID GAMING', price: 0.8, image: img('figurine1'), category: 'Collectibles', feedType: 'gaming', description: 'Limited edition 6-piece character figurine set.', condition: 'New' },

  // Home Living (8)
  { name: 'Matte Black Kettle', brand: 'NOIR HOME', price: 0.6, image: img('kettle1'), category: 'Kitchen', feedType: 'homeLiving', description: 'Temperature control gooseneck kettle, 1L.', condition: 'New' },
  { name: 'Ambient LED Light Panel', brand: 'SHADOW LIVING', price: 1.2, image: img('ledpanel1'), category: 'Lighting', feedType: 'homeLiving', description: 'Modular hexagonal LED panels, 9-pack, smart app.', condition: 'New' },
  { name: 'Concrete Desk Organizer', brand: 'NOIR HOME', price: 0.3, image: img('deskorg1'), category: 'Office', feedType: 'homeLiving', description: 'Minimalist concrete desk organizer, 5 compartments.', condition: 'New' },
  { name: 'Blackout Curtains Set', brand: 'SHADOW LIVING', price: 0.8, image: img('curtains1'), category: 'Decor', feedType: 'homeLiving', description: '100% blackout thermal curtains, 2 panels.', condition: 'New' },
  { name: 'Cast Iron Dutch Oven', brand: 'NOIR HOME', price: 1.5, image: img('dutchoven1'), category: 'Kitchen', feedType: 'homeLiving', description: 'Enameled cast iron 6qt dutch oven, matte black.', condition: 'Like New' },
  { name: 'Wireless Aroma Diffuser', brand: 'SHADOW LIVING', price: 0.4, image: img('diffuser1'), category: 'Wellness', feedType: 'homeLiving', description: 'Rechargeable ultrasonic diffuser, 300ml.', condition: 'New' },
  { name: 'Linen Bedding Set Queen', brand: 'NOIR HOME', price: 2.0, image: img('bedding1'), category: 'Bedding', feedType: 'homeLiving', description: 'Stonewashed French linen, charcoal.', condition: 'New' },
  { name: 'Minimalist Wall Clock', brand: 'SHADOW LIVING', price: 0.5, image: img('clock1'), category: 'Decor', feedType: 'homeLiving', description: 'Silent sweep 12" wall clock, matte black.', condition: 'New' },

  // Collectibles (10)
  { name: 'Obsidian Chain', brand: 'VOID JEWELRY', price: 5.2, image: img('chain1'), category: 'Jewelry', feedType: 'collectibles', description: 'Matte black titanium chain with onyx pendant.', condition: 'New' },
  { name: 'Spectre Beanie', brand: 'DARK FOREST', price: 0.5, image: img('beanie1'), category: 'Accessories', feedType: 'collectibles', description: 'Merino wool beanie with embroidered sigil.', condition: 'New' },
  { name: 'Vintage Vinyl Box Set', brand: 'NOIR RECORDS', price: 4.0, image: img('vinyl1'), category: 'Music', feedType: 'collectibles', description: '5-LP box set, limited numbered edition, 180g vinyl.', condition: 'New' },
  { name: 'Art Print Series 001', brand: 'SHADOW GALLERY', price: 1.5, image: img('artprint1'), category: 'Art', feedType: 'collectibles', description: 'Signed giclée print, 18x24", edition of 50.', condition: 'New' },
  { name: 'Mechanical Pocket Watch', brand: 'VOID JEWELRY', price: 3.5, image: img('pocketwatch1'), category: 'Watches', feedType: 'collectibles', description: 'Hand-wound skeleton pocket watch, gunmetal.', condition: 'Like New' },
  { name: 'First Edition Sci-Fi Novel', brand: 'NOIR RECORDS', price: 2.8, image: img('book1'), category: 'Books', feedType: 'collectibles', description: 'Rare first edition with dust jacket, VG+ condition.', condition: 'Used' },
  { name: 'Enamel Pin Collection', brand: 'SHADOW GALLERY', price: 0.3, image: img('pins1'), category: 'Pins', feedType: 'collectibles', description: 'Set of 12 limited edition dark-theme enamel pins.', condition: 'New' },
  { name: 'Crystal Chess Set', brand: 'VOID JEWELRY', price: 6.0, image: img('chess1'), category: 'Games', feedType: 'collectibles', description: 'Handcrafted smoky quartz and obsidian chess set.', condition: 'New' },
  { name: 'Antique Compass', brand: 'SHADOW GALLERY', price: 1.8, image: img('compass1'), category: 'Antiques', feedType: 'collectibles', description: 'Brass maritime compass, circa 1920s, working.', condition: 'Used' },
  { name: 'Signed Movie Poster', brand: 'NOIR RECORDS', price: 2.2, image: img('poster1'), category: 'Memorabilia', feedType: 'collectibles', description: 'Original theatrical poster, signed by director.', condition: 'Like New' },
]

// Deterministic seed for consistent generation
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

let _mockProducts: Product[] | null = null

export function getMockProducts(): Product[] {
  if (_mockProducts) return _mockProducts
  _mockProducts = productData.map((p, i) => {
    const seed = i + 1
    const sellerIdx = Math.floor(seededRandom(seed) * sellers.length)
    const shipCountryIdx = Math.floor(seededRandom(seed + 100) * countries.length)
    const shipFrom = countries[shipCountryIdx]

    return {
      ...p,
      id: String(i + 1),
      seller: sellers[sellerIdx],
      listedAt: hoursAgo(Math.floor(seededRandom(seed + 200) * 168) + 1),
      sellerReputation: 70 + Math.floor(seededRandom(seed + 300) * 25),
      qualityScore: 70 + Math.floor(seededRandom(seed + 400) * 28),
      shipFromCountry: shipFrom,
      deliverableCountries: deliverable(shipFrom),
    }
  })
  return _mockProducts
}
