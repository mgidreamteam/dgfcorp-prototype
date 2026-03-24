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
            // We must extract the Float32Arrays out of the WASM heap to transfer them safely
            const payload = result.meshes.map((mesh: any) => {
                return {
                    name: mesh.name || 'Body',
                    color: mesh.color || [0.7, 0.7, 0.7],
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
