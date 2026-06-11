// Nonprofit / community imagery (Unsplash hotlinks — free to use, no API key).
// Every <Photo> using these falls back to a gradient if a host is unreachable,
// so the UI never renders broken.
const U = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  community: U("1488521787991-ed7bbaae773c"),
  volunteers: U("1559027615-cd4628902d4a"),
  hands: U("1593113598332-cd288d649433"),
  teaching: U("1497633762265-9d179a990aa6"),
  children: U("1542810634-71277d95dcbb"),
  planting: U("1469474968028-56623f02e42e"),
  meeting: U("1522071820081-009f0129c71c"),
  outreach: U("1532629345422-7515f3d16bb6"),
  hero: U("1488521787991-ed7bbaae773c", 1400),
  auth: U("1559027615-cd4628902d4a", 1200),
};

export const GALLERY = [
  { src: IMAGES.volunteers, alt: "Volunteers working together", tag: "Volunteering" },
  { src: IMAGES.teaching, alt: "A facilitator leading a workshop", tag: "Capacity building" },
  { src: IMAGES.children, alt: "Children in a learning program", tag: "Education" },
  { src: IMAGES.planting, alt: "Community planting trees", tag: "Environment" },
  { src: IMAGES.meeting, alt: "A community planning meeting", tag: "Strategy" },
  { src: IMAGES.outreach, alt: "Field outreach in the community", tag: "Outreach" },
];
