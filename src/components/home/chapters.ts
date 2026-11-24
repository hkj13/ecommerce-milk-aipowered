import type { ShapeId } from "./shapes";

export type Chapter = {
  id: string;
  time: string;
  label: string;
  headline: string;
  em?: string;
  body: string;
  shape: ShapeId;
  photo?: { src: string; alt: string; caption: string; focus?: string };
  ai?: string;
  /** Sky: top, middle, glow colours; star visibility; hills colour. */
  sky: [string, string, string];
  stars: number;
  hills: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "four",
    time: "04:00",
    label: "Walajabad",
    headline: "Milked at four.",
    em: "At your door by six.",
    body: "Fresh A2 milk and dairy from our own pasture near Kanchipuram, bottled in glass and on your doorstep across Chennai before the city wakes. Order once, or subscribe and forget about it.",
    shape: "drop",
    sky: ["#0a101e", "#111a2f", "#1c2645"],
    stars: 1,
    hills: "#060a12",
  },
  {
    id: "herd",
    time: "04:15",
    label: "The herd",
    headline: "The herd wakes before",
    em: "the city does.",
    body: "One hundred and forty Gir and Sahiwal cows, Indian breeds that give A2 milk, spend their days on open pasture and their nights in airy sheds with sand bedding. No hormones, no shortcuts, and every calf gets its share first.",
    shape: "cow",
    photo: { src: "/photos/calf-dark.jpg", alt: "A young calf looking out from a dark shed", caption: "Morning rounds in the calf shed", focus: "50% 35%" },
    sky: ["#0c1323", "#152038", "#263254"],
    stars: 0.9,
    hills: "#070c16",
  },
  {
    id: "milking",
    time: "04:40",
    label: "Milking",
    headline: "Milk that never",
    em: "meets the air.",
    body: "Each cow is milked through a closed steel line straight into sealed cans. Nobody's hands touch the milk, and every can is weighed and logged against the cow it came from.",
    shape: "can",
    photo: { src: "/photos/milk-pour.jpg", alt: "Fresh milk being poured from a jug into a glass", caption: "Every can is logged by cow and by shift", focus: "50% 40%" },
    sky: ["#101a2f", "#1b2949", "#33416a"],
    stars: 0.75,
    hills: "#0a1019",
  },
  {
    id: "chill",
    time: "05:00",
    label: "Chilling",
    headline: "Cold within",
    em: "twenty minutes.",
    body: "Warm milk spoils fast. Ours is in the bulk chiller and down to 4°C within twenty minutes of milking, and it stays at 4°C in insulated crates all the way to your door.",
    shape: "chill",
    photo: { src: "/photos/milk-splash.jpg", alt: "Milk splashing out of a glass against a black background", caption: "Held at 4°C from chiller to doorstep", focus: "50% 40%" },
    sky: ["#15203b", "#25365d", "#495583"],
    stars: 0.55,
    hills: "#0c131f",
  },
  {
    id: "tested",
    time: "05:10",
    label: "Testing",
    headline: "Twelve checks,",
    em: "every batch.",
    body: "Fat, SNF, acidity, temperature, bacterial count and adulterant strips. Every reading is recorded, and our quality monitor flags anything unusual for a re-test. A person always makes the final call.",
    shape: "flask",
    ai: "AI quality monitoring",
    photo: { src: "/photos/lab-microscope.jpg", alt: "A technician at a microscope in a dairy lab", caption: "The farm lab, 5 AM shift", focus: "50% 30%" },
    sky: ["#1e2a4c", "#384476", "#6c6894"],
    stars: 0.35,
    hills: "#111a29",
  },
  {
    id: "bottled",
    time: "05:25",
    label: "Bottling",
    headline: "Into glass,",
    em: "never plastic.",
    body: "Washed and sterilised glass bottles, filled and sealed with today's date. Rinse them and leave them out tomorrow: each bottle makes about thirty trips before it retires.",
    shape: "bottle",
    photo: { src: "/photos/bottling-line.jpg", alt: "A row of glass milk bottles on a bottling line", caption: "Filled, capped and dated by 5:25", focus: "50% 50%" },
    sky: ["#2b335e", "#565889", "#b48993"],
    stars: 0.15,
    hills: "#1a2233",
  },
  {
    id: "route",
    time: "05:40",
    label: "On the road",
    headline: "The route was planned",
    em: "while you slept.",
    body: "Orders close at 10 PM. Overnight, our route planner sorts every address into the shortest loop, so Ravi, Senthil and Arun leave the city hub at 5:30 with the crates already in delivery order.",
    shape: "route",
    ai: "AI route optimisation",
    photo: { src: "/photos/delivery-scooter.jpg", alt: "A delivery rider on a scooter in early morning traffic", caption: "Eleven stops, one loop, no backtracking", focus: "60% 50%" },
    sky: ["#383865", "#7a6487", "#f0a47c"],
    stars: 0,
    hills: "#2a2c3d",
  },
  {
    id: "door",
    time: "06:15",
    label: "Your door",
    headline: "Before your",
    em: "first coffee.",
    body: "A gentle knock, or a quiet bottle on the step if you'd rather sleep in. Pause, skip or change tomorrow's delivery any time until 10 PM tonight.",
    shape: "glass",
    photo: { src: "/photos/milk-cookies.jpg", alt: "A jar of fresh milk with cookies on a wooden table", caption: "Breakfast, sorted", focus: "50% 50%" },
    sky: ["#efe4cf", "#f6ecd9", "#f6d6a2"],
    stars: 0,
    hills: "#cfd8b8",
  },
];
