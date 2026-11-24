/**
 * Business facts in one place. Rename the brand, change the phone number or
 * the delivery area here and every page follows.
 */
export const site = {
  name: "Ksheera",
  legalName: "Ksheera Dairy Farms",
  tagline: "Milked at four. At your door by six.",
  description:
    "Fresh A2 milk and dairy from our own pasture near Kanchipuram, delivered across Chennai before sunrise. Order once or subscribe, pause any day, and let our AI assistant help along the way.",
  farm: "Walajabad, Kanchipuram district",
  city: "Chennai",
  phone: { display: "+91 98765 43210", tel: "+919876543210" },
  email: "hello@ksheera.example",
  hours: "Deliveries 5:30 to 7:30 AM, every day of the year",
  freeDeliveryAbove: 299,
  deliveryFee: 25,
  orderCutoff: "10 PM",
  stats: [
    { value: "140", label: "Gir and Sahiwal cows on open pasture" },
    { value: "4°C", label: "within 20 minutes of milking" },
    { value: "2 hrs", label: "from udder to your doorstep" },
    { value: "12", label: "quality checks on every batch" },
  ],
} as const;

export type NavItem = { href: string; label: string };

export const mainNav: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/subscribe", label: "Subscriptions" },
  { href: "/farm", label: "Our farm" },
  { href: "/project", label: "About the project" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Shop",
    items: [
      { href: "/shop?c=milk", label: "Milk" },
      { href: "/shop?c=curd", label: "Curd and buttermilk" },
      { href: "/shop?c=paneer", label: "Paneer and cheese" },
      { href: "/shop?c=butter", label: "Butter and ghee" },
      { href: "/shop?c=treats", label: "Lassi, shakes, ice cream" },
    ],
  },
  {
    title: "Your account",
    items: [
      { href: "/subscribe", label: "Start a subscription" },
      { href: "/account", label: "My orders" },
      { href: "/account?tab=subscriptions", label: "Pause or change deliveries" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Ksheera",
    items: [
      { href: "/farm", label: "From pasture to pour" },
      { href: "/project", label: "Project overview" },
      { href: "/admin", label: "Admin dashboard" },
      { href: "/delivery", label: "Delivery partner app" },
    ],
  },
];
