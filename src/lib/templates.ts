export interface MarketTemplate {
  label: string;
  question: string;
}

export interface TemplateCategory {
  name: string;
  emoji: string;
  templates: MarketTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: "Meeting Chaos",
    emoji: "\u{1F4A5}",
    templates: [
      { label: "Late Larry", question: "Will someone join late?" },
      { label: "Overtime", question: "Will this meeting run over?" },
      { label: "Mute Fail", question: "Will someone talk on mute?" },
      { label: "Wrong Screen", question: "Will someone share the wrong screen?" },
      { label: "Awkward Silence", question: "Will there be an awkward silence > 5 seconds?" },
      { label: "Internet Down", question: "Will someone's internet cut out?" },
      { label: "Early Exit", question: "Will someone leave early?" },
    ],
  },
  {
    name: "People",
    emoji: "\u{1F465}",
    templates: [
      { label: "Camera Shy", question: "Will someone turn their camera off?" },
      { label: "Pet Cameo", question: "Will a pet appear on camera?" },
      { label: "Kid Cameo", question: "Will a child appear on camera?" },
      { label: "Double Booked", question: "Will someone mention another meeting?" },
      { label: "Hot Take", question: "Will someone drop a hot take?" },
    ],
  },
  {
    name: "Content",
    emoji: "\u{1F4AC}",
    templates: [
      { label: "Synergy!", question: 'Will someone say "synergy"?' },
      { label: "Per My Email", question: 'Will someone say "per my last email"?' },
      { label: "Action Items", question: "Will action items actually be assigned?" },
      { label: "Next Slide", question: 'Will the presenter say "next slide please"?' },
      { label: "Circle Back", question: 'Will someone say "let\'s circle back"?' },
    ],
  },
];

export const MARKET_TEMPLATES = TEMPLATE_CATEGORIES.flatMap((c) => c.templates);
