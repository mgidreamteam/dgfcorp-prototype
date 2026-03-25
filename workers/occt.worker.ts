import initOpenCascade from 'occt-import-js';

// Setup worker context
self.onmessage = async (e: MessageEvent) => {
    const { buffer, extension, id } = e.data;

    try {
        // Initialize WASM Runtime
        const occt = await initOpenCascade({
            locateFile: (path: string) => `/${path}`
        });

        const fileData = new Uint8Array(buffer);
        let result = null;

        // Perform intensive B-Rep parsing and topological meshing
        if (extension === 'step' || extension === 'stp') {
            result = occt.ReadStepFile(fileData, null);
        } else if (extension === 'iges' || extension === 'igs') {
            result = occt.ReadIgesFile(fileData, null);
        } else {
            throw new Error(`Unsupported explicit CAD extension: ${extension}`);
        }

        if (result && result.meshes) {
            const nameCounts = new Map<string, number>();

            const payload = result.meshes.map((mesh: any, idx: number) => {
                let baseName = mesh.name ? mesh.name.trim() : `Component`;
                const nameLower = baseName.toLowerCase();
                
                // Add unique suffix
                const currentCount = nameCounts.get(baseName) || 0;
                const newCount = currentCount + 1;
                nameCounts.set(baseName, newCount);
                
                const name = `${baseName}_${newCount.toString().padStart(2, '0')}`;
                
                let assignedColor = mesh.color ? mesh.color : null;
                let constraintType = null;

                // Circular / Revolute -> Yellow
                if (nameLower.includes('pin') || nameLower.includes('axle') || nameLower.includes('shaft') || nameLower.includes('hinge') || nameLower.includes('bearing') || nameLower.includes('revolute') || nameLower.includes('collar')) {
                    constraintType = 'circular';
                    assignedColor = assignedColor || [0.91, 0.70, 0.03]; 
                } 
                // Linear / Prismatic -> Blue
                else if (nameLower.includes('slider') || nameLower.includes('track') || nameLower.includes('rail') || nameLower.includes('linear') || nameLower.includes('guide')) {
                    constraintType = 'linear';
                    assignedColor = assignedColor || [0.23, 0.51, 0.96]; 
                } 
                // Angular / Spherical -> Emerald
                else if (nameLower.includes('ball') || nameLower.includes('socket') || nameLower.includes('spherical') || nameLower.includes('knuckle')) {
                    constraintType = 'angular';
                    assignedColor = assignedColor || [0.06, 0.72, 0.50]; 
                } 
                // Undeclared material fallback to 50% Gray
                else if (!assignedColor) {
                    assignedColor = [0.5, 0.5, 0.5];
                }

                return {
                    name,
                    color: assignedColor,
                    constraint: constraintType,
                    positions: new Float32Array(mesh.attributes.position.array),
                    normals: new Float32Array(mesh.attributes.normal.array),
                    indices: new Uint32Array(mesh.index.array),
                };
            });

            // Post back with transferable memory objects for 0-copy transport
            self.postMessage({ type: 'SUCCESS', id, meshes: payload });
        } else {
            throw new Error('OCCT Kernel failed to produce topological meshes.');
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', id, message: err.message || 'Unknown OCCT error occurred.' });
    }
};
