import { GoogleGenAI, Type } from "@google/genai";
import { HardwareSpec, IntentAnalysis, SimulationData, CircuitComponent } from "../types";

const ai = {
  models: {
    generateContent: async (requestBody: any) => {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error('Failed to generate content via backend: ' + response.statusText);
      }
      const data = await response.json();
      if (data.usageMetadata && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gemini_token_usage', {
              detail: {
                  ...data.usageMetadata,
                  model: requestBody.model
              }
          }));
      }
      return data;
    }
  }
};const extractText = (response: any): string | null => {
  if (response.text) return response.text;
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  return null;
};

const sanitizeCodeBlock = (text: string | null): string | null => {
  if (!text) return null;
  const match = text.match(/```[a-z]*\n([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
};

export const analyzeUserIntent = async (prompt: string, previousSpec: HardwareSpec | null): Promise<IntentAnalysis> => {
    const model = "gemini-3-flash-preview";
    const intentPrompt = `
    Analyze the following user's request regarding a hardware design.
    The user is interacting with a design agent.

    Previous hardware specification (if any):
    \`\`\`json
    ${previousSpec ? JSON.stringify(previousSpec, null, 2) : 'None'}
    \`\`\`
    
    User's current request: "${prompt}"

    First, determine the user's primary intent. The intent must be one of: "QUESTION", "MODIFICATION", "NEW_DESIGN".
    - "QUESTION": The user is asking a question about the existing specification (e.g., "how much does it weigh?", "what materials are used?").
    - "MODIFICATION": The user is asking to change, add to, or iterate on the existing specification (e.g., "make it blue", "add bluetooth 5.0").
    - "NEW_DESIGN": The user is asking for a new design, and there is no previous specification.

    Next, based on the intent, provide the following analysis:

    If the intent is "QUESTION":
    - Simply return the intent.

    If the intent is "MODIFICATION" or "NEW_DESIGN":
    - Analyze if the request is actionable for generating a design.
    - isTooBroad: boolean - True if the request is too vague (e.g., "make it better").
    - isSufficient: boolean - True if the request is detailed enough to proceed.
    - missingParams: string[] - If not sufficient, list the critical parameters that are missing. For electric motors, ALWAYS check for: housing shape, housing size, operating temperature range, duty cycle, and ambient performance temperature.
    - reason: string - Explain why the request is too broad, if applicable.

    Provide your response in a single, flat JSON object.
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: intentPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    intent: { type: Type.STRING, enum: ["QUESTION", "MODIFICATION", "NEW_DESIGN"] },
                    isSufficient: { type: Type.BOOLEAN },
                    isTooBroad: { type: Type.BOOLEAN },
                    missingParams: { type: Type.ARRAY, items: { type: Type.STRING } },
                    reason: { type: Type.STRING }
                },
                required: ["intent"]
            }
        }
    });

    const extractedText = extractText(response);
    if (!extractedText) {
        throw new Error("Intent analysis failed.");
    }
    return JSON.parse(extractedText) as IntentAnalysis;
};

export const getAnswerFromSpec = async (question: string, specs: HardwareSpec): Promise<string> => {
    const model = "gemini-3-flash-preview";
    const answerPrompt = `
    You are Hilo, an expert hardware design assistant.
    A user has asked a question about a product you designed.
    Use the following JSON specification to answer the question.
    Your answer should be concise, helpful, and directly address the user's query based ONLY on the data provided in the specification.
    Do not make up information. If the answer isn't in the spec, say so.

    Product Specification:
    \`\`\`json
    ${JSON.stringify(specs, null, 2)}
    \`\`\`

    User's Question: "${question}"

    Answer:
    `;

    const response = await ai.models.generateContent({
        model,
        contents: answerPrompt,
    });
    
    const extractedText = extractText(response);
    if (!extractedText) {
        return "I'm sorry, I couldn't generate an answer for that question.";
    }
    return extractedText;
};

export const extractSimulationConstraints = async (prompt: string): Promise<any[]> => {
    const model = "gemini-3-flash-preview";
    const extractionPrompt = `
    You are an expert CAE (Computer Aided Engineering) AI. Extract physics boundary conditions from the user's natural language request.
    
    User's Request: "${prompt}"

    Return ONLY a pure JSON array of objects matching this exact format:
    [
      {
        "id": "generate-a-unique-uuid-here",
        "type": "force" | "pressure" | "temperature" | "velocity" | "fixed_support" | "custom",
        "magnitude": "100",
        "unit": "N",
        "targetGeometry": "top_face"
      }
    ]
    
    If no physics conditions are found, return []. DO NOT include any markdown formatting like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: extractionPrompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = extractText(response);
    if (!text) return [];
    try {
        return JSON.parse(text);
    } catch {
        return [];
    }
};


export const generateHardwareSpecs = async (prompt: string, previousSpec: HardwareSpec | null, projectName: string): Promise<HardwareSpec> => {
  const model = "gemini-3-flash-preview";
  let generationPrompt: string;

  if (previousSpec) {
    generationPrompt = `You are Hilo, an agentic hardware designer. You previously generated the following hardware specification:

    \`\`\`json
    ${JSON.stringify(previousSpec, null, 2)}
    \`\`\`

    Now, the user has a new request. Please update the specification based on this request: "${prompt}".
    The product name MUST remain "${projectName}".

    If the user's request is a minor change (e.g., changing a material or color), update only that part of the spec and keep the rest the same. If it's a major change (e.g., adding a new significant component), regenerate the relevant parts of the spec accordingly.

    IMPORTANT: When updating the Bill of Materials (BOM), continue to prioritize common off-the-shelf (COTS) components from suppliers like Digi-Key (electronics), Maxon (motors), and McMaster-Carr (fasteners), specifying exact part names where possible.

    Always return the complete, updated specification in the same JSON format as before. The 'productName' field must be exactly "${projectName}". Do not just return the changed parts.
    For any new parameters that are now required due to the user's request, but not specified, make reasonable, industry-standard assumptions and list them clearly in the 'assumedParameters' field.
    `;
  } else {
     generationPrompt = `You are Hilo, an agentic hardware designer. Design a hardware product based on this description: "${prompt}". 
    The product name is fixed and must be "${projectName}".
    Provide a highly detailed technical specification. This includes precise dimensions, mechanical architecture, wall thickness, tolerances, materials, BOM, and manufacturing advice.
    
    IMPORTANT GEOMETRY INSTRUCTIONS:
    - You must output 'mechanicalArchitecture', describing the exact geometric primitives (e.g., "A main cylindrical body with R=20mm and a rectangular base 40x40mm").
    - You must define 'wallThickness' (e.g. "2.0mm") and 'tolerances' (e.g. "+/- 0.1mm").
    - Ensure your 'dimensions' field strictly aligns with the mathematical bounds of your 'mechanicalArchitecture'.

    IMPORTANT: When defining the Bill of Materials (BOM), you MUST prioritize using common off-the-shelf (COTS) components from established suppliers.
    - For electronic components (resistors, ICs, sensors), specify parts available from distributors like Digi-Key or Newark.
    - For motors and actuators, specify products from manufacturers like Maxon or Faulhaber.
    - For standard mechanical parts and fasteners (screws, bearings), assume sourcing from a supplier like McMaster-Carr.
    - In the 'component' field of the BOM, list the specific part name or number (e.g., "Maxon DCX 10mm Motor," "ATmega328P-PU," "M3x8mm Socket Head Cap Screw"). Do not use generic names like "Motor" or "Screw."
    - Only specify a custom-designed part if a COTS component is not suitable for the product's unique requirements.

    The 'productName' field in your JSON response must be exactly "${projectName}".
    Ensure the material composition percentages sum to 100.
    For the 'sourcingNotes' field, analyze the Bill of Materials. Identify potential challenges (e.g., custom parts, long lead times) and suggest if common components are readily available from major distributors.
    For any parameters not specified by the user (e.g., operating temperature, housing size for a motor), make reasonable, industry-standard assumptions. List these assumptions clearly in the 'assumedParameters' field.`;
  }

  const response = await ai.models.generateContent({
    model,
    contents: generationPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING, description: `The product name. MUST be exactly '${projectName}'.` },
          tagline: { type: Type.STRING },
          description: { type: Type.STRING },
          mechanicalArchitecture: { type: Type.STRING, description: "Highly detailed description of the core geometric primitives and shapes (e.g., Cylindrical main body with 20mm radius)." },
          wallThickness: { type: Type.STRING, description: "Recommended shell/wall thickness in mm (e.g. '2.0mm')." },
          tolerances: { type: Type.STRING, description: "Recommended manufacturing tolerances (e.g. '+/- 0.1mm')." },
          dimensions: { type: Type.STRING, description: "e.g. 120mm x 80mm x 40mm" },
          weight: { type: Type.STRING, description: "e.g. 250g" },
          powerSource: { type: Type.STRING },
          connectivity: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          keyFeatures: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          materials: {
            type: Type.ARRAY,
            description: "Breakdown of materials by percentage (must sum to 100)",
            items: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.STRING },
                percentage: { type: Type.NUMBER }
              }
            }
          },
          bom: {
            type: Type.ARRAY,
            description: "Bill of Materials estimation",
            items: {
              type: Type.OBJECT,
              properties: {
                component: { type: Type.STRING },
                type: { type: Type.STRING, description: "e.g. Electronic, Mechanical, Casing" },
                quantity: { type: Type.NUMBER },
                estimatedCost: { type: Type.STRING, description: "Estimated unit cost in USD" }
              }
            }
          },
          manufacturingProcess: { type: Type.STRING, description: "Brief overview of how to make it (e.g., Injection Molding, CNC)" },
          sourcingNotes: { type: Type.STRING, description: "Notes on component sourcing challenges and availability." },
          assumedParameters: {
            type: Type.ARRAY,
            description: "List of critical parameters that were not specified in the prompt and were assumed by Hilo.",
            items: {
                type: Type.OBJECT,
                properties: {
                    parameter: { type: Type.STRING },
                    value: { type: Type.STRING }
                },
                required: ["parameter", "value"]
            }
          }
        },
        required: ["productName", "tagline", "description", "dimensions", "materials", "bom", "keyFeatures", "sourcingNotes", "manufacturingProcess", "assumedParameters"]
      }
    }
  });

    const extractedText = extractText(response);
  if (!extractedText) {
    throw new Error("No specifications generated");
  }

  const specs = JSON.parse(extractedText) as HardwareSpec;

  // Safeguard: Ensure the returned productName matches the project name.
  specs.productName = projectName;

  return specs;
};

const generateImageForPrompt = async (imagePrompt: string): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [{ text: imagePrompt }],
        },
        config: {
            imageConfig: { aspectRatio: "1:1" }, // Changed to 1:1 for the quad view
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            return `data:${mimeType};base64,${base64EncodeString}`;
        }
    }
    throw new Error("No image generated for the provided prompt.");
};

export const generateProductRenderImage = async (prompt: string, specs: HardwareSpec): Promise<string> => {
  const imagePrompt = `Professional studio photography product design shot of ${specs.productName}: ${specs.description}. 
  Industrial design style, ${specs.materials.map(m => m.material).join(', ')} textures. 
  High fidelity, 8k resolution. The lighting should be a 'Corner Key Lighting' setup: dramatic, high-contrast industrial lighting originating from the top-left and top-right corners, casting soft shadows. On a clean, matte black background.
  The user's request for this design was: "${prompt}"`;
  return generateImageForPrompt(imagePrompt);
};

export const generateProductExplodedViewImage = async (prompt: string, specs: HardwareSpec): Promise<string> => {
    const imagePrompt = `A high-detail, photorealistic 3D rendering showing an exploded view of ${specs.productName}.
    All individual components from the bill of materials must be floating in space, clearly separated from each other.
    Dotted or dashed lines should connect the components to show how they assemble.
    ABSOLUTELY NO TEXT. The image must not contain any words, letters, numbers, or labels of any kind. This is a purely visual diagram.
    The background should be a simple, clean, dark navy blue with a subtle gray dot grid pattern. The lighting should be soft and even, highlighting the details of each part.
    The user's request for this design was: "${prompt}"`;
    return generateImageForPrompt(imagePrompt);
};

export const generateCircuitDiagramImage = async (specs: HardwareSpec): Promise<{ svgDataUrl: string; components: CircuitComponent[]; }> => {
    const model = "gemini-3-flash-preview";
    const electronicComponents = specs.bom
        .filter(item => item.type.toLowerCase() === 'electronic')
        .map(item => `${item.component} (qty: ${item.quantity})`)
        .join(', ');

    const svgPrompt = `
    You are an expert electronics engineer and SVG graphic designer. Based on the following product specification, create a detailed and logically correct electronic circuit schematic.

    Product Name: ${specs.productName}
    Description: ${specs.description}
    Power Source: ${specs.powerSource}
    Electronic Components from BOM: ${electronicComponents}

    Your task is to return a JSON object with two keys: "svgString" and "componentValues".

    1.  **svgString**: This should be a complete, valid SVG XML string.
        -   It must start with '<svg...>' and end with '</svg>'.
        -   Use a viewBox like "0 0 400 300".
        -   The background must be transparent.
        -   All lines, symbols, and text must be white or light gray (e.g., '#e5e7eb').
        -   Use standard electronic symbols.
        -   Label key components with designators (R1, C1, U1) and their values (10kΩ, 100nF).
        -   Use the font family "Kode Mono, monospace" for all text.

    2.  **componentValues**: This must be a JSON array of objects.
        -   For each labeled component in the SVG, create one object in the array.
        -   Each object must have three keys: "designator" (string, e.g., "R1"), "component" (string, e.g., "Resistor"), and "value" (string, e.g., "10kΩ").
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: svgPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    svgString: { type: Type.STRING },
                    componentValues: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                designator: { type: Type.STRING },
                                component: { type: Type.STRING },
                                value: { type: Type.STRING }
                            },
                            required: ["designator", "component", "value"]
                        }
                    }
                },
                required: ["svgString", "componentValues"]
            }
        }
    });
    
    const extractedText = extractText(response);
    if (!extractedText) {
        throw new Error("Failed to generate Circuit Diagram data.");
    }

    const result = JSON.parse(extractedText) as { svgString: string; componentValues: CircuitComponent[] };
    const rawSvg = result.svgString.trim();
    
    if (!rawSvg.startsWith('<svg') || !rawSvg.endsWith('</svg>')) {
        throw new Error("Generated content is not a valid SVG string.");
    }
    
    // Modern SVG URI encoding avoids `btoa` chunk limits and `unescape` deprecations inherently
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
    
    return { svgDataUrl, components: result.componentValues };
};

export const generatePcbLayoutImage = async (prompt: string, specs: HardwareSpec): Promise<string> => {
    const electronicComponents = specs.bom
        .filter(item => item.type.toLowerCase() === 'electronic')
        .map(item => item.component)
        .join(', ');

    const imagePrompt = `
    A photorealistic, high-resolution top-down photograph of a 2-layer PCB layout for a "${specs.productName}".
    The PCB features a dark green solder mask with intricate, visible copper traces connecting components.
    Key electronic components like ${electronicComponents} should be clearly placed and identifiable.
    White silkscreen labels (e.g., R1, C1, U1) should be visible on the board for major components.
    The overall aesthetic is clean, professional, and technically accurate.
    The board's shape should be rectangular, inspired by these dimensions: ${specs.dimensions}.
    The lighting is bright and even, highlighting the details of the traces and components.
    The user's initial request for this design was: "${prompt}"
    `;
    
    return generateImageForPrompt(imagePrompt);
};

export const generateOpenScadCode = async (specs: HardwareSpec): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const scadPrompt = `
  You are an expert 3D modeler specializing in OpenSCAD. Based on the following product specification, write a complete and runnable OpenSCAD script to create a high-fidelity 3D model of the product's main enclosure/body.

  Product Name: ${specs.productName}
  Dimensions: ${specs.dimensions}
  Mechanical Architecture: ${specs.mechanicalArchitecture || 'Not specified'}
  Wall Thickness: ${specs.wallThickness || '2mm'}
  Tolerances: ${specs.tolerances || 'Standard'}
  Key Mechanical Components: ${specs.bom.filter(i => ['Casing', 'Mechanical'].includes(i.type)).map(i => i.component).join(', ')}

  Your task:
  1. Create a highly detailed OpenSCAD script using Constructive Solid Geometry (CSG).
  2. Implement advanced modularity: Produce a fully SOLID geometry. DO NOT use \`difference()\` or any other method to hollow out the casing. It must be solid for volumetric simulation.
  3. Use \`minkowski()\` or \`hull()\` to create sleek, rounded, aerodynamic edges where appropriate.
  4. Design surface-level physical features, but again, do not hollow the main body.
  5. The model MUST be strictly mathematically bounded by the listed dimensions and Architecture.
  6. The output must be ONLY the raw OpenSCAD code. Do not include markdown formatting like \`\`\`scad.
  `;
  const response = await ai.models.generateContent({
    model,
    contents: scadPrompt,
  });
  const extractedText = sanitizeCodeBlock(extractText(response));
  if (!extractedText) {
    throw new Error("No OpenSCAD code generated");
  }
  return extractedText.trim();
};


export const generateStlFile = async (specs: HardwareSpec, openScadCode: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const stlPrompt = `
  You are an OpenSCAD rendering engine. You are given an OpenSCAD script. Your task is to act as if you have rendered this script and are now outputting the resulting geometry as an ASCII STL file.

  The solid name in the STL file should be "${specs.productName.replace(/ /g, '_')}".
  The geometry should be a valid interpretation of the OpenSCAD code provided.

  OpenSCAD Code:
  \`\`\`scad
  ${openScadCode}
  \`\`\`

  The output must be ONLY the raw STL file content, starting with "solid ..." and ending with "endsolid ...". Do not include any explanation, code block formatting, or any text other than the STL content itself.
  `;
  const response = await ai.models.generateContent({
    model,
    contents: stlPrompt,
  });
    const extractedText = sanitizeCodeBlock(extractText(response));
  if (!extractedText) {
    throw new Error("No STL content generated");
  }
  return extractedText.trim();
};

export const generateSkidlCode = async (specs: HardwareSpec): Promise<string> => {
    const model = "gemini-3-flash-preview";
    const electronicComponents = specs.bom
        .filter(item => item.type.toLowerCase() === 'electronic')
        .map(item => `${item.component} (qty: ${item.quantity})`)
        .join(', ');

    const skidlPrompt = `
    You are an expert electronics engineer. Based on the following product specification and its electronic components, write a Python script using the SKiDL library to define the circuit.

    Product Name: ${specs.productName}
    Description: ${specs.description}
    Power Source: ${specs.powerSource}
    Electronic Components from BOM: ${electronicComponents}

    Your task:
    1.  Create a complete, runnable SKiDL script.
    2.  Define parts, nets, and connections based on a logical interpretation of how these components would work together in the described product.
    3.  Make reasonable assumptions for component values (e.g., resistor resistance, capacitor capacitance) if not specified.
    4.  Add comments to explain key parts of the circuit definition.
    5.  The output should be ONLY the raw Python code. Do not include markdown formatting like \`\`\`python.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: skidlPrompt,
    });

    const extractedText = sanitizeCodeBlock(extractText(response));
    if (!extractedText) {
        throw new Error("Failed to generate SKiDL code.");
    }
    return extractedText.trim();
};

export const runCircuitSimulation = async (skidlCode: string, specs: HardwareSpec): Promise<SimulationData> => {
    const model = "gemini-3-flash-preview";
    const simPrompt = `
    You are an advanced circuit simulation engine based on ngspice. You will be given a hardware specification and its corresponding SKiDL circuit definition.
    Your task is to *simulate* running a transient analysis and provide the results in a specific JSON format.

    Hardware Specification:
    \`\`\`json
    ${JSON.stringify(specs, null, 2)}
    \`\`\`

    SKiDL Code:
    \`\`\`python
    ${skidlCode}
    \`\`\`

    Simulation Task:
    1.  Analyze the circuit defined in the SKiDL code.
    2.  Identify a key output or component to measure (e.g., the voltage across an LED, the output of a sensor, the signal on a specific pin).
    3.  Perform a conceptual transient analysis (voltage vs. time) for a short duration (e.g., 0 to 50 milliseconds).
    4.  Generate a concise, one-paragraph analysis of the simulation results, explaining what the data shows about the circuit's behavior.
    5.  Generate an array of 20-30 data points for a plot. The data points should be objects with "time" (in milliseconds) and "voltage" keys. The plot should reflect a plausible behavior for the circuit (e.g., a capacitor charging, an LED turning on, a sensor stabilizing).
    
    The entire output must be a single JSON object matching the provided schema. Do not include the skidlCode in your response.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: simPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING },
                    plotData: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                time: { type: Type.NUMBER },
                                voltage: { type: Type.NUMBER }
                            },
                            required: ["time", "voltage"]
                        }
                    }
                },
                required: ["analysis", "plotData"]
            }
        }
    });

    const extractedText = extractText(response);
    if (!extractedText) {
        throw new Error("Circuit simulation failed to generate a response.");
    }

    const simResults = JSON.parse(extractedText);
    return { ...simResults, skidlCode };
};

export const rerunCircuitSimulation = async (skidlCode: string, specs: HardwareSpec, modification: string): Promise<Omit<SimulationData, 'skidlCode'>> => {
    const model = "gemini-3-flash-preview";
    const simPrompt = `
    You are an advanced circuit simulation engine based on ngspice. You will be given a hardware specification, its SKiDL circuit definition, and a requested modification.
    Your task is to *simulate* re-running a transient analysis with the modification and provide the updated results in a specific JSON format.

    Hardware Specification:
    \`\`\`json
    ${JSON.stringify(specs, null, 2)}
    \`\`\`

    SKiDL Code:
    \`\`\`python
    ${skidlCode}
    \`\`\`

    User Modification Request: "${modification}"

    Simulation Task:
    1.  Interpret the user's modification request and apply it to the circuit conceptually (e.g., change a component's value).
    2.  Perform a new conceptual transient analysis (voltage vs. time) on the *modified* circuit.
    3.  Generate a new, concise, one-paragraph analysis explaining what the new data shows about the modified circuit's behavior.
    4.  Generate a new array of 20-30 data points for a plot reflecting the behavior of the modified circuit.
    
    The entire output must be a single JSON object matching the provided schema.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: simPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING },
                    plotData: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                time: { type: Type.NUMBER },
                                voltage: { type: Type.NUMBER }
                            },
                            required: ["analysis", "plotData"]
                        }
                    }
                },
                required: ["analysis", "plotData"]
            }
        }
    });

    const extractedText = extractText(response);
    if (!extractedText) {
        throw new Error("Circuit re-simulation failed to generate a response.");
    }
    
    return JSON.parse(extractedText);
};