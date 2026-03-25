import initOpenCascade from 'occt-import-js';

// Setup worker context
self.onmessage = async (e: MessageEvent) => {
    const { buffer, extension, id, assemblyName } = e.data;

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
            const cleanAssemblyName = assemblyName ? assemblyName.replace(/\.[^/.]+$/, "") : "";
            const isSingleEntity = cleanAssemblyName.toLowerCase().match(/(bearing|spring|coil|washer|screw|bolt|nut|pin|rivet|bushing)/);
            
            if (isSingleEntity && result.meshes.length > 0) {
                // Merge all solids/faces into a single mesh piece
                let totalPositions = 0;
                let totalIndices = 0;
                result.meshes.forEach((mesh: any) => {
                    totalPositions += mesh.attributes.position.array.length;
                    totalIndices += mesh.index.array.length;
                });
                
                const combinedPositions = new Float32Array(totalPositions);
                const combinedNormals = new Float32Array(totalPositions);
                const combinedIndices = new Uint32Array(totalIndices);
                
                let posOffset = 0;
                let idxOffset = 0;
                let vertexOffset = 0;
                
                result.meshes.forEach((mesh: any) => {
                    combinedPositions.set(mesh.attributes.position.array, posOffset);
                    combinedNormals.set(mesh.attributes.normal.array, posOffset);
                    
                    const indices = mesh.index.array;
                    for (let i = 0; i < indices.length; i++) {
                        combinedIndices[idxOffset + i] = indices[i] + vertexOffset;
                    }
                    
                    posOffset += mesh.attributes.position.array.length;
                    idxOffset += indices.length;
                    vertexOffset += mesh.attributes.position.array.length / 3;
                });
                
                const payload = [{
                    name: cleanAssemblyName,
                    color: result.meshes[0].color || [0.5, 0.5, 0.5],
                    constraint: null,
                    positions: combinedPositions,
                    normals: combinedNormals,
                    indices: combinedIndices
                }];
                self.postMessage({ type: 'SUCCESS', id, meshes: payload });
                return;
            }

            const nameCounts = new Map<string, number>();

            const payload = result.meshes.map((mesh: any, idx: number) => {
                let baseName = mesh.name ? mesh.name.trim() : (cleanAssemblyName || `Component`);
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
