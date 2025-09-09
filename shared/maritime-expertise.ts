// Maritime Workshop Expertise Categories and Classification Societies
// International system for maritime workshop service providers

export interface MaritimeExpertiseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ClassificationSociety {
  id: string;
  name: string;
  fullName: string;
  country: string;
  flag: string;
}

// 12 Core Maritime Workshop Expertise Categories
export const MARITIME_EXPERTISE_CATEGORIES: MaritimeExpertiseCategory[] = [
  {
    id: "marine_engineer",
    name: "Marine Engineer",
    description: "System design, troubleshooting, overhauls",
    icon: "⚙️"
  },
  {
    id: "marine_electrician",
    name: "Marine Electrician", 
    description: "Electrical systems, motors, wiring, control panels",
    icon: "⚡"
  },
  {
    id: "marine_fitter_welder",
    name: "Marine Fitter/Welder",
    description: "Engine repairs, fabrication, hull repairs, structural welding",
    icon: "🔧"
  },
  {
    id: "ndt_technician",
    name: "NDT Technician",
    description: "Non-destructive testing, ultrasonic inspection",
    icon: "🔍"
  },
  {
    id: "commercial_diver",
    name: "Commercial Diver",
    description: "Underwater inspections/repairs",
    icon: "🤿"
  },
  {
    id: "refer_hvac_technician",
    name: "Refer/HVAC Technician",
    description: "Air conditioning, refrigeration",
    icon: "❄️"
  },
  {
    id: "crane_technician",
    name: "Crane Technician",
    description: "Lifting equipment service",
    icon: "🏗️"
  },
  {
    id: "hydraulic_specialist",
    name: "Hydraulic Specialist",
    description: "Hydraulic systems expert",
    icon: "💧"
  },
  {
    id: "automation_control_technician",
    name: "Automation/Control Technician",
    description: "PLC, SCADA systems",
    icon: "🤖"
  },
  {
    id: "insulation_specialist",
    name: "Insulation Specialist",
    description: "Thermal/acoustic insulation",
    icon: "🧱"
  },
  {
    id: "vibration_analyst",
    name: "Vibration Analyst",
    description: "Equipment condition monitoring",
    icon: "📊"
  },
  {
    id: "lsa_ffa_authorized_expert",
    name: "LSA/FFA Authorized Expert",
    description: "Life-saving & firefighting equipment",
    icon: "🚨"
  }
];

// Major International Classification Societies
export const CLASSIFICATION_SOCIETIES: ClassificationSociety[] = [
  {
    id: "dnv",
    name: "DNV",
    fullName: "Det Norske Veritas",
    country: "Norway/Germany",
    flag: "🇳🇴"
  },
  {
    id: "lloyds_register",
    name: "Lloyd's Register",
    fullName: "Lloyd's Register",
    country: "United Kingdom",
    flag: "🇬🇧"
  },
  {
    id: "abs",
    name: "ABS",
    fullName: "American Bureau of Shipping",
    country: "United States",
    flag: "🇺🇸"
  },
  {
    id: "bureau_veritas",
    name: "Bureau Veritas",
    fullName: "Bureau Veritas",
    country: "France",
    flag: "🇫🇷"
  },
  {
    id: "class_nk",
    name: "Class NK",
    fullName: "Nippon Kaiji Kyokai",
    country: "Japan",
    flag: "🇯🇵"
  },
  {
    id: "rina",
    name: "RINA",
    fullName: "Registro Italiano Navale",
    country: "Italy",
    flag: "🇮🇹"
  }
];

// Helper functions for frontend use
export const getExpertiseCategoryById = (id: string): MaritimeExpertiseCategory | undefined => {
  return MARITIME_EXPERTISE_CATEGORIES.find(category => category.id === id);
};

export const getClassificationSocietyById = (id: string): ClassificationSociety | undefined => {
  return CLASSIFICATION_SOCIETIES.find(society => society.id === id);
};

export const getExpertiseCategoryName = (id: string): string => {
  const category = getExpertiseCategoryById(id);
  return category?.name || id;
};

export const getClassificationSocietyName = (id: string): string => {
  const society = getClassificationSocietyById(id);
  return society?.name || id;
};

// Validation functions
export const isValidExpertiseCategory = (id: string): boolean => {
  return MARITIME_EXPERTISE_CATEGORIES.some(category => category.id === id);
};

export const isValidClassificationSociety = (id: string): boolean => {
  return CLASSIFICATION_SOCIETIES.some(society => society.id === id);
};

// Convert legacy services to new expertise categories (for migration)
export const mapLegacyServicesToExpertise = (services: string): string[] => {
  const expertiseMap: { [key: string]: string[] } = {
    "propulsion": ["marine_engineer", "marine_fitter_welder"],
    "electrical": ["marine_electrician"],
    "hull": ["marine_fitter_welder", "ndt_technician"],
    "hvac": ["refer_hvac_technician"],
    "crane": ["crane_technician"],
    "hydraulic": ["hydraulic_specialist"],
    "automation": ["automation_control_technician"],
    "insulation": ["insulation_specialist"],
    "vibration": ["vibration_analyst"],
    "safety": ["lsa_ffa_authorized_expert"],
    "diving": ["commercial_diver"],
    "welding": ["marine_fitter_welder"],
    "engineering": ["marine_engineer"]
  };

  const serviceTerms = services.toLowerCase();
  const matchedExpertise: Set<string> = new Set();

  Object.entries(expertiseMap).forEach(([keyword, expertise]) => {
    if (serviceTerms.includes(keyword)) {
      expertise.forEach(exp => matchedExpertise.add(exp));
    }
  });

  return Array.from(matchedExpertise);
};