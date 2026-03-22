export enum DesignStatus {
  IDLE = 'IDLE',
  GENERATING_SPECS = 'GENERATING_SPECS',
  GENERATING_RENDER = 'GENERATING_RENDER',
  GENERATING_EXPLODED_VIEW = 'GENERATING_EXPLODED_VIEW',
  GENERATING_CIRCUIT = 'GENERATING_CIRCUIT',
  GENERATING_PCB = 'GENERATING_PCB',
  GENERATING_SIMULATION = 'GENERATING_SIMULATION',
  GENERATING_OPENSCAD = 'GENERATING_OPENSCAD',
  GENERATING_STL = 'GENERATING_STL',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface MaterialComposition {
  material: string;
  percentage: number;
}

export interface BillOfMaterialItem {
  component: string;
  type: string;
  quantity: number;
  estimatedCost: string; // e.g., "$0.50"
}

export interface CircuitComponent {
  designator: string; // e.g., R1, C1
  component: string; // e.g., Resistor
  value: string; // e.g., 10kΩ
}

export interface HardwareSpec {
  productName: string;
  tagline: string;
  description: string;
  mechanicalArchitecture?: string;
  wallThickness?: string;
  tolerances?: string;
  dimensions: string;
  weight: string;
  powerSource: string;
  connectivity: string[];
  keyFeatures: string[];
  materials: MaterialComposition[];
  bom: BillOfMaterialItem[];
  manufacturingProcess: string;
  sourcingNotes: string;
  assumedParameters: {
    parameter: string;
    value: string;
  }[] | null;
}

export interface SimulationData {
  skidlCode: string;
  analysis: string;
  plotData: { time: number; voltage: number; }[];
}

export interface SimulationBoundaryCondition {
  id: string;
  type: 'force' | 'pressure' | 'temperature' | 'velocity' | 'fixed_support' | 'custom';
  magnitude: string;
  unit: string;
  targetGeometry: string;
}

export interface DesignProject {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
  specs: HardwareSpec | null;
  assetUrls: {
    rendered: string | null;
    exploded: string | null;
    circuit: string | null;
    pcb: string | null;
    stl: string | null;
  } | null;
  simulationData: SimulationData | null;
  openScadCode: string | null;
  status: DesignStatus;
  failedStep?: DesignStatus | null;
  isConstrained: boolean;
  circuitComponents: CircuitComponent[] | null;
  assemblyParts?: { id: string; name: string; stlUrl: string; transform: [number, number, number] }[];
  vendorMatches?: VendorMatch[];
}

export type VendorCategory = 'Injection Molding' | 'PCB & Electronics' | 'CNC Machining' | '3D Printing' | 'Assembly' | 'Materials';
export type ComponentCategory = 'Structural' | 'Motion' | 'Electronic';
export type ServiceType = 'Vendor' | 'Fabricator' | 'Integrator';


export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  location: string;
  description: string;
  moq: string;
  leadTime: string;
  certifications: string[];
  rating: number;
  verified: boolean;
  capabilities: string[];
  componentCategory: ComponentCategory[];
  serviceType: ServiceType;
}

export interface VendorMatch {
  partId: string;
  vendorName: string;
  price: string;
  leadTime: string;
  status: string;
  score: number;
}

export interface AgentLog {
  id: string;
  timestamp: number;
  content: string;
  type: 'input' | 'output' | 'error' | 'system';
  projectId?: string;
}

export type UserIntent = 'QUESTION' | 'MODIFICATION' | 'NEW_DESIGN';
export interface IntentAnalysis {
  intent: UserIntent;
  isSufficient?: boolean;
  isTooBroad?: boolean;
  missingParams?: string[];
  reason?: string;
}

export interface GigafactoryFilter {
  component: ComponentCategory | null;
  services: ServiceType[] | null;
}

export interface CloudProject {
  id: string;
  name: string;
  sizeBytes: number;
  uploadedAt: number;
}