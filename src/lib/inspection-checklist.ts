export interface ChecklistItem {
  item: string;
  isOutOfService?: boolean;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export const PRE_TRIP_CHECKLIST: ChecklistCategory[] = [
  {
    category: "ENGINE",
    items: [
      { item: "Oil level OK" },
      { item: "Coolant MIN–MAX" },
      { item: "No leaks" },
      { item: "Belts OK" },
      { item: "Hoses OK" },
    ],
  },
  {
    category: "LIGHTS",
    items: [
      { item: "Headlights" },
      { item: "Signals" },
      { item: "Hazards" },
      { item: "Clearance" },
      { item: "Wipers/Washer" },
    ],
  },
  {
    category: "BRAKES",
    items: [
      { item: "Air 100–125 PSI" },
      { item: "No leaks" },
      { item: "Low air ~60 PSI" },
      { item: "Parking brake" },
      { item: "Slack ≤1 inch" },
    ],
  },
  {
    category: "TIRES",
    items: [
      { item: "100–110 PSI" },
      { item: "No damage" },
      { item: "Tread OK" },
      { item: "Lugs tight" },
      { item: "Rims OK" },
    ],
  },
  {
    category: "SUSPENSION",
    items: [
      { item: "Leaf springs" },
      { item: "Shocks" },
      { item: "U-bolts" },
    ],
  },
  {
    category: "DUMP BODY",
    items: [
      { item: "Hydraulics" },
      { item: "Bed works" },
      { item: "Tailgate" },
      { item: "Latch" },
    ],
  },
  {
    category: "CAB",
    items: [
      { item: "Horn" },
      { item: "Mirrors" },
      { item: "Seatbelt" },
      { item: "Oil 20–60 PSI" },
      { item: "Temp 180–210F" },
      { item: "Air 100–125 PSI" },
    ],
  },
  {
    category: "FUNCTION",
    items: [
      { item: "Service brake" },
      { item: "Parking brake" },
      { item: "Steering" },
    ],
  },
  {
    category: "OUT-OF-SERVICE",
    items: [
      { item: "Brake failure", isOutOfService: true },
      { item: "Air failure", isOutOfService: true },
      { item: "Steering issue", isOutOfService: true },
      { item: "Leaks", isOutOfService: true },
      { item: "Tire damage", isOutOfService: true },
      { item: "Frame crack", isOutOfService: true },
    ],
  },
];

export const POST_TRIP_CHECKLIST: ChecklistCategory[] = [
  {
    category: "POST-TRIP",
    items: [
      { item: "Check leaks" },
      { item: "Inspect tires" },
      { item: "Check brakes" },
      { item: "Clean bed" },
      { item: "Lower bed" },
      { item: "Check fluids" },
      { item: "DVIR" },
      { item: "Report issues" },
      { item: "Fuel/DEF" },
    ],
  },
  {
    category: "OUT-OF-SERVICE",
    items: [
      { item: "Brake failure", isOutOfService: true },
      { item: "Air failure", isOutOfService: true },
      { item: "Steering issue", isOutOfService: true },
      { item: "Leaks", isOutOfService: true },
      { item: "Tire damage", isOutOfService: true },
      { item: "Frame crack", isOutOfService: true },
    ],
  },
];
