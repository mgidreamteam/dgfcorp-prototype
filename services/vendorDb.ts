import { HardwareSpec, Vendor, ComponentCategory, VendorMatch } from '../types';

// Fallback logic implemented inline

// Note: generateId utility needs to exist, or we use crypto.randomUUID fallback
const generateUUID = () => {
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Foundational Mock Vendor Database 
export const MOCK_CERTIFICATIONS = ['ISO 9001', 'AS9100', 'ITAR', 'RoHS'];

export const STATIC_VENDORS: Vendor[] = [
    {
        id: 'v_digikey_mock',
        name: 'Digi-Key Electronics (Mock)',
        category: 'PCB & Electronics',
        location: 'Thief River Falls, MN',
        description: 'Global distributor of electronic components.',
        moq: '1 unit',
        leadTime: '1-3 Days',
        certifications: ['ISO 9001', 'RoHS'],
        rating: 98,
        verified: true,
        capabilities: ['SMT', 'Through-hole', 'Components'],
        componentCategory: ['Electronic'],
        serviceType: 'Vendor'
    },
    {
        id: 'v_mcmaster_mock',
        name: 'McMaster-Carr (Mock)',
        category: 'Materials',
        location: 'Chicago, IL',
        description: 'Industrial supplier of hardware, tools, and raw materials.',
        moq: '1 unit',
        leadTime: '1-2 Days',
        certifications: ['ISO 9001'],
        rating: 99,
        verified: true,
        capabilities: ['Fasteners', 'Raw Materials', 'Hardware'],
        componentCategory: ['Structural', 'Motion'],
        serviceType: 'Vendor'
    },
    {
        id: 'v_protolabs_mock',
        name: 'Protolabs (Mock)',
        category: 'CNC Machining',
        location: 'Maple Plain, MN',
        description: 'Rapid manufacturing of custom prototypes.',
        moq: '1 unit',
        leadTime: '3-5 Days',
        certifications: ['ISO 9001', 'AS9100'],
        rating: 95,
        verified: true,
        capabilities: ['3-axis CNC', '5-axis CNC', 'FDM', 'SLA'],
        componentCategory: ['Structural'],
        serviceType: 'Fabricator'
    },
    {
        id: 'v_maxon_mock',
        name: 'Maxon Motors (Mock)',
        category: 'Assembly',
        location: 'Sachseln, CH',
        description: 'High-precision drive systems.',
        moq: '1 unit',
        leadTime: '5-14 Days',
        certifications: ['ISO 9001', 'AS9100'],
        rating: 97,
        verified: true,
        capabilities: ['Motors', 'Actuators', 'Gearheads'],
        componentCategory: ['Motion'],
        serviceType: 'Vendor'
    }
];

// Phase 2: Scoring and Ranking (Soft Constraints)
const calculateMatchScore = (vendor: Vendor, partType: string, requiredCertifications: string[]): number => {
    let score = 0;

    // 1. Specialization Score (Weight: 40%)
    let isSpecialized = false;
    if (partType.toLowerCase() === 'electronic' && vendor.category === 'PCB & Electronics') isSpecialized = true;
    if (partType.toLowerCase() === 'mechanical' && ['CNC Machining', 'Assembly', 'Materials'].includes(vendor.category)) isSpecialized = true;
    if (partType.toLowerCase() === 'casing' && ['CNC Machining', '3D Printing'].includes(vendor.category)) isSpecialized = true;
    
    if (isSpecialized) score += 40;
    else score += 10; // Partial baseline out of 40

    // 2. Lead Time & Capacity Score (Weight: 30%)
    const days = parseInt(vendor.leadTime.match(/\d+/)?.[0] || "5");
    if (days <= 3) score += 30;
    else if (days <= 7) score += 20;
    else score += 10;

    // 3. Historical Performance / Rating (Weight: 20%)
    // Assuming rating is 0-100 base
    score += (vendor.rating / 100) * 20;

    // 4. Proximity/Logistics (Weight: 10%)
    // Mock simulation: closer is better. Randomizer for MVP representation.
    score += Math.floor(Math.random() * 10); 

    return Math.min(100, Math.round(score));
};

export const runCompetencyMatch = (specs: HardwareSpec, partIds: {id: string, name: string}[]): VendorMatch[] => {
    const matches: VendorMatch[] = [];

    // Map each physical bounding part ID back to logical BOM type
    partIds.forEach(part => {
        // Phase 1: Boolean Filtering
        const logicalBomMatch = specs.bom.find(b => part.name.toLowerCase().includes(b.component.toLowerCase()) || b.component.toLowerCase().includes(part.name.toLowerCase())) || specs.bom[0];
        const partType = logicalBomMatch?.type || 'Structural';

        // Filter functionally capable vendors
        const capableVendors = STATIC_VENDORS.filter(v => {
            if (partType.toLowerCase() === 'electronic' && !v.componentCategory.includes('Electronic')) return false;
            return true; 
        });

        // Phase 2: Competency Ranking
        const rankedVendors = capableVendors.map(v => ({
            vendor: v,
            score: calculateMatchScore(v, partType, [])
        })).sort((a, b) => b.score - a.score);

        const bestMatch = rankedVendors[0];
        
        if (bestMatch) {
            matches.push({
                partId: part.id,
                vendorName: bestMatch.vendor.name,
                price: logicalBomMatch?.estimatedCost || '$15.00',
                leadTime: bestMatch.vendor.leadTime,
                status: 'Pending',
                score: bestMatch.score
            });
        }
    });

    return matches;
};
