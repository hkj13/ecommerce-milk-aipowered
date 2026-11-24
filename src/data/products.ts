export type CategoryId = "milk" | "curd" | "paneer" | "butter" | "cream" | "treats";

export const CATEGORIES: { id: CategoryId; label: string; blurb: string }[] = [
  { id: "milk", label: "Milk", blurb: "A2 cow, toned and buffalo, in returnable glass" },
  { id: "curd", label: "Curd and buttermilk", blurb: "Set overnight in clay, churned at dawn" },
  { id: "paneer", label: "Paneer and cheese", blurb: "Pressed the same morning" },
  { id: "butter", label: "Butter and ghee", blurb: "Cultured, hand-churned, slow-simmered" },
  { id: "cream", label: "Cream", blurb: "Skimmed off the top, nothing added" },
  { id: "treats", label: "Lassi, shakes, ice cream", blurb: "For the afternoon" },
];

export type Variant = { id: string; label: string; price: number; mrp?: number };

export type Product = {
  slug: string;
  name: string;
  short: string;
  description: string;
  category: CategoryId;
  /** Photo in /public/photos, or null when the product is drawn in code. */
  photo: string | null;
  /** Object-position for the photo crop. */
  focus?: string;
  art?: "ghee";
  variants: Variant[];
  /** Can be put on a daily / weekly / monthly subscription. */
  subscribable: boolean;
  tags: string[];
  source: string;
  shelfLife: string;
  storage: string;
  nutrition: { label: string; value: string }[];
  nutritionBasis: string;
  /** Opening stock (units across all sizes). Admin edits live in the browser store. */
  stock: number;
  /** Days until the current batch expires. */
  expiresInDays: number;
  rating: number;
  /** Soft background tint used behind the product. */
  tint: string;
};

export const products: Product[] = [
  {
    slug: "a2-desi-cow-milk",
    name: "A2 Desi Cow Milk",
    short: "Gir and Sahiwal milk, in glass, never homogenised.",
    description:
      "Milk from our own Gir and Sahiwal cows, who carry only the A2 beta-casein. It is chilled to 4°C within twenty minutes of milking, tested, and bottled in glass the same morning. Unhomogenised, so a layer of cream rises to the top. Shake gently, or skim it for your coffee.",
    category: "milk",
    photo: "/photos/p-a2-milk.jpg",
    focus: "50% 60%",
    variants: [
      { id: "500ml", label: "500 ml bottle", price: 48 },
      { id: "1l", label: "1 litre bottle", price: 92, mrp: 96 },
    ],
    subscribable: true,
    tags: ["A2", "Bestseller", "Glass bottle"],
    source: "Ksheera farm, Walajabad",
    shelfLife: "3 days refrigerated",
    storage: "Keep at 4°C. Boil before use if you prefer.",
    nutrition: [
      { label: "Energy", value: "67 kcal" },
      { label: "Fat", value: "4.1 g" },
      { label: "Protein", value: "3.3 g" },
      { label: "Carbohydrate", value: "4.8 g" },
      { label: "Calcium", value: "121 mg" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 420,
    expiresInDays: 3,
    rating: 4.8,
    tint: "#efe8d8",
  },
  {
    slug: "farm-toned-milk",
    name: "Farm Toned Milk",
    short: "Lighter, 3% fat. The everyday coffee and tea milk.",
    description:
      "Our whole milk, standardised to 3% fat for those who drink a lot of it. Same farm, same morning, same twelve checks. Ideal for filter coffee, tea and growing families who go through a few litres a day.",
    category: "milk",
    photo: "/photos/p-toned-milk.jpg",
    focus: "50% 55%",
    variants: [
      { id: "500ml", label: "500 ml bottle", price: 30 },
      { id: "1l", label: "1 litre bottle", price: 58 },
    ],
    subscribable: true,
    tags: ["Everyday", "Glass bottle"],
    source: "Ksheera farm, Walajabad",
    shelfLife: "3 days refrigerated",
    storage: "Keep at 4°C.",
    nutrition: [
      { label: "Energy", value: "58 kcal" },
      { label: "Fat", value: "3.0 g" },
      { label: "Protein", value: "3.1 g" },
      { label: "Carbohydrate", value: "4.7 g" },
      { label: "Calcium", value: "118 mg" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 380,
    expiresInDays: 3,
    rating: 4.6,
    tint: "#eef0ea",
  },
  {
    slug: "buffalo-milk",
    name: "Full Cream Buffalo Milk",
    short: "Thick, 6.5% fat. Made for curd, payasam and paneer.",
    description:
      "Rich Murrah buffalo milk from two partner farms beside ours, collected in our own chilled cans. Thick enough to set a firm curd overnight and the milk grandmothers ask for when making payasam.",
    category: "milk",
    photo: "/photos/p-buffalo-milk.jpg",
    focus: "50% 55%",
    variants: [
      { id: "500ml", label: "500 ml bottle", price: 42 },
      { id: "1l", label: "1 litre bottle", price: 80 },
    ],
    subscribable: true,
    tags: ["Rich", "Glass bottle"],
    source: "Partner farms, Walajabad",
    shelfLife: "2 days refrigerated",
    storage: "Keep at 4°C. Boil before use.",
    nutrition: [
      { label: "Energy", value: "97 kcal" },
      { label: "Fat", value: "6.5 g" },
      { label: "Protein", value: "3.8 g" },
      { label: "Carbohydrate", value: "5.0 g" },
      { label: "Calcium", value: "169 mg" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 160,
    expiresInDays: 2,
    rating: 4.7,
    tint: "#f1ebdf",
  },
  {
    slug: "clay-pot-curd",
    name: "Clay Pot Curd",
    short: "Set overnight in terracotta. Thick enough to cut.",
    description:
      "Whole milk set with our own culture in unglazed clay pots that draw out the whey, so the curd sets thick and mildly sweet. Return the pot with your next delivery, or keep it for the garden.",
    category: "curd",
    photo: "/photos/p-curd.jpg",
    focus: "50% 45%",
    variants: [
      { id: "400g", label: "400 g clay pot", price: 55 },
      { id: "1kg", label: "1 kg clay pot", price: 120 },
    ],
    subscribable: true,
    tags: ["Bestseller", "Clay pot"],
    source: "Ksheera dairy kitchen",
    shelfLife: "4 days refrigerated",
    storage: "Keep at 4°C. Tastes sourer each day.",
    nutrition: [
      { label: "Energy", value: "72 kcal" },
      { label: "Fat", value: "4.0 g" },
      { label: "Protein", value: "3.5 g" },
      { label: "Carbohydrate", value: "5.2 g" },
      { label: "Live cultures", value: "Yes" },
    ],
    nutritionBasis: "per 100 g",
    stock: 210,
    expiresInDays: 4,
    rating: 4.9,
    tint: "#f0e6da",
  },
  {
    slug: "neer-mor",
    name: "Spiced Buttermilk (Neer Mor)",
    short: "Curry leaf, ginger, green chilli and a pinch of hing.",
    description:
      "The buttermilk left after we churn butter, thinned and spiced the way it is served at every Tamil wedding: curry leaves, crushed ginger, green chilli, coriander and asafoetida. Best ice-cold at 3 PM.",
    category: "curd",
    photo: "/photos/p-buttermilk.jpg",
    focus: "50% 50%",
    variants: [
      { id: "200ml", label: "200 ml bottle", price: 18 },
      { id: "1l", label: "1 litre bottle", price: 60 },
    ],
    subscribable: true,
    tags: ["Summer favourite"],
    source: "Ksheera dairy kitchen",
    shelfLife: "3 days refrigerated",
    storage: "Keep at 4°C. Shake before pouring.",
    nutrition: [
      { label: "Energy", value: "22 kcal" },
      { label: "Fat", value: "0.8 g" },
      { label: "Protein", value: "1.4 g" },
      { label: "Carbohydrate", value: "2.3 g" },
      { label: "Sodium", value: "180 mg" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 300,
    expiresInDays: 3,
    rating: 4.6,
    tint: "#eceee4",
  },
  {
    slug: "malai-paneer",
    name: "Malai Paneer",
    short: "Pressed at 6 AM. Soft enough to crumble, firm enough to grill.",
    description:
      "Whole milk split with lemon and pressed in muslin the same morning it reaches you. No starch, no preservatives. It holds together on a tikka skewer and melts into a palak.",
    category: "paneer",
    photo: "/photos/p-paneer.jpg",
    focus: "50% 50%",
    variants: [
      { id: "200g", label: "200 g block", price: 95 },
      { id: "500g", label: "500 g block", price: 220 },
    ],
    subscribable: false,
    tags: ["Fresh daily"],
    source: "Ksheera dairy kitchen",
    shelfLife: "3 days refrigerated",
    storage: "Keep in water, refrigerated. Change the water daily.",
    nutrition: [
      { label: "Energy", value: "265 kcal" },
      { label: "Fat", value: "20 g" },
      { label: "Protein", value: "18 g" },
      { label: "Carbohydrate", value: "1.2 g" },
      { label: "Calcium", value: "208 mg" },
    ],
    nutritionBasis: "per 100 g",
    stock: 85,
    expiresInDays: 3,
    rating: 4.8,
    tint: "#f2e7d3",
  },
  {
    slug: "cultured-butter",
    name: "Cultured Butter",
    short: "Churned from ripened cream. Lightly salted.",
    description:
      "Cream ripened overnight with live culture, then churned slowly until it breaks. The result tastes faintly of curd and sunlight. Lightly salted with sea salt from Marakkanam.",
    category: "butter",
    photo: "/photos/p-butter.jpg",
    focus: "50% 55%",
    variants: [
      { id: "100g", label: "100 g", price: 65 },
      { id: "250g", label: "250 g", price: 150 },
    ],
    subscribable: false,
    tags: ["Small batch"],
    source: "Ksheera dairy kitchen",
    shelfLife: "21 days refrigerated",
    storage: "Keep refrigerated. Soften 10 minutes before use.",
    nutrition: [
      { label: "Energy", value: "720 kcal" },
      { label: "Fat", value: "81 g" },
      { label: "Protein", value: "0.7 g" },
      { label: "Carbohydrate", value: "0.6 g" },
      { label: "Salt", value: "1.2 g" },
    ],
    nutritionBasis: "per 100 g",
    stock: 120,
    expiresInDays: 18,
    rating: 4.7,
    tint: "#f4ebcf",
  },
  {
    slug: "a2-bilona-ghee",
    name: "A2 Bilona Ghee",
    short: "Hand-churned from curd, simmered over a wood fire.",
    description:
      "The slow way: A2 milk set into curd, churned with a wooden bilona into butter, then simmered over a wood fire until the solids turn golden and the ghee smells of toasted grain. Granular, nutty, and worth the wait. 25 litres of milk for every litre of ghee.",
    category: "butter",
    photo: null,
    art: "ghee",
    variants: [
      { id: "250ml", label: "250 ml glass jar", price: 420 },
      { id: "500ml", label: "500 ml glass jar", price: 799, mrp: 840 },
    ],
    subscribable: false,
    tags: ["A2", "Bilona", "Small batch"],
    source: "Ksheera farm, Walajabad",
    shelfLife: "9 months at room temperature",
    storage: "Keep the lid closed and use a dry spoon.",
    nutrition: [
      { label: "Energy", value: "897 kcal" },
      { label: "Fat", value: "99.7 g" },
      { label: "Saturated fat", value: "62 g" },
      { label: "Vitamin A", value: "840 µg" },
      { label: "Moisture", value: "under 0.3%" },
    ],
    nutritionBasis: "per 100 g",
    stock: 64,
    expiresInDays: 270,
    rating: 4.9,
    tint: "#f3e2b8",
  },
  {
    slug: "fresh-malai",
    name: "Fresh Malai Cream",
    short: "The cream off the top, 35% fat, nothing added.",
    description:
      "Skimmed from the morning milk and bottled straight away. Whip it, fold it into a gravy, or spoon it onto warm rotis with sugar the way children do.",
    category: "cream",
    photo: "/photos/p-cream.jpg",
    focus: "50% 50%",
    variants: [{ id: "200ml", label: "200 ml jar", price: 70 }],
    subscribable: false,
    tags: ["No additives"],
    source: "Ksheera dairy kitchen",
    shelfLife: "5 days refrigerated",
    storage: "Keep at 4°C.",
    nutrition: [
      { label: "Energy", value: "337 kcal" },
      { label: "Fat", value: "35 g" },
      { label: "Protein", value: "2.1 g" },
      { label: "Carbohydrate", value: "2.9 g" },
      { label: "Calcium", value: "65 mg" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 70,
    expiresInDays: 5,
    rating: 4.5,
    tint: "#efece6",
  },
  {
    slug: "mango-lassi",
    name: "Alphonso Mango Lassi",
    short: "Our curd, Ratnagiri Alphonso pulp, a little jaggery.",
    description:
      "Thick curd whisked with Alphonso pulp and sweetened with palm jaggery instead of sugar. Sold cold in glass. A grown-up mango milkshake.",
    category: "treats",
    photo: "/photos/p-lassi.jpg",
    focus: "50% 40%",
    variants: [
      { id: "200ml", label: "200 ml bottle", price: 45 },
      { id: "4x200ml", label: "Pack of 4", price: 170 },
    ],
    subscribable: false,
    tags: ["Seasonal"],
    source: "Ksheera dairy kitchen",
    shelfLife: "4 days refrigerated",
    storage: "Keep at 4°C. Shake well.",
    nutrition: [
      { label: "Energy", value: "112 kcal" },
      { label: "Fat", value: "3.2 g" },
      { label: "Protein", value: "3.0 g" },
      { label: "Carbohydrate", value: "17 g" },
      { label: "Added sugar", value: "6 g (jaggery)" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 140,
    expiresInDays: 4,
    rating: 4.7,
    tint: "#f6e6c9",
  },
  {
    slug: "cocoa-milkshake",
    name: "Cocoa Malt Milkshake",
    short: "Whole milk, dark cocoa and malt. A treat, not a habit.",
    description:
      "Our whole milk shaken with single-origin cocoa from Idukki and barley malt. Less sweet than the shop kind and much thicker.",
    category: "treats",
    photo: "/photos/p-milkshake.jpg",
    focus: "50% 45%",
    variants: [
      { id: "200ml", label: "200 ml bottle", price: 55 },
      { id: "4x200ml", label: "Pack of 4", price: 205 },
    ],
    subscribable: false,
    tags: ["Kids' favourite"],
    source: "Ksheera dairy kitchen",
    shelfLife: "5 days refrigerated",
    storage: "Keep at 4°C. Shake well.",
    nutrition: [
      { label: "Energy", value: "128 kcal" },
      { label: "Fat", value: "4.2 g" },
      { label: "Protein", value: "3.6 g" },
      { label: "Carbohydrate", value: "19 g" },
      { label: "Added sugar", value: "9 g" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 96,
    expiresInDays: 5,
    rating: 4.4,
    tint: "#ece1d6",
  },
  {
    slug: "strawberry-yogurt",
    name: "Strawberry Yogurt Cups",
    short: "Set yogurt over Mahabaleshwar strawberry compote.",
    description:
      "Thick set yogurt over a layer of strawberry compote cooked with a little cane sugar. Four cups, perfect for lunch boxes.",
    category: "curd",
    photo: "/photos/p-fruit-yogurt.jpg",
    focus: "50% 45%",
    variants: [{ id: "4x100g", label: "4 cups × 100 g", price: 140 }],
    subscribable: false,
    tags: ["New"],
    source: "Ksheera dairy kitchen",
    shelfLife: "7 days refrigerated",
    storage: "Keep at 4°C.",
    nutrition: [
      { label: "Energy", value: "98 kcal" },
      { label: "Fat", value: "3.1 g" },
      { label: "Protein", value: "3.4 g" },
      { label: "Carbohydrate", value: "14 g" },
      { label: "Live cultures", value: "Yes" },
    ],
    nutritionBasis: "per 100 g",
    stock: 12,
    expiresInDays: 6,
    rating: 4.5,
    tint: "#f4e4e2",
  },
  {
    slug: "farmhouse-cheese",
    name: "Farmhouse Cheese",
    short: "A mild, nutty cow's milk cheese aged 60 days.",
    description:
      "A small experiment that became a favourite: an alpine-style cheese made from our A2 milk and aged for sixty days in the farm's cool room. Mild, nutty, and very good on dosa.",
    category: "paneer",
    photo: "/photos/p-cheese.jpg",
    focus: "50% 55%",
    variants: [{ id: "200g", label: "200 g wedge", price: 260 }],
    subscribable: false,
    tags: ["Aged 60 days"],
    source: "Ksheera farm cool room",
    shelfLife: "30 days refrigerated",
    storage: "Wrap in paper, refrigerate.",
    nutrition: [
      { label: "Energy", value: "380 kcal" },
      { label: "Fat", value: "30 g" },
      { label: "Protein", value: "26 g" },
      { label: "Carbohydrate", value: "0.5 g" },
      { label: "Calcium", value: "720 mg" },
    ],
    nutritionBasis: "per 100 g",
    stock: 0,
    expiresInDays: 28,
    rating: 4.6,
    tint: "#f1e8cf",
  },
  {
    slug: "malai-ice-cream",
    name: "Strawberry Malai Ice Cream",
    short: "Slow-churned from our cream. Real strawberries, no gums.",
    description:
      "Fresh malai, whole milk, cane sugar and strawberries, churned slowly in small batches. No stabilisers, so it melts like ice cream used to.",
    category: "treats",
    photo: "/photos/p-ice-cream.jpg",
    focus: "50% 35%",
    variants: [{ id: "500ml", label: "500 ml tub", price: 180 }],
    subscribable: false,
    tags: ["Weekend treat"],
    source: "Ksheera dairy kitchen",
    shelfLife: "3 months frozen",
    storage: "Keep frozen at -18°C.",
    nutrition: [
      { label: "Energy", value: "210 kcal" },
      { label: "Fat", value: "11 g" },
      { label: "Protein", value: "3.5 g" },
      { label: "Carbohydrate", value: "24 g" },
      { label: "Added sugar", value: "18 g" },
    ],
    nutritionBasis: "per 100 ml",
    stock: 44,
    expiresInDays: 90,
    rating: 4.6,
    tint: "#f5e3e3",
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

/** Milk products (used by the subscription builder and the demand forecast). */
export const MILK_SLUGS = products.filter((p) => p.category === "milk").map((p) => p.slug);
