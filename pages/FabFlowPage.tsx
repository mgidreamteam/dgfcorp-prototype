import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, PlusCircle, Trash2, CloudDownload, XSquare, ArrowDownToLine, Save, UploadCloud, Box, Cuboid, Database, Maximize, RefreshCw, Sun, Moon, Droplet, Box as BoxIcon, Search, Wrench, Package, ListTree, ArrowRight, Activity, Zap, Server, ChevronRight, Eye, Layers, Settings2, Share2, Printer, CheckCircle2, AlertCircle, FileText, Download, Upload, Cpu, Factory, ShieldCheck, Globe2, ArrowDownToLine as ArrowDownToLineIcon, UploadCloud as UploadCloudIcon, Minimize2, Lightbulb, LightbulbOff, Sparkles, Grid3X3, FolderOpen , Aperture, Bot, Clock, X, AlertTriangle, CheckCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import CloudLoadModal from '../components/CloudLoadModal';
import ProjectSelectionModal from '../components/ProjectSelectionModal';
import { ImportedCADGeometry } from '../components/ImportedCADGeometry';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Line, Center, GizmoHelper, GizmoViewport, Edges } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { runCompetencyMatch } from '../services/vendorDb';
import { Binary, Hammer, EyeOff, Component, ChevronDown } from 'lucide-react';
import { generateStlFile, analyzeCADPart } from '../services/gemini';
import { StudioLighting } from '../components/StudioLighting';

type BOMExtractionStatus = 'pending' | 'processing' | 'success' | 'error';
export interface PartExtractionState {
  name: string;
  status: BOMExtractionStatus;
  errorMsg?: string;
}

const ViewCubeIcon = ({ face }: { face: string }) => {
    const f = face.toLowerCase();
    return (
        <svg viewBox="0 0 100 100" className="w-[30px] h-[30px] transform transition-transform group-hover:scale-[1.15]">
            <g strokeLinejoin="round" strokeLinecap="round" className="stroke-zinc-600 stroke-[4] fill-transparent transition-colors">
                <path d="M50 20 L80 35 L50 50 L20 35 Z" className={f === 'top' ? 'fill-yellow-500/60 stroke-yellow-400' : f === 'bottom' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M20 35 L50 50 L50 80 L20 65 Z" className={f === 'front' ? 'fill-yellow-500/60 stroke-yellow-400' : f === 'rear' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M50 50 L80 35 L80 65 L50 80 Z" className={f === 'right' ? 'fill-yellow-500/60 stroke-yellow-400' : f === 'left' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                {f === '3d' && (
                    <>
                        <path d="M50 20 L80 35 L50 50 L20 35 Z" className="fill-yellow-500/20 stroke-yellow-400/50" />
                        <path d="M20 35 L50 50 L50 80 L20 65 Z" className="fill-yellow-500/20 stroke-yellow-400/50" />
                        <path d="M50 50 L80 35 L80 65 L50 80 Z" className="fill-yellow-500/20 stroke-yellow-400/50" />
                        <circle cx="50" cy="50" r="12" className="fill-yellow-500 stroke-yellow-400" />
                    </>
                )}
            </g>
        </svg>
    );
};

const CameraManager = () => {
    const { camera, controls } = useThree();
    useEffect(() => {
        const handleZoom = (e: any) => {
            if (!controls) return;
            const ctrl = controls as any;
            if (e.detail === 'in') {
                camera.position.multiplyScalar(0.8);
            } else if (e.detail === 'out') {
                camera.position.multiplyScalar(1.2);
            } else if (e.detail === 'fit') {
                const dir = camera.position.clone().normalize();
                if (dir.lengthSq() === 0) {
                    camera.position.set(100, 80, 100);
                } else {
                    camera.position.copy(dir.multiplyScalar(180));
                }
                camera.lookAt(0,0,0);
                if (ctrl.target) ctrl.target.set(0,0,0);
            }
            ctrl.update();
        };
        window.addEventListener('viewport-zoom', handleZoom);
        return () => window.removeEventListener('viewport-zoom', handleZoom);
    }, [camera, controls]);
    return null;
};

const StlModel: React.FC<{ 
    stlData: string;
    isExploded?: boolean;
    isHovered?: boolean;
    isSelected?: boolean;
    materialType?: 'plastic' | 'matte' | 'metallic';
    baseColor?: string;
    renderMode?: 'wireframe' | 'edges' | 'solid';
    onHover?: (state: boolean) => void;
    onClick?: () => void;
    onLoaded?: (s: {x:number,y:number,z:number}) => void;
}> = ({ stlData, isExploded, isHovered, isSelected, materialType = 'metallic', baseColor = "#a1a1aa", renderMode = 'solid', onHover, onClick, onLoaded }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const meshRef = React.useRef<THREE.Mesh>(null);
  const targetPos = React.useRef(new THREE.Vector3());
  const currentPos = React.useRef(new THREE.Vector3());
  
  useEffect(() => {
    if (!stlData) return;
    const loader = new STLLoader();
    const blob = new Blob([stlData], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    loader.load(url, (geo) => {
        geo.rotateX(-Math.PI / 2); // Correct OpenSCAD Z-up orientation to ThreeJS Y-up
        geo.center();
        geo.computeBoundingBox();
        if (geo.boundingBox) {
            const size = new THREE.Vector3();
            geo.boundingBox.getSize(size);
            geo.translate(0, size.y / 2, 0);
            geo.computeBoundingBox();
            geo.computeBoundingSphere(); // Important: must be calculated AFTER all rotations/translations so WebGL doesn't aggressively frustum cull the "off-screen" offset
            geo.computeVertexNormals(); // Crucial phase for high-resolution visual surface mapping
            if (onLoaded) onLoaded({ x: size.x, y: size.y, z: size.z });
        }
        setGeometry(geo);
        URL.revokeObjectURL(url);
    });
    return () => URL.revokeObjectURL(url);
  }, [stlData]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
     if (!geometry) return;
     const center = geometry.boundingSphere?.center || new THREE.Vector3();
     const dir = center.clone().normalize();
     if (dir.lengthSq() === 0) dir.set(0, 1, 0); 
     
     if (isExploded) {
       targetPos.current.copy(dir.multiplyScalar(45));
     } else {
       targetPos.current.set(0, 0, 0);
     }
  }, [geometry, isExploded]);

  useFrame(() => {
      if (meshRef.current) {
          currentPos.current.lerp(targetPos.current, 0.1);
          meshRef.current.position.copy(currentPos.current);
      }
  });

  if (!geometry) return null;
  return (
    <mesh 
        ref={meshRef} 
        geometry={geometry} 
        castShadow 
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); onHover?.(true); }}
        onPointerOut={(e) => { e.stopPropagation(); onHover?.(false); }}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <meshPhysicalMaterial 
        color={isSelected ? "#eab308" : isHovered ? "#00ffcc" : baseColor} 
        emissive={isSelected || isHovered ? (isSelected ? "#eab308" : "#00ffcc") : "#000000"}
        emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.2 : 0}
        roughness={materialType === 'matte' ? 0.8 : materialType === 'plastic' ? 0.2 : 0.4} 
        metalness={materialType === 'metallic' ? 0.8 : 0.1}
        clearcoat={materialType === 'plastic' ? 1.0 : 0}
        clearcoatRoughness={0.1}
        side={THREE.DoubleSide} 
        wireframe={renderMode === 'wireframe'}
      />
      {renderMode === 'edges' && <Edges threshold={15} color={isSelected ? "#eab308" : "#00ffcc"} />}
    </mesh>
  );
};

interface ExplodedNodeProps {
    comp: any;
    idx: number;
    total: number;
    isHovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}

const ExplodedNode: React.FC<ExplodedNodeProps> = ({ 
    comp, 
    idx, 
    total, 
    isHovered, 
    setHovered 
}) => {
    // Generate an exploded orbit position
    const angle = (idx / total) * Math.PI * 2;
    const radius = 80; // Exploded distance
    const heightOffset = (Math.sin(idx * Math.PI) * 30) + 20;

    const outerPos: [number, number, number] = [
        Math.cos(angle) * radius,
        heightOffset,
        Math.sin(angle) * radius
    ];
    
    // Tether snaps back to central geometry
    const innerPos: [number, number, number] = [
        Math.cos(angle) * 10,
        0,
        Math.sin(angle) * 10
    ];

    return (
        <group>
            {/* The Part Indicator Box */}
            <mesh 
                position={outerPos}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(comp.id); }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(null); }}
            >
                <boxGeometry args={[6, 6, 6]} />
                <meshStandardMaterial 
                    color={isHovered ? "#00ffcc" : "#eab308"} 
                    emissive={isHovered ? "#00ffcc" : "#000000"}
                    emissiveIntensity={isHovered ? 1.5 : 0}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>
            
            {/* Tether / Callout Line */}
            <Line 
                points={[outerPos, innerPos]} 
                color={isHovered ? "#00ffcc" : "#52525b"} 
                lineWidth={isHovered ? 2 : 1}
                transparent
                opacity={isHovered ? 0.9 : 0.3}
            />
        </group>
    );
};

const FabFlowPage: React.FC = () => {
  const [agentPanelWidth, setAgentPanelWidth] = useState(300); 

  const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);

  const handleBottomPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleBottomPanelMouseMove);
    document.addEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const handleBottomPanelMouseMove = (e: MouseEvent) => {
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setBottomPanelHeight(newHeight);
    }
  };

  const handleBottomPanelMouseUp = () => {
    document.removeEventListener('mousemove', handleBottomPanelMouseMove);
    document.removeEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const [isAgentOpen, setIsAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('dream_agent_open');
        if (saved !== null) {
            try { return JSON.parse(saved); } catch(e){}
        }
    }
    return false;
  });

  React.useEffect(() => {
      localStorage.setItem('dream_agent_open', JSON.stringify(isAgentOpen));
  }, [isAgentOpen]);
  const [cadMode, setCadMode] = useState<'Assembly' | 'Circuit'>('Assembly');
  const [renderMode, setRenderMode] = useLocalStorageState<'wireframe' | 'edges' | 'solid'>('dream_ui_renderMode', 'solid');
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);

  
  const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();
  const activeProject = React.useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [bomExtractionState, setBomExtractionState] = useState<PartExtractionState[] | null>(null);
  const [cloudModalMode, setCloudModalMode] = useState<'open' | 'analyze'>('open');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [explodeDistance, setExplodeDistance] = useState(0);
  const [openScadRes, setOpenScadRes] = useState(50);
  const [globalLightIntensitySlider, setGlobalLightIntensitySlider] = useLocalStorageState('dream_ui_luxBase', 0);
  const [globalLightsOn, setGlobalLightsOn] = useLocalStorageState('dream_ui_globalLightsOn', true);
  const [showLightMeshes, setShowLightMeshes] = useLocalStorageState('dream_ui_showLightMeshes', true);
  const [showGrid, setShowGrid] = useLocalStorageState('dream_ui_showGrid', true);
  const [modelSize, setModelSize] = useState({x:20, y:20, z:20});
  const [isResizingMesh, setIsResizingMesh] = useState(false);
  const [materialType, setMaterialType] = useState<'plastic' | 'matte' | 'metallic'>('metallic');
  const [roomTheme, setRoomTheme] = useLocalStorageState<'dark' | 'light'>('dream_ui_roomTheme', 'dark');
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const [cameraView, setCameraView] = useLocalStorageState<ViewMode>('dream_ui_cameraView', '3D');

  const isInitialMountUI = React.useRef(true);
  useEffect(() => {
      if (isInitialMountUI.current) {
          isInitialMountUI.current = false;
          return;
      }
      setGlobalLightIntensitySlider(roomTheme === 'light' ? 500 : 0);
  }, [roomTheme, setGlobalLightIntensitySlider]);

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        const projectExists = projects.some(p => p.id === projectId);
        if (projectExists) {
            setActiveProjectId(projectId);
        } else {
            alert("The requested project could not be found locally. It may have been deleted, corrupted, or not synchronized. Opening a blank workspace.");
            navigate('/fabflow', { replace: true });
        }
    } else if (!projectId && activeProjectId) {
        navigate(`/fabflow/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, projects, navigate, setActiveProjectId]);

  const primaryMaterialInfo = React.useMemo(() => {
      let type: 'plastic' | 'matte' | 'metallic' = 'metallic';
      let color = "#a1a1aa";
      if (!activeProject?.specs?.materials?.length) return { color, type };
      
      const dominant = activeProject.specs.materials.reduce((prev, curr) => (prev.percentage > curr.percentage) ? prev : curr);
      const m = dominant.material.toLowerCase();
      
      if (m.includes('plastic') || m.includes('abs') || m.includes('poly') || m.includes('nylon')) {
          type = 'plastic';
          color = "#e4e4e7"; 
          if (m.includes('black')) color = "#27272a";
          if (m.includes('white')) color = "#f4f4f5";
      } else if (m.includes('alum')) {
          type = 'metallic';
          color = "#d4d4d8"; 
      } else if (m.includes('steel') || m.includes('iron')) {
          type = 'metallic';
          color = "#71717a";
      } else if (m.includes('copper') || m.includes('brass') || m.includes('bronze')) {
          type = 'metallic';
          color = "#b45309";
      } else if (m.includes('wood') || m.includes('carbon')) {
          type = 'matte';
          color = m.includes('wood') ? "#78350f" : "#18181b"; 
      } else if (m.includes('rubber') || m.includes('silicone')) {
          type = 'matte';
          color = "#27272a";
      }
      return { color, type };
  }, [activeProject?.specs?.materials]);

  React.useEffect(() => {
      setMaterialType(primaryMaterialInfo.type);
  }, [primaryMaterialInfo.type]);

  // Hook vendor matching logic utilizing 4-vector matrix
  const vendorMatches = useMemo(() => {
      if (!activeProject?.specs) return [];
      const partsMap = (activeProject.assemblyParts || []).map(p => ({ id: p.id, name: p.name }));
      const bomMap = (activeProject.specs.bom || []).map((b, i) => ({ id: `bom_${i}`, name: b.component }));
      return runCompetencyMatch(activeProject.specs, partsMap.length > 0 ? partsMap : bomMap);
  }, [activeProject]);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { console.error(err); }
  }, []);

  const handleCloudModalOpen = () => {
      fetchCloudProjects();
      setIsCloudModalOpen(true);
  };

  useEffect(() => { fetchCloudProjects(); }, [fetchCloudProjects]);

  const handleSaveToCloud = async () => {
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;
        if (sizeBytes > 10 * 1024 * 1024) throw new Error("Payload exceeds limit.");

        const ext = activeProject.appExtension || '.fabflow';
        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}${ext}`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta: CloudProject = { id: activeProject.id, name: activeProject.name, sizeBytes, uploadedAt: Date.now(), appExtension: ext };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        alert(`Cloud Delivery Blocked: ${err.message}`);
    } finally {
        setIsCloudSaving(false);
    }
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          if (projectData.id && projectData.name) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              const routeStr = ext === '.dreampro' ? '/prostudio' : ext === '.fabflow' ? '/fabflow' : ext === '.studiosim' ? '/studiosim' : ext === '.wsim' ? '/worldsim' : ext === '.tsim' ? '/tacticalsim' : '/studio';
              navigate(`${routeStr}/${projectData.id}`);
              setIsCloudModalOpen(false);
          }
      } catch (err: any) {
          alert(`Cloud Fetch Failed: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const runDreamproAnalysis = async (jsonText: string) => {
      try {
          const projectData = JSON.parse(jsonText) as DesignProject;
          if (projectData.id) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              setActiveProjectId(projectData.id);
          }

          const partsToAnalyze = projectData.specs?.bom?.length > 0 ? projectData.specs.bom : projectData.nodes;
          if (!partsToAnalyze || partsToAnalyze.length === 0) {
              alert("No physical topology found in this .dreampro asset to extract.");
              return;
          }
          
          const initialState = partsToAnalyze.map((p: any) => ({ name: p.component || p.name, status: 'pending' as BOMExtractionStatus }));
          setBomExtractionState(initialState);
          const newBomItems: any[] = [];
          
          for (let i = 0; i < partsToAnalyze.length; i++) {
              const baseNode = partsToAnalyze[i];
              const partName = baseNode.component || baseNode.name;
              setBomExtractionState(prev => prev!.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));
              
              try {
                  let size = new THREE.Vector3(10, 10, 10);
                  if (baseNode.dimensions) {
                      size = new THREE.Vector3(baseNode.dimensions[0], baseNode.dimensions[1], baseNode.dimensions[2]);
                  } else if (baseNode.type === 'imported_cad' && baseNode.fileData && baseNode.extension === 'stl') {
                      const base64Data = baseNode.fileData.split(',')[1];
                      if (base64Data) {
                          const binaryString = window.atob(base64Data);
                          const bytes = new Uint8Array(binaryString.length);
                          for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
                          const stlGeo = new STLLoader().parse(bytes.buffer);
                          stlGeo.computeBoundingBox();
                          if (stlGeo.boundingBox) {
                              size = stlGeo.boundingBox.max.clone().sub(stlGeo.boundingBox.min);
                          }
                      }
                  }
                  
                  const isMerged = partName.toLowerCase().match(/(bearing|spring|coil|washer|screw|bolt|nut|pin|rivet|bushing)/) !== null;
                  const analysis = await analyzeCADPart({
                      name: partName,
                      dimensions: [size.x, size.y, size.z],
                      color: baseNode.color || [0.5, 0.5, 0.5],
                      isMerged
                  }, projectData.name || "Unknown Assembly");
                  
                  newBomItems.push({
                      component: analysis.component || partName,
                      type: analysis.type || baseNode.type || 'Mechanical',
                      quantity: baseNode.quantity || 1,
                      estimatedCost: analysis.estimatedCost ? String(analysis.estimatedCost) : "2.00",
                      description: analysis.description || ""
                  });
                  
                  setBomExtractionState(prev => prev!.map((item, idx) => idx === i ? { ...item, status: 'success' } : item));
              } catch (err: any) {
                  console.error("Extraction error", err);
                  setBomExtractionState(prev => prev!.map((item, idx) => idx === i ? { ...item, status: 'error', errorMsg: err.message } : item));
              }
          }
          
          const finalSpecs = projectData.specs || {} as any;
          finalSpecs.bom = newBomItems;
          const finalProject = { ...projectData, specs: finalSpecs, appExtension: '.fabflow' }; // Native Persistence hook
          setProjects(prev => {
              const filtered = prev.filter(p => p.id !== finalProject.id);
              return [finalProject, ...filtered];
          });
          setActiveProjectId(finalProject.id);
          
          setTimeout(() => setBomExtractionState(null), 3000);
          
      } catch (e) {
          console.error("Failed to parse .dreampro", e);
          alert("Invalid or corrupted .dreampro architecture.");
          setBomExtractionState(null);
      }
  };

  const handleCloudImportAndAnalyze = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const ext = cloudProj.appExtension || '.dream';
          if (ext !== '.dreampro') {
             alert("Only .dreampro assemblies contain the topological matrices required for AI BOM Extraction.");
             return;
          }
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const text = await response.text();
          setIsCloudModalOpen(false);
          runDreamproAnalysis(text);
      } catch (err: any) {
          alert(`Cloud Fetch Failed: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const runLocalDreamproAnalysis = (project: DesignProject) => {
      setIsProjectModalOpen(false);
      runDreamproAnalysis(JSON.stringify(project));
  };
  
  const handleCloudImportAndAnalyzeSelected = async (cloudProj: CloudProject) => {
      setIsProjectModalOpen(false);
      handleCloudImportAndAnalyze(cloudProj);
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) {
          alert(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteProject = () => {
      if (!activeProject || !window.confirm(`Delete local project "${activeProject.name}"?`)) return;
      setProjects(prev => prev.filter(p => p.id !== activeProject.id));
      navigate('/fabflow');
  };

  const cloudStorageUsed = useMemo(() => cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0), [cloudProjects]);

  const handleGenerateModel = async () => {
      alert("Manufacturing Simulation requires a valid 3D Assembly. Please generate the hardware logic natively inside the Studio.");
      navigate(`/studio/${activeProject?.id || ''}`);
  };

  const handleResApply = async () => {
      if (!activeProject?.openScadCode || !activeProject.specs) return;
      try {
          setIsResizingMesh(true);
          const modifiedScad = `$fn = ${openScadRes};\n$fs = 0.5;\n$fa = 5;\n\n${activeProject.openScadCode}`;
          const stlData = await generateStlFile(activeProject.specs, modifiedScad);
          
          const updatedProj = { ...activeProject, assetUrls: { ...activeProject.assetUrls, stl: stlData } };
          setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
      } catch(err) {
          console.error(err);
          alert("Resolution generation failed: " + (err as any).message);
      } finally {
          setIsResizingMesh(false);
      }
  };

  const handleDownloadProject = () => {
    if (!activeProject) return;
    const dataStr = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject.name.replace(/ /g, '_')}.fabFlow`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteLocalProject = async (id: string) => {
      try {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (activeProjectId === id) setActiveProjectId(null);
      } catch (err) { }
  };



  const gridTemplateColumns = isAgentOpen ? `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px` : `256px minmax(500px, 1fr) 60px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      <ThemePanel className="w-full shrink-0">
        <FileMenuBar projectName={activeProject?.name || 'FabFlow Production'} appType="fabflow" onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} isAgentOpen={isAgentOpen} />
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Local/Cloud Explorer */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={() => { setActiveProjectId(null); navigate('/fabflow'); }} 
            onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)}
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
            onDeleteLocalProject={handleDeleteLocalProject}
            cloudLoadingAction={cloudLoadingAction}
            baseRoute="/fabflow"
            hideNewProjectButton
        />
        
        {/* Central Map / Canvas Area with Split */}
        <div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>
            {/* Top 70% Map / Exploded WebGL Canvas */}
            <ThemePanel translucent className="flex-1 flex flex-col overflow-hidden relative z-10 p-0 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.05)] rounded-lg xl bg-[#09090b]">
            {/* Two-Tier Top Multi-CAD Toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20 relative">
                
                {/* FIRST ROW: File Menu & Main Views */}
                <div className="flex justify-start items-center w-full gap-1">
                    {/* File Main Actions */}
                    <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                        <button onClick={() => navigate('/studio')} className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors" title="New Project">
                            <PlusCircle className="w-5 h-5 drop-shadow-md" />
                        </button>
                        <button onClick={() => handleDownloadProject()} className="p-1.5 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center justify-center gap-1.5" title="Save File Locally">
                            <Save className="w-5 h-5 drop-shadow-md fill-blue-500/10" />
                            <ArrowDownToLine className="w-3.5 h-3.5 opacity-80" />
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={() => alert("Please import natively via ProStudio before running Simulation.")} className="p-1 hover:bg-emerald-900/40 rounded transition-colors flex items-center" title="Load Local File">
                            <div className="relative p-1 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-emerald-500 drop-shadow-md" />
                            </div>
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={() => setIsProjectModalOpen(true)} className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-yellow-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] rounded-lg hover:border-yellow-500/70 hover:bg-yellow-900/40 transition-all text-yellow-400 font-bold text-[9px] uppercase tracking-wider group" title="Import Assembly">
                            <Layers className="w-4 h-4 text-[#3b82f6] group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                            <Factory className="w-4 h-4 text-[#eab308] group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={handleSaveToCloud} disabled={isCloudSaving} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Commit to Remote Cloud">
                            {isCloudSaving ? <RefreshCw className="w-5 h-5 animate-spin drop-shadow-md" /> : <UploadCloud className="w-5 h-5 drop-shadow-md fill-blue-500/20" />}
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={() => { setActiveProjectId(null); navigate('/fabflow'); }} className="p-1.5 text-zinc-300 hover:text-yellow-400 hover:bg-yellow-900/40 rounded transition-colors" title="Close Project">
                            <XSquare className="w-5 h-5 drop-shadow-md" />
                        </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                        <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'in' }))} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-900/40 rounded transition-colors" title="Zoom In">
                            <ZoomIn className="w-5 h-5 drop-shadow-md" />
                        </button>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'out' }))} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-900/40 rounded transition-colors" title="Zoom Out">
                            <ZoomOut className="w-5 h-5 drop-shadow-md" />
                        </button>
                        <div className="w-px h-4 bg-zinc-700/80 mx-1 rounded"></div>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'fit' }))} className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-900/40 rounded transition-colors" title="Zoom to Fit All">
                            <Maximize className="w-5 h-5 drop-shadow-md" />
                        </button>
                    </div>
                </div>

                {/* SECOND ROW: App-Specific Workspace Menubars */}
                <div className="flex justify-start items-center w-full gap-1 mt-1">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
                        
                        {/* Viewport Render Modes */}
                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                            <button onClick={() => setRenderMode('wireframe')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'wireframe' ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Wireframe View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
                                   <circle cx="12" cy="12" r="9" />
                                   <ellipse cx="12" cy="12" rx="9" ry="3.5" />
                                   <ellipse cx="12" cy="12" rx="4" ry="9" />
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('edges')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'edges' ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid + Edge View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <polygon points="12 3 4 7.5 12 12 20 7.5" fill="currentColor" fillOpacity="0.8" />
                                    <polygon points="4 16.5 4 7.5 12 12 12 21" fill="currentColor" fillOpacity="0.4" />
                                    <polygon points="12 21 12 12 20 7.5 20 16.5" fill="currentColor" fillOpacity="0.6" />
                                    <path d="M20 16.5V7.5L12 3 4 7.5v9l8 4.5z" fill="none" stroke={renderMode === 'edges' ? '#eab308' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <polyline points="4 7.5 12 12 20 7.5" fill="none" stroke={renderMode === 'edges' ? '#eab308' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <line x1="12" y1="21" x2="12" y2="12" stroke={renderMode === 'edges' ? '#eab308' : '#18181b'} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('solid')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'solid' ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid Shaded View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <circle cx="12" cy="12" r="9" fill="url(#smooth-grad-sim)" />
                                    <defs>
                                        <radialGradient id="smooth-grad-sim" cx="35%" cy="35%" r="65%">
                                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                                        </radialGradient>
                                    </defs>
                                </svg>
                            </button>

                            <div className="w-px h-5 bg-zinc-700/80 mx-1.5 rounded"></div>

                            <button onClick={() => alert('V-Ray Plugin Not Licensed')} className="relative flex items-center justify-center p-1.5 w-8 h-8 mx-0.5 rounded border border-transparent hover:border-yellow-500/50 hover:bg-yellow-900/40 text-yellow-500 group transition-all duration-300" title="Photorealistic GPU Render">
                                <Aperture className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                                <Sparkles className="w-2.5 h-2.5 absolute top-[4px] right-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-yellow-300" />
                            </button>
                        </div>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>


                        {/* Lighting Toolbar */}
                        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                            <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                               {roomTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="w-px h-5 bg-zinc-700/80 mx-1 rounded"></div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowGrid(!showGrid)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Toggle Grid">
                                   <Grid3X3 className={`w-5 h-5 ${showGrid ? 'text-yellow-500 hover:text-yellow-400' : 'text-zinc-600 hover:text-zinc-500'}`} />
                                </button>
                                <button onClick={() => setShowLightMeshes(!showLightMeshes)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Show/Hide Physical Light Frames">
                                   {showLightMeshes ? <Eye className="w-5 h-5 text-zinc-300 hover:text-white" /> : <EyeOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <button onClick={() => setGlobalLightsOn(!globalLightsOn)} className="p-1.5 outline-none transition-colors block" title="Toggle All Lights">
                                   {globalLightsOn ? <Lightbulb className="w-5 h-5 text-yellow-500 hover:text-yellow-400" /> : <LightbulbOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <input 
                                  type="range" min="-1000" max="1000" step="1" 
                                  value={globalLightIntensitySlider} 
                                  onChange={e => setGlobalLightIntensitySlider(Number(e.target.value))} 
                                  className="w-24 accent-yellow-500 outline-none cursor-pointer" 
                                />
                                <span className="text-xs font-mono w-8 text-zinc-300 flex items-center ml-1">{globalLightIntensitySlider > 0 ? `+${globalLightIntensitySlider}` : globalLightIntensitySlider}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] shrink-0 h-[44px]">
                            <button onClick={() => setIsExploded(!isExploded)} className={`mr-2 p-1.5 rounded transition-colors border ${isExploded ? 'bg-yellow-900/40 text-yellow-400 border-yellow-500/50' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Exploded View (Right-Click Canvas to Cycle Modes)"><Component className="w-5 h-5" /></button>
                            {isExploded && (
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="2"
                                    value={explodeDistance} 
                                    onChange={(e) => setExplodeDistance(Number(e.target.value))}
                                    className="w-16 accent-yellow-500 cursor-pointer mx-1" 
                                    title={`Explosion Distance: ${explodeDistance}%`} 
                                />
                            )}
                        </div>
                    </div>
                    
                    {/* Metrics Toolbar Elements */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700/50 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-sm" title="Virtual Gigafactory Vendor Connect" onClick={() => {}}><Globe2 className="w-4 h-4 text-emerald-500" /></button>
                        <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700/50 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-sm" title="Compliance Validation"><ShieldCheck className="w-4 h-4 text-zinc-400" /></button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full h-full bg-[#09090b] relative cursor-move">
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [100, 75, 100], fov: 45 }}>
                        <color attach="background" args={[roomTheme === 'dark' ? '#09090b' : '#808080']} />
                        <fog attach="fog" args={[roomTheme === 'dark' ? '#09090b' : '#808080', 50, 400]} />
                        
                        <StudioLighting modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalLightIntensitySlider} globalLightsOn={globalLightsOn} roomTheme={roomTheme} />
                        
                        {showGrid && (
                            <Grid 
                               renderOrder={-1} 
                               position={[0, -0.01, 0]} 
                               infiniteGrid 
                               cellSize={10} 
                               cellThickness={0.5} 
                               sectionSize={50} 
                               sectionThickness={1} 
                               cellColor={roomTheme === 'dark' ? '#713f12' : '#fef08a'} 
                               sectionColor={roomTheme === 'dark' ? '#a16207' : '#fde047'} 
                               fadeDistance={200} 
                            />
                        )}

                           <CameraPresets mode={cameraView} />
                           <RoomWalls roomTheme={roomTheme} />
                           <CameraManager />

                        <React.Suspense fallback={null}>
                            <Environment preset="city" />
                            <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                            
                            <group position={[0, 0, 0]}>
                                {activeProject?.nodes && activeProject.nodes.length > 0 ? (
                                    activeProject.nodes.map((node) => (
                                        node.type === 'imported_cad' && node.fileData ? (
                                            <React.Suspense key={node.id} fallback={null}>
                                                <ImportedCADGeometry 
                                                    fileUrl={node.fileData} 
                                                    extension={node.extension || 'stl'} 
                                                    isExploded={isExploded}
                                                    explodeDistance={explodeDistance}
                                                    assemblyName={node.name}
                                                    renderMode={renderMode}
                                                    selectedBomComponent={selectedComponentId}
                                                    hoveredBomComponent={hoveredComponentId}
                                                    onPartClick={(partName) => setSelectedComponentId(prev => prev === partName ? null : partName)}
                                                    onPartHover={(partName) => setHoveredComponentId(partName)}
                                                />
                                            </React.Suspense>
                                        ) : null
                                    ))
                                ) : (
                                    <StlModel stlData={activeProject?.assetUrls?.stl || ''} materialType={materialType} baseColor={primaryMaterialInfo.color} renderMode={renderMode} onLoaded={(size) => setModelSize(size)} />
                                )}
                            </group>
                        </React.Suspense>
                        
                        <GizmoHelper alignment="top-right" margin={[60, 60]}>
                            <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                        </GizmoHelper>

                        <OrbitControls makeDefault autoRotate={false} minDistance={20} maxDistance={500} />
                    </Canvas>
                </div>
                
                {bomExtractionState && (
                    <div className="absolute right-6 top-24 z-50 bg-[#09090b]/95 backdrop-blur-md border border-yellow-500/30 rounded-lg shadow-[10px_10px_30px_rgba(0,0,0,0.5)] w-[320px] max-h-[60vh] flex flex-col overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">
                        <div className="px-3 py-2 border-b border-zinc-800 bg-yellow-900/10 flex justify-between items-center shrink-0">
                            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5"><Bot className="w-3 h-3" /> AI BOM Extraction</span>
                            <button onClick={() => setBomExtractionState(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {bomExtractionState.map((state, idx) => (
                                <div key={idx} className="flex flex-col gap-1 p-2 rounded bg-black border border-zinc-800/80">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-white truncate w-4/5">{state.name}</span>
                                        {state.status === 'pending' && <Clock className="w-3 h-3 text-zinc-500" />}
                                        {state.status === 'processing' && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />}
                                        {state.status === 'success' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                                        {state.status === 'error' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${state.status === 'pending' ? 'text-zinc-600' : state.status === 'processing' ? 'text-yellow-500' : state.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {state.status}
                                        </span>
                                    </div>
                                    {state.errorMsg && <div className="text-[10px] text-red-400 mt-1 leading-tight">{state.errorMsg}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <SimHUD colorClass="yellow" />
            </div>
        </ThemePanel>

        {/* Horizontal Resizer Handle */}
        <div 
          onMouseDown={handleBottomPanelMouseDown}
          className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-yellow-500 transition-colors z-30"
        ></div>

        {/* Bottom Panel */}
        <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border border-yellow-500/10 rounded-xl" style={{ height: bottomPanelHeight }}>
            <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-black/60 relative z-10 flex justify-between items-center shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3.5 h-3.5 text-yellow-500" /> Bill of Materials & Vendor Matching</h2>
                <span className="text-[9px] bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-yellow-500/20 shadow-inner block">Algorithm Under Development</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeProject?.specs?.bom && activeProject.specs.bom.length > 0 ? (
                    <table className="w-full text-left text-xs text-zinc-400 border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                                <th className="py-2.5 px-4 font-bold">Part Name</th>
                                <th className="py-2.5 px-4 font-bold">Material</th>
                                <th className="py-2.5 px-4 font-bold">Est. Cost</th>
                                <th className="py-2.5 px-4 font-bold text-center">Qty</th>
                                <th className="py-2.5 px-4 font-bold">Matched Vendor API</th>
                                <th className="py-2.5 px-4 font-bold text-right">Vendor Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Root Assembly Node */}
                            <tr 
                                className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer ${selectedComponentId === null ? 'bg-zinc-800/50 border-l-2 border-yellow-500' : 'border-l-2 border-transparent'}`}
                                onClick={() => setSelectedComponentId(null)}
                            >
                                <td colSpan={6} className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                                        <Factory className="w-4 h-4 text-yellow-500" />
                                        <span className="font-normal text-zinc-200 tracking-wider text-[11px] uppercase">{activeProject.name || 'Assembly Root'}</span>
                                    </div>
                                </td>
                            </tr>
                            {/* Leaf Component Nodes */}
                            {activeProject.specs.bom.map((part: any, i: number) => {
                                const vMatch = vendorMatches.find(v => v.partId === part.id) || vendorMatches[i % vendorMatches.length];
                                const mat = part.materialType || 'Steel';
                                const parsedCost = part.estimatedCost ? part.estimatedCost.replace(/[^0-9.]/g, '') : "2.00";
                                const isHovered = hoveredComponentId === part.component;
                                const isSelected = selectedComponentId === part.component;

                                return (
                                    <tr
                                        key={`part_${i}`}
                                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer ${isSelected ? 'bg-zinc-800/50 border-l-2 border-yellow-500' : isHovered ? 'bg-zinc-800/40 border-l-2 border-yellow-500' : 'border-l-2 border-transparent'}`}
                                        onMouseEnter={() => setHoveredComponentId(part.component)}
                                        onMouseLeave={() => setHoveredComponentId(null)}
                                        onClick={() => setSelectedComponentId(prev => prev === part.component ? null : part.component)}
                                    >
                                        <td className="py-2.5 pl-10 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full hidden md:block shadow-sm" style={{ backgroundColor: part.color || '#3b82f6' }}></div>
                                                <span className="font-semibold text-zinc-300">{part.component}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 truncate max-w-[120px]" title={mat}>{mat}</td>
                                        <td className="py-2.5 px-4 font-mono text-zinc-300">${Number(parsedCost).toFixed(2)}</td>
                                        <td className="py-2.5 px-4 text-center">{part.quantity || 1}</td>
                                        <td className="py-2.5 px-4 text-emerald-400"><div className="flex items-center gap-1.5"><Factory className="w-3 h-3 text-zinc-500" /> {vMatch?.vendorName || 'ProtoLabs Inc.'}</div></td>
                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-yellow-500">{vMatch?.price || `$${(Number(parsedCost) * 1.5).toFixed(2)}`}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs text-center italic opacity-60">
                        <Box className="w-8 h-8 mb-2 opacity-50 text-yellow-500" />
                        No structural topology ingested yet. Extract assemblies via ProStudio natively.
                    </div>
                )}
            </div>
        </ThemePanel>
    </div>


        {/* Right Vertical Views Bar */}
        <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm rounded-lg overflow-y-auto overflow-x-hidden border border-zinc-800/80 items-center py-2 space-y-2 relative z-20">
            <div className="text-[8px] text-zinc-500 uppercase font-black rotate-180 tracking-widest mb-2" style={{ writingMode: 'vertical-rl' }}>Views</div>
            <button onClick={() => setIsOriginLocked(!isOriginLocked)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 mb-1 border ${isOriginLocked ? 'bg-[#00ffcc]/30 border-[#00ffcc]/40 text-[#00ffcc] shadow-inner' : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#00ffcc]/20 hover:text-[#00ffcc]'}`} title={isOriginLocked ? 'Unlock Camera Matrix' : 'Lock Origin Viewport'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span className="text-[7px] font-black uppercase tracking-widest">Lock</span>
            </button>
            <div className="w-6 h-px bg-zinc-800 my-1 rounded-full"></div>
            {[
                { face: '3D', title: 'Default 3D View' },
                { face: 'TOP', title: 'Top Projection' },
                { face: 'BOTTOM', title: 'Bottom Projection' },
                { face: 'FRONT', title: 'Front Projection' },
                { face: 'REAR', title: 'Rear Projection' },
                { face: 'LEFT', title: 'Left Projection' },
                { face: 'RIGHT', title: 'Right Projection' }
            ].map(v => (
                <button key={v.face} onClick={() => setCameraView(v.face as ViewMode)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${cameraView === v.face ? 'bg-[#00ffcc]/20 shadow-inner' : 'hover:bg-[#00ffcc]/10'}`} title={v.title}>
                    <ViewCubeIcon face={v.face} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${cameraView === v.face ? 'text-[#00ffcc]' : 'text-zinc-600 group-hover:text-[#00ffcc]'}`}>{v.face}</span>
                </button>
            ))}
        </div>

        {isAgentOpen && (
            <>
                <div onMouseDown={() => {}} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-yellow-500 transition-colors flex-shrink-0 z-30 flex items-center justify-center"></div>
                <ThemePanel translucent className="h-full overflow-hidden relative z-10" style={{ width: agentPanelWidth }}>
                    <AgentSidebar onSubmit={(prompt) => console.log('HELO FabFlow prompt:', prompt)} isThinking={false} onClose={() => setIsAgentOpen(false)} />
                </ThemePanel>
            </>
        )}

      </div>

      <CloudLoadModal 
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          projects={cloudProjects}
          onLoad={cloudModalMode === 'analyze' ? handleCloudImportAndAnalyze : handleDownloadFromCloud}
          onDelete={handleDeleteFromCloud}
          loadingAction={cloudLoadingAction}
          appTheme="fabflow"
      />
      <ProjectSelectionModal 
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          projects={projects}
          cloudProjects={cloudProjects}
          onSelectLocal={runLocalDreamproAnalysis}
          onSelectCloud={handleCloudImportAndAnalyzeSelected}
          loadingAction={cloudLoadingAction}
          appTheme="fabflow"
      />
    </div>
  );
};

export default FabFlowPage;
