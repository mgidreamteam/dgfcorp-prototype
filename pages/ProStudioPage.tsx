import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { CloudProject, DesignProject, AgentLog } from '../types';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import ThemePanel from '../components/ThemePanel';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import CloudLoadModal from '../components/CloudLoadModal';
import LoadingModal from '../components/LoadingModal';
import { ImportedCADGeometry } from '../components/ImportedCADGeometry';
import { PlusCircle, Trash2, CloudDownload, XSquare, ZoomIn, ZoomOut } from 'lucide-react';
import { Wrench, X, Box, Cylinder, Cpu, Layers, Maximize2, Move, RefreshCw, MousePointer2, Settings2, UploadCloud, Activity, FileCode2, ArrowDownRight, Expand, Cuboid, Settings, Scissors, Target, ArrowDownToLine, Database, CircleDot, ChevronRight, ChevronDown, Sliders, ArrowDown, Bot, MousePointerClick, AlertCircle, AlertTriangle, Save } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { Geometry, Base, Addition, Subtraction } from '@react-three/csg';
import { OrbitControls, Grid, Environment, ContactShadows, TransformControls, GizmoHelper, GizmoViewport, Edges, Bvh } from '@react-three/drei';
import * as THREE from 'three';

export interface CSGOperation {
    id: string;
    type: 'hole' | 'chamfer' | 'round' | 'taper' | 'countersink' | 'boolean_union' | 'boolean_subtract' | 'edit_base';
    name?: string;
    params: { 
        size: number; 
        depth?: number; 
        angle?: number; 
        position?: [number, number, number]; 
        axis?: 'X' | 'Y' | 'Z' | string;
        width?: number;
        height?: number;
        limitType?: 'blind' | 'through_all' | 'up_to_surface';
        referenceSurfaceId?: string;
        toolNodeId?: string;
        toolNodeData?: any;
    };
}

export interface MechatronicNode {
    id: string;
    type: 'primitive' | 'imported_cad' | 'imported_stl' | 'imported_circuit' | 'imported_dxf';
    name: string;
    shape?: 'box' | 'cylinder' | 'sphere' | 'screw_thread';
    dimensions?: [number, number, number];
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    materialType: 'plastic' | 'metal' | 'fr4' | 'copper' | 'custom';
    color: string;
    functionTag: string;
    fileData?: string; // For STLs/Gerbers/SKIDL
    extension?: string;
    csgStack?: CSGOperation[]; // The definitive order of topological operations on base primitives
}

const ViewCubeIcon = ({ face }: { face: string }) => {
    return (
        <svg viewBox="0 0 100 100" className="w-[30px] h-[30px] transform transition-transform group-hover:scale-[1.15]">
            <g strokeLinejoin="round" strokeLinecap="round" className="stroke-zinc-600 stroke-[4] fill-transparent transition-colors">
                <path d="M50 20 L80 35 L50 50 L20 35 Z" className={face === 'top' ? 'fill-orange-500/60 stroke-orange-400' : face === 'bottom' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M20 35 L50 50 L50 80 L20 65 Z" className={face === 'front' ? 'fill-orange-500/60 stroke-orange-400' : face === 'rear' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M50 50 L80 35 L80 65 L50 80 Z" className={face === 'right' ? 'fill-orange-500/60 stroke-orange-400' : face === 'left' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                {face === '3d' && (
                    <>
                        <path d="M50 20 L80 35 L50 50 L20 35 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <path d="M20 35 L50 50 L50 80 L20 65 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <path d="M50 50 L80 35 L80 65 L50 80 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <circle cx="50" cy="50" r="12" className="fill-orange-500 stroke-orange-400" />
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

const MeshedCubeIcon = () => (
    <svg viewBox="0 0 100 100" className="w-6 h-6 overflow-visible">
        <g strokeLinejoin="round" strokeLinecap="round" className="stroke-zinc-300 stroke-[3.5] fill-transparent">
            <path d="M50 20 L80 35 L50 50 L20 35 Z" className="fill-black/40" />
            <path d="M20 35 L50 50 L50 80 L20 65 Z" className="fill-black/60" />
            <path d="M50 50 L80 35 L80 65 L50 80 Z" className="fill-black/50" />
            <path d="M60 40 L60 70 M70 35 L70 65 M50 60 L80 45 M50 70 L80 55" className="stroke-zinc-500 stroke-[1.5]" />
            <path d="M40 40 L40 70 M30 35 L30 65 M50 60 L20 45 M50 70 L20 55" className="stroke-zinc-500 stroke-[1.5]" />
            <path d="M35 27.5 L65 42.5 M65 27.5 L35 42.5" className="stroke-zinc-500 stroke-[1.5]" />
        </g>
    </svg>
);

// Controls the camera natively driven by Side Panel State
const CameraController = ({ view }: { view: string }) => {
    const { camera } = useThree();

    useEffect(() => {
        const d = 80;
        switch (view) {
            case 'top': camera.position.set(0, d, 0); break;
            case 'bottom': camera.position.set(0, -d, 0); break;
            case 'front': camera.position.set(0, 0, d); break;
            case 'rear': camera.position.set(0, 0, -d); break;
            case 'left': camera.position.set(-d, 0, 0); break;
            case 'right': camera.position.set(d, 0, 0); break;
            case '3d': camera.position.set(50, 40, 50); break;
        }
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }, [view, camera]);

    return null;
};

const MechatronicNodeMesh = React.memo(({
    node,
    index,
    isExploded,
    nodesLength,
    csgMode,
    isSelected,
    isHovered,
    csgPendingPlacement,
    csgEditTarget,
    csgDialogParams,
    renderMode,
    setSelectedNodeId,
    setCsgPendingPlacement,
    setCsgDialogParams,
    setHoverFace,
    setHoverFaceData
}: any) => {
    const offset = isExploded ? [(index - nodesLength / 2) * 30, Math.sin(index) * 20, (index % 3) * 30] : [0, 0, 0];
    const posX = node.position[0] + offset[0];
    const posY = node.position[1] + offset[1];
    const posZ = node.position[2] + offset[2];

    return (
        <group position={[posX, posY, posZ]} rotation={node.rotation} scale={node.scale}>
            <Bvh firstHitOnly>
                <mesh
                    castShadow
                    receiveShadow
                    onClick={(e) => {
                        e.stopPropagation();
                    if (csgPendingPlacement === 'boolean_union' || csgPendingPlacement === 'boolean_subtract') {
                        if (!isSelected) {
                            setCsgDialogParams((prev: any) => ({ ...prev, toolNodeId: node.id }));
                        }
                        return;
                    }

                    setSelectedNodeId(node.id);
                    const activeCsgType = csgPendingPlacement || (csgEditTarget ? node.csgStack?.find((c: any) => c.id === csgEditTarget.csgId)?.type : null);
                    
                    if (!activeCsgType && !csgEditTarget) {
                        setCsgPendingPlacement('edit_base');
                        setCsgDialogParams((prev: any) => ({
                            ...prev, 
                            size: node.dimensions?.[0] || 10, width: node.dimensions?.[0] || 10, height: node.dimensions?.[1] || 10, depth: node.dimensions?.[2] || 10, axis: 'Y',
                            tx: node.position?.[0] || 0,
                            ty: node.position?.[1] || 0,
                            tz: node.position?.[2] || 0,
                            rx: Math.round((node.rotation?.[0] || 0) * 180 / Math.PI),
                            ry: Math.round((node.rotation?.[1] || 0) * 180 / Math.PI),
                            rz: Math.round((node.rotation?.[2] || 0) * 180 / Math.PI)
                        }));
                        return;
                    }
                    
                    if (e.face && activeCsgType) {
                        let axisName = 'top';
                        const n = e.face.normal;
                        const tol = 0.5;
                        if (activeCsgType === 'chamfer' || activeCsgType === 'round') {
                            const localP = e.object.worldToLocal(e.point.clone());
                            const d = node.dimensions || [10, 10, 10];
                            const eT = 1.0; 
                            const isX = Math.abs(Math.abs(localP.x) - d[0]/2) < eT;
                            const isY = Math.abs(Math.abs(localP.y) - d[1]/2) < eT;
                            const isZ = Math.abs(Math.abs(localP.z) - d[2]/2) < eT;
                            
                            if (isX && isY) axisName = (localP.y > 0 ? 'top' : 'bottom') + '-' + (localP.x > 0 ? 'right' : 'left');
                            else if (isY && isZ) axisName = (localP.y > 0 ? 'top' : 'bottom') + '-' + (localP.z > 0 ? 'front' : 'rear');
                            else if (isZ && isX) axisName = (localP.z > 0 ? 'front' : 'rear') + '-' + (localP.x > 0 ? 'right' : 'left');
                            else axisName = (n.y > tol ? 'top' : n.y < -tol ? 'bottom' : n.z > tol ? 'front' : n.z < -tol ? 'rear' : n.x > tol ? 'right' : 'left');
                        } else {
                            axisName = (n.y > tol ? 'top' : n.y < -tol ? 'bottom' : n.z > tol ? 'front' : n.z < -tol ? 'rear' : n.x > tol ? 'right' : 'left');
                        }

                        if (activeCsgType === 'hole' && csgDialogParams.limitType === 'up_to_surface' && csgDialogParams.axis) {
                            setCsgDialogParams((prev: any) => ({ ...prev, referenceSurfaceId: axisName as any }));
                        } else if (activeCsgType === 'taper' && csgDialogParams.axis) {
                            setCsgDialogParams((prev: any) => ({ ...prev, referenceSurfaceId: axisName as any }));
                        } else {
                            setCsgDialogParams((prev: any) => ({ ...prev, axis: axisName as any }));
                        }
                    }
                }}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (e.face && e.point) {
                        const objectMatrix = e.object.matrixWorld.clone();
                        const normalMatrix = new THREE.Matrix3().getNormalMatrix(objectMatrix);
                        const worldNormal = e.face.normal.clone().applyMatrix3(normalMatrix).normalize();
                        setHoverFaceData({ nodeId: node.id, point: e.point.clone(), normal: worldNormal });
                    }
                }}
                onPointerOver={(e) => { e.stopPropagation(); setHoverFace(node.id); }}
                onPointerOut={(e) => { setHoverFace(null); setHoverFaceData(null); }}
                onDoubleClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
            >
                {(node.type === 'primitive' || node.type === 'imported_circuit' || node.type === 'imported_dxf') && (
                    <Geometry>
                        <Base>
                            {node.shape === 'box' && <boxGeometry args={node.dimensions || [10, 10, 10]} />}
                            {node.shape === 'cylinder' && <cylinderGeometry args={node.dimensions || [5, 5, 20]} />}
                            {node.shape === 'sphere' && <sphereGeometry args={[node.dimensions?.[0] || 10, 32, 32]} />}
                            {node.shape === 'screw_thread' && <cylinderGeometry args={node.dimensions || [3, 3, 15]} />}
                            {node.type === 'imported_circuit' && <boxGeometry args={[60, 2, 40]} />}
                            {node.type === 'imported_dxf' && <boxGeometry args={[20, 20, 20]} />}
                        </Base>

                        {node.csgStack && node.csgStack.map((csg: any) => {
                            const pos = csg.params.position || [0, 0, 0];
                            const depth = csg.params.depth || (csg.type === 'hole' ? 15 : 5);
                            const size = csg.params.size || 2;

                            const axis = csg.params.axis || 'Y';
                            let finalRot = [0, 0, 0] as [number, number, number];
                            let finalPos = [...pos] as [number, number, number];

                            const dim = node.dimensions || [10, 10, 10];
                            let calculatedDepth = csg.params.depth || (csg.type === 'hole' ? 15 : 5);
                            let pushInMargin = 0;
                            
                            if (csg.type === 'hole') {
                                if (csg.params.limitType === 'through_all') {
                                    calculatedDepth = Math.max(dim[0], dim[1], dim[2]) * 1.5; // push completely through geometry
                                } else if (csg.params.limitType === 'up_to_surface') {
                                    calculatedDepth = dim[axis === 'X' || axis === 'right' || axis === 'left' ? 0 : axis === 'Z' || axis === 'front' || axis === 'rear' ? 2 : 1]; // naive bounding surface
                                }
                                calculatedDepth += 2; // Prevent coplanar sealing (Z-fighting) at start face
                                pushInMargin = 1;
                            }

                            let toolArgs = [dim[0] + 1, size, dim[2] + 1] as [number, number, number];
                            
                            if (axis === 'right' || axis === 'X') { finalRot = [0, 0, Math.PI / 2]; finalPos = [dim[0] / 2, 0, 0]; }
                            else if (axis === 'left') { finalRot = [0, 0, Math.PI / 2]; finalPos = [-dim[0] / 2, 0, 0]; }
                            else if (axis === 'front' || axis === 'Z') { finalRot = [Math.PI / 2, 0, 0]; finalPos = [0, 0, dim[2] / 2]; }
                            else if (axis === 'rear') { finalRot = [Math.PI / 2, 0, 0]; finalPos = [0, 0, -dim[2] / 2]; }
                            else if (axis === 'top' || axis === 'Y') { finalRot = [0, 0, 0]; finalPos = [0, dim[1] / 2, 0]; }
                            else if (axis === 'bottom') { finalRot = [0, 0, 0]; finalPos = [0, -dim[1] / 2, 0]; }
                            if (axis.includes('-')) {
                                const exY = axis.includes('top') ? dim[1]/2 : axis.includes('bottom') ? -dim[1]/2 : 0;
                                const exX = axis.includes('right') ? dim[0]/2 : axis.includes('left') ? -dim[0]/2 : 0;
                                const exZ = axis.includes('front') ? dim[2]/2 : axis.includes('rear') ? -dim[2]/2 : 0;
                                finalPos = [exX, exY, exZ];

                                if (exZ === 0) { 
                                    finalRot = [0, 0, Math.PI/4]; 
                                    toolArgs = [size*2.8, size*2.8, dim[2]+1]; 
                                } else if (exX === 0) { 
                                    finalRot = [Math.PI/4, 0, 0]; 
                                    toolArgs = [dim[0]+1, size*2.8, size*2.8]; 
                                } else if (exY === 0) { 
                                    finalRot = [0, Math.PI/4, 0]; 
                                    toolArgs = [size*2.8, dim[1]+1, size*2.8]; 
                                }

                                if (csg.type === 'chamfer') {
                                    const offset = size / 2.0;
                                    if (exX !== 0) finalPos[0] += Math.sign(exX) * offset;
                                    if (exY !== 0) finalPos[1] += Math.sign(exY) * offset;
                                    if (exZ !== 0) finalPos[2] += Math.sign(exZ) * offset;
                                }
                            }

                            if (csg.type === 'hole') {
                                const pushIn = (calculatedDepth / 2) - pushInMargin;
                                const ax = axis.includes('-') ? axis.split('-')[0] : axis;
                                if (ax === 'top') finalPos[1] -= pushIn;
                                if (ax === 'bottom') finalPos[1] += pushIn;
                                if (ax === 'right' || ax === 'X') finalPos[0] -= pushIn;
                                if (ax === 'left') finalPos[0] += pushIn;
                                if (ax === 'front' || ax === 'Z') finalPos[2] -= pushIn;
                                if (ax === 'rear') finalPos[2] += pushIn;
                            }

                            if (csg.type === 'countersink') {
                                const pushIn = calculatedDepth / 2;
                                if (axis === 'top') { finalRot = [Math.PI, 0, 0]; finalPos[1] -= pushIn; }
                                if (axis === 'bottom') { finalRot = [0, 0, 0]; finalPos[1] += pushIn; }
                                if (axis === 'right') { finalRot = [0, 0, Math.PI/2]; finalPos[0] -= pushIn; }
                                if (axis === 'left') { finalRot = [0, 0, -Math.PI/2]; finalPos[0] += pushIn; }
                                if (axis === 'front') { finalRot = [Math.PI/2, 0, 0]; finalPos[2] -= pushIn; }
                                if (axis === 'rear') { finalRot = [-Math.PI/2, 0, 0]; finalPos[2] += pushIn; }
                            }

                            let taperArgs = [0,0,0] as any;
                            if (csg.type === 'taper') {
                                const ang = (csg.params.angle || 0) * (Math.PI/180);
                                const R = Math.max(dim[0], dim[1], dim[2]) * 2 + 50;
                                taperArgs = [R*2, R*2, R*2];
                                
                                if (axis === 'top') {
                                    finalRot = [ang, 0, 0];
                                    finalPos = [0, dim[1]/2 + R*Math.cos(ang), R*Math.sin(ang)];
                                } else if (axis === 'bottom') {
                                    finalRot = [-ang, 0, 0];
                                    finalPos = [0, -dim[1]/2 - R*Math.cos(ang), R*Math.sin(ang)];
                                } else if (axis === 'right') {
                                    finalRot = [0, 0, ang];
                                    finalPos = [dim[0]/2 + R*Math.cos(ang), R*Math.sin(ang), 0];
                                } else if (axis === 'left') {
                                    finalRot = [0, 0, -ang];
                                    finalPos = [-dim[0]/2 - R*Math.cos(ang), R*Math.sin(ang), 0];
                                } else if (axis === 'front') {
                                    finalRot = [-ang, 0, 0];
                                    finalPos = [0, R*Math.sin(ang), dim[2]/2 + R*Math.cos(ang)];
                                } else if (axis === 'rear') {
                                    finalRot = [ang, 0, 0];
                                    finalPos = [0, R*Math.sin(ang), -dim[2]/2 - R*Math.cos(ang)];
                                }
                            }

                            return (
                                <React.Fragment key={csg.id}>
                                {csg.type === 'boolean_union' || csg.type === 'boolean_subtract' ? (
                                    <React.Fragment key={csg.id}>
                                        {csg.params.toolNodeData && (() => {
                                            const t = csg.params.toolNodeData as MechatronicNode;
                                            // Calculate relative offset from target to tool dynamically mapping structural offsets
                                            const rPos = [t.position[0] - node.position[0], t.position[1] - node.position[1], t.position[2] - node.position[2]] as [number, number, number];
                                            const rRot = t.rotation;
                                            const scale = t.scale;
                                            const Wrapper = csg.type === 'boolean_union' ? Addition : Subtraction;
                                            return (
                                                <Wrapper position={rPos} rotation={rRot} scale={scale}>
                                                    {t.shape === 'box' && <boxGeometry args={t.dimensions || [10, 10, 10]} />}
                                                    {t.shape === 'cylinder' && <cylinderGeometry args={t.dimensions || [5, 5, 20]} />}
                                                    {t.shape === 'screw_thread' && <cylinderGeometry args={t.dimensions || [3, 3, 15]} />}
                                                    {t.shape === 'sphere' && <sphereGeometry args={[t.dimensions?.[0] || 5, 32, 32]} />}
                                                    {!t.shape && <boxGeometry args={[20, 20, 20]} />}
                                                </Wrapper>
                                            );
                                        })()}
                                    </React.Fragment>
                                ) : csg.type === 'round' ? (
                                    <>
                                        {/* Faceted round edge subtraction matrix */}
                                        {[18, 36, 54, 72].map(a => {
                                            const ang = a * Math.PI/180;
                                            const bS = size * 2; // block size (diameter constraint)
                                            const isZEdge = !axis.includes('front') && !axis.includes('rear');
                                            const isXEdge = !axis.includes('right') && !axis.includes('left');
                                            const isYEdge = !axis.includes('top') && !axis.includes('bottom');
                                            
                                            const blockArgs = isZEdge ? [bS,bS,dim[2]+1] : (isXEdge ? [dim[0]+1,bS,bS] : [bS,dim[1]+1,bS]);
                                            let x = finalPos[0], y = finalPos[1], z = finalPos[2];
                                            let rx = finalRot[0], ry = finalRot[1], rz = finalRot[2];
                                            
                                            if (isZEdge) {
                                                const cx = x - Math.sign(x)*size;
                                                const cy = y - Math.sign(y)*size;
                                                x = cx + Math.sign(x)*(2*size)*Math.cos(ang);
                                                y = cy + Math.sign(y)*(2*size)*Math.sin(ang);
                                                rz = ang;
                                            } else if (isXEdge) {
                                                const cy = y - Math.sign(y)*size;
                                                const cz = z - Math.sign(z)*size;
                                                y = cy + Math.sign(y)*(2*size)*Math.cos(ang);
                                                z = cz + Math.sign(z)*(2*size)*Math.sin(ang);
                                                rx = ang;
                                            } else if (isYEdge) {
                                                const cx = x - Math.sign(x)*size;
                                                const cz = z - Math.sign(z)*size;
                                                x = cx + Math.sign(x)*(2*size)*Math.cos(ang);
                                                z = cz + Math.sign(z)*(2*size)*Math.sin(ang);
                                                ry = ang;
                                            }
                                            
                                            return (
                                                <Subtraction key={`${csg.id}_${a}`} position={[x,y,z]} rotation={[rx,ry,rz]}>
                                                    <boxGeometry args={blockArgs as any} />
                                                </Subtraction>
                                            )
                                        })}
                                    </>
                                ) : (
                                <Subtraction key={csg.id} position={finalPos} rotation={finalRot}>
                                    {csg.type === 'hole' && <cylinderGeometry args={[size, size, calculatedDepth, 32]} />}
                                    {csg.type === 'chamfer' && <boxGeometry args={toolArgs} />}
                                    {csg.type === 'taper' && <boxGeometry args={taperArgs as any} />}
                                    {csg.type === 'countersink' && <coneGeometry args={[size, calculatedDepth]} />}
                                </Subtraction>
                                )}
                                </React.Fragment>
                            );
                        })}
                    </Geometry>
                )}

                {(node.type === 'imported_cad' || node.type === 'imported_stl') && node.fileData && (
                    <ImportedCADGeometry fileUrl={node.fileData} extension={node.extension || 'stl'} />
                )}

                <meshStandardMaterial
                    color={node.color}
                    roughness={node.shape === 'screw_thread' ? 0.6 : 0.3}
                    metalness={node.shape === 'screw_thread' || node.type === 'imported_circuit' ? 0.9 : 0.8}
                    wireframe={renderMode === 'wireframe'}
                />
                {renderMode === 'edges' && !['imported_cad', 'imported_dxf'].includes(node.type as string) && <Edges threshold={15} color="#3b82f6" />}
                {isSelected && renderMode !== 'edges' && !['imported_cad', 'imported_dxf'].includes(node.type as string) && <Edges threshold={15} color="#3b82f6" />}
                {isHovered && !isSelected && renderMode !== 'edges' && !['imported_cad', 'imported_dxf'].includes(node.type as string) && <Edges threshold={15} color="#60a5fa" opacity={0.5} transparent />}
            </mesh>
            </Bvh>
        </group>
    );
}, (prev, next) => {
    if (prev.node !== next.node) return false;
    if (prev.isExploded !== next.isExploded) return false;
    if (prev.nodesLength !== next.nodesLength) return false;
    if (prev.csgMode !== next.csgMode) return false;
    if (prev.renderMode !== next.renderMode) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isHovered !== next.isHovered) return false;
    
    if (next.isSelected || next.csgEditTarget?.nodeId === next.node.id || prev.csgEditTarget?.nodeId === prev.node.id) {
        if (prev.csgPendingPlacement !== next.csgPendingPlacement) return false;
        if (prev.csgDialogParams !== next.csgDialogParams) return false;
        if (prev.csgEditTarget !== next.csgEditTarget) return false;
    }
    return true;
});

class EngineErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("ProStudio Engine Crash Intercepted:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return <>{this.props.fallback}</>;
        }
        return <>{this.props.children}</>;
    }
}

const ProStudioPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();

    const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
    const [isCloudSaving, setIsCloudSaving] = useState(false);
    const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
    const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

    // Mechatronics CAD Engine State
    const [nodes, setNodes] = useState<MechatronicNode[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [agentPanelWidth, setAgentPanelWidth] = useState(300);
    const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'edges'>('solid');
    const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
    const [hoverFace, setHoverFace] = useState<string | null>(null);
    const [csgMode, setCsgMode] = useState<'Assembly' | 'Part' | 'Circuit'>('Assembly');
    const [cameraView, setCameraView] = useState<'3d' | 'top' | 'bottom' | 'front' | 'rear' | 'left' | 'right'>('3d');
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const [isUploading, setIsUploading] = useState(false);
    const [agentPrompt, setAgentPrompt] = useState('');
    const [isAgentThinking, setIsAgentThinking] = useState(false);
    const [isExploded, setIsExploded] = useState(false);

    const [contextMenuTarget, setContextMenuTarget] = useState<{ nodeId: string, csgId?: string } | null>(null);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const contextMenuTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [assemblyName, setAssemblyName] = useState('');
    const [isEditingRoot, setIsEditingRoot] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
    const [globalUnits, setGlobalUnits] = useState('mm');

    const [isOriginLocked, setIsOriginLocked] = useState(false);
    const [pendingMaterialChange, setPendingMaterialChange] = useState<{nodeId: string, color: string, type: string} | null>(null);

    const isClearingRef = React.useRef(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [justSavedLocal, setJustSavedLocal] = useState(false);

    const [csgPendingPlacement, setCsgPendingPlacement] = useState<CSGOperation['type'] | null>(null);
    const [csgEditTarget, setCsgEditTarget] = useState<{ nodeId: string, csgId: string } | null>(null);
    const [csgDialogParams, setCsgDialogParams] = useState<{ size: number, depth: number, angle: number, axis: string, width?: number, height?: number, limitType?: 'blind' | 'through_all' | 'up_to_surface', referenceSurfaceId?: string, toolNodeId?: string, toolNodeData?: any, editTab?: 'size'|'translate'|'rotate'|'mirror', tx?: number, ty?: number, tz?: number, rx?: number, ry?: number, rz?: number, mirrorPlane?: 'XY'|'YZ'|'XZ' }>({ size: 2, depth: 10, angle: 45, axis: 'Y', limitType: 'blind', editTab: 'size', tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0 });

    const [eventLog, setEventLog] = useState<{id: string, timestamp: number, type: 'agent'|'manual'|'system'|'error', message: string}[]>([]);
    const [hoverFaceData, setHoverFaceData] = useState<{ nodeId: string, point: THREE.Vector3, normal: THREE.Vector3 } | null>(null);

    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingCsgId, setEditingCsgId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState('');

    const commitRename = () => {
        if (!editingNodeId) return;
        if (editNameValue.trim()) {
            if (editingCsgId) {
                setNodes(prev => prev.map(n => n.id === editingNodeId ? {
                    ...n,
                    csgStack: n.csgStack?.map(c => c.id === editingCsgId ? { ...c, name: editNameValue.trim() } : c)
                } : n)
                );
            } else {
                updateNode(editingNodeId, { name: editNameValue.trim() });
            }
        }
        setEditingNodeId(null);
        setEditingCsgId(null);
    };

    const logEvent = (type: 'agent'|'manual'|'system'|'error', message: string) => {
        setEventLog(prev => [{ id: `log_${Date.now()}_${Math.random()}`, timestamp: Date.now(), type, message }, ...prev].slice(0, 100));
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectId && projectId !== activeProjectId) {
            const projectExists = projects.some(p => p.id === projectId);
            if (projectExists) {
                setActiveProjectId(projectId);
            } else {
                alert("The requested project could not be found locally. It may have been deleted, corrupted, or not synchronized. Opening a blank workspace.");
                navigate('/prostudio', { replace: true });
            }
        } else if (!projectId && activeProjectId) {
            navigate(`/prostudio/${activeProjectId}`, { replace: true });
        }
    }, [projectId, activeProjectId, projects, navigate, setActiveProjectId]);

    const activeProject = projects.find(p => p.id === activeProjectId);

    // Synchronization Locks
    const isHydrating = React.useRef(true);
    const lastActiveId = React.useRef<string | null>(null);

    // Initial hydration when a project is selected or loaded
    useEffect(() => {
        if (activeProjectId !== lastActiveId.current) {
            isHydrating.current = true;
            lastActiveId.current = activeProjectId;
            
            if (activeProject) {
                setAssemblyName(activeProject.name);
                setNodes(activeProject.nodes || []);
            } else {
                setAssemblyName('Unsaved Assembly');
                setNodes([]);
            }
        }
    }, [activeProjectId, activeProject]);

    // Continuous propagation of local geometry manipulations into global context
    useEffect(() => {
        if (isHydrating.current) {
            // First pass after an ID change: skip saving to prevent overwriting with old local state
            isHydrating.current = false;
            setHasUnsavedChanges(false);
            return;
        }

        if (isClearingRef.current) {
            isClearingRef.current = false;
            setHasUnsavedChanges(false);
            return;
        }

        setHasUnsavedChanges(true); // Flag manual topological modifications
        if (activeProjectId) {
            setProjects(prev => prev.map(p => 
                p.id === activeProjectId ? { ...p, nodes, name: assemblyName } : p
            ));
        }
    }, [nodes, assemblyName, activeProjectId, setProjects]);

    const handleRenameRoot = () => {
        if (activeProject && assemblyName.trim()) {
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, name: assemblyName.trim() } : p));
        } else if (!activeProject && assemblyName.trim() === '') {
            setAssemblyName('Unsaved Assembly');
        } else if (activeProject && assemblyName.trim() === '') {
            setAssemblyName(activeProject.name);
        }
        setIsEditingRoot(false);
    };

    const fetchCloudProjects = async () => {
        if (!auth.currentUser) return;
        try {
            const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
            setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
        } catch (err) {
            console.error("Failed to sync cloud registry", err);
        }
    };

    const handleCloudModalOpen = () => {
        fetchCloudProjects();
        setIsCloudModalOpen(true);
    };

    useEffect(() => {
        fetchCloudProjects();
    }, []);

    const [materialsLib, setMaterialsLib] = useState<any[]>([]);
    useEffect(() => {
        const fetchMaterials = async () => {
            try {
                const snap = await getDocs(collection(db, 'materialLibrary'));
                setMaterialsLib(snap.docs.map(d => d.data()));
            } catch (e) {
                console.error("Failed to fetch material library", e);
            }
        };
        fetchMaterials();
    }, []);

    const cloudStorageUsed = cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0);

    const encodeProjectBlobs = async (project: any) => {
        if (!project) return null;
        const cloned = JSON.parse(JSON.stringify(project));
        for (const node of cloned.nodes) {
            if (node.fileData && node.fileData.startsWith('blob:')) {
                try {
                    const response = await fetch(node.fileData);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const base64 = await new Promise((resolve, reject) => {
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    node.fileData = base64;
                } catch (e) {
                    console.error("Failed to encode blob for node", node.id, e);
                }
            }
        }
        return cloned;
    };

    const handleSaveToCloud = async () => {
        if (!activeProject || !auth.currentUser) return;
        try {
            setIsCloudSaving(true);
            const encodedProject = await encodeProjectBlobs(activeProject);
            const dataStr = JSON.stringify(encodedProject);
            const sizeBytes = new Blob([dataStr]).size;

            const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dreampro`);
            await uploadString(fileRef, dataStr, 'raw');

            const cloudMeta: CloudProject = {
                id: activeProject.id,
                name: activeProject.name,
                sizeBytes,
                uploadedAt: Date.now(),
                appExtension: '.dreampro'
            };
            await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);

            await fetchCloudProjects();
            window.dispatchEvent(new Event('update-cloud-quota'));
        } catch (err: any) {
            alert(`Cloud Delivery Blocked: ${err.message}`);
        } finally {
            setIsCloudSaving(false);
        }
    };

    const handleSaveLocal = async () => {
        if (!activeProject) return;
        const encodedProject = await encodeProjectBlobs(activeProject);
        const dataStr = JSON.stringify(encodedProject);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeProject.name}_ProStudio.dreampro`;
        a.click();
        URL.revokeObjectURL(url);
        
        setHasUnsavedChanges(false);
        setJustSavedLocal(true);
        setTimeout(() => setJustSavedLocal(false), 3000);
        logEvent('system', 'Project exported securely to local disk.');
    };

    const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
        if (!auth.currentUser) return;
        try {
            setCloudLoadingAction(cloudProj.id);
            const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dreampro`);
            const url = await getDownloadURL(fileRef);
            const response = await fetch(url);
            const text = await response.text();
            const projectData = JSON.parse(text) as DesignProject;

            if (projectData.id && projectData.name) {
                setProjects(prev => {
                    const filtered = prev.filter(p => p.id !== projectData.id);
                    return [projectData, ...filtered];
                });
                navigate(`/prostudio/${projectData.id}`);
                setIsCloudModalOpen(false);
            }
        } catch (err: any) {
            alert(`Cloud Retrieval Failed: ${err.message}`);
        } finally {
            setCloudLoadingAction(null);
        }
    };

    const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
        if (!auth.currentUser) return;
        try {
            if (!window.confirm("Delete cloud asset permanently?")) return;
            setCloudLoadingAction(cloudProj.id);
            const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dreampro`);
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result as string;
            
            const newNode: MechatronicNode = {
                id: `node_${Date.now()}`,
                type: ['stl', 'obj', 'step', 'stp', 'iges', 'igs'].includes(ext) ? 'imported_cad' : ['skidl', 'gerber', 'gbr'].includes(ext) ? 'imported_circuit' : 'imported_dxf',
                name: file.name,
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                materialType: ext === 'skidl' || ext === 'gbr' ? 'fr4' : 'metal',
                color: ext === 'skidl' || ext === 'gbr' ? '#065f46' : '#71717a',
                functionTag: ext === 'skidl' || ext === 'gbr' ? 'PCB Routing / Logic' : 'Structural Component',
                fileData: base64Data,
                extension: ext
            };
            
            const isUnsavedOrSystemName = !activeProjectId || assemblyName === 'Unsaved Assembly' || assemblyName === '' || /^Assembly_\d+$/.test(assemblyName);
            
            setNodes(prev => [...prev, newNode]);
            
            if (isUnsavedOrSystemName) {
                setAssemblyName(baseName);
                if (activeProjectId) {
                    setProjects(all => all.map(p => p.id === activeProjectId ? { ...p, name: baseName } : p));
                } else {
                    const newId = `proj_${Date.now()}`;
                    const newProj = { id: newId, name: baseName, nodes: [newNode], lastModified: Date.now(), createdAt: Date.now(), prompt: '', specs: null, assetUrls: null, status: 'IDLE', isConstrained: false, appExtension: '.dreampro' } as any;
                    setProjects(all => [newProj, ...all]);
                    setActiveProjectId(newId);
                }
            }
            
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSelectedNodeId(newNode.id);
            setIsUploading(false);
        };
        reader.onerror = () => {
            console.error("Failed to read imported CAD file.");
            setIsUploading(false);
        };
        
        reader.readAsDataURL(file);
    };

    const addPrimitive = (shape: 'box' | 'cylinder' | 'sphere' | 'screw_thread') => {
        // Dimensions map: Box[x,y,z], Cylinder[rad,rad,h], Thread[rad,rad,h], Sphere[r,seg,seg]
        const defaultDims = shape === 'box' ? [10, 10, 10] : shape === 'cylinder' ? [5, 5, 20] : shape === 'screw_thread' ? [3, 3, 15] : [10, 10, 10];

        // Calculate Y-offset to ground the base explicitly on the XZ plane grid (Y=0)
        let yOffset = 0;
        if (shape === 'box') yOffset = defaultDims[1] / 2;
        else if (shape === 'cylinder' || shape === 'sphere') yOffset = defaultDims[2] / 2;
        else if (shape === 'screw_thread') yOffset = defaultDims[0]; // Rests on its side radially

        const newNode: MechatronicNode = {
            id: `prim_${Date.now()}`,
            type: 'primitive',
            name: shape === 'screw_thread' ? 'M3 Fastener' : `Standard ${shape.charAt(0).toUpperCase() + shape.slice(1)}`,
            shape,
            dimensions: defaultDims as [number, number, number],
            position: [0, yOffset, 0],
            rotation: shape === 'screw_thread' ? [Math.PI / 2, 0, 0] : [0, 0, 0],
            scale: [1, 1, 1],
            materialType: shape === 'screw_thread' ? 'metal' : 'plastic',
            color: shape === 'screw_thread' ? '#71717a' : '#e4e4e7',
            functionTag: shape === 'screw_thread' ? 'Mechanical Fastener' : 'Housing / Enclosure',
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
    };

    const updateNode = (id: string, updates: Partial<MechatronicNode>) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const removeNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const handleDeleteContextTarget = () => {
        if (!contextMenuTarget) return;
        if (contextMenuTarget.csgId) {
            setNodes(prev => prev.map(n => n.id === contextMenuTarget.nodeId ? { ...n, csgStack: n.csgStack?.filter(csg => csg.id !== contextMenuTarget.csgId) } : n));
        } else {
            setNodes(prev => prev.filter(n => n.id !== contextMenuTarget.nodeId));
            if (selectedNodeId === contextMenuTarget.nodeId) setSelectedNodeId(null);
        }
        setContextMenuTarget(null);
    };

    const handleAgentSubmit = async (prompt: string) => {
        if (!prompt.trim()) return;
        setIsAgentThinking(true);

        await new Promise(r => setTimeout(r, 800)); // Simulate Gemini Processing

        const lower = prompt.toLowerCase();
        const vectorMatch = lower.match(/(?:move|translate|shift|position).*?\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]/);

        const xzPlaneMatch = lower.match(/(?:move|translate|shift|position).*?xz\splane/i);
        const xyPlaneMatch = lower.match(/(?:move|translate|shift|position).*?xy\splane/i);
        const yzPlaneMatch = lower.match(/(?:move|translate|shift|position).*?yz\splane/i);
        
        const offsetMatch = lower.match(/(?:up|down|above|below|higher|lower).*?(\d+)(?:mm|cm|m)?/i);

        let targetNodeId = selectedNodeId;
        if (!targetNodeId && !lower.match(/\b(add|create|insert|make)\b/)) {
            // Attempt conversational contextual binding
            let guess = nodes.find(n => n.name && lower.includes(n.name.toLowerCase()));
            if (!guess) guess = nodes.find(n => (n.shape && lower.includes(n.shape.toLowerCase())) || (n.type && lower.includes(n.type.toLowerCase())));
            
            // Ultimate fallback for ambiguous terminology (e.g. 'it', 'object', 'shaft') targeting the most recently manipulated/added node
            if (!guess && nodes.length > 0) {
                guess = nodes[nodes.length - 1]; 
            }
            
            if (guess) {
                targetNodeId = guess.id;
                setSelectedNodeId(guess.id);
            }
        }

        if (vectorMatch && targetNodeId) {
            const node = nodes.find(n => n.id === targetNodeId);
            if (node) {
                const nx = parseFloat(vectorMatch[1]);
                const ny = parseFloat(vectorMatch[2]);
                const nz = parseFloat(vectorMatch[3]);
                updateNode(targetNodeId, { position: [nx, ny, nz] });
                logEvent('agent', `Translated ${node.name} to [${nx}, ${ny}, ${nz}].`);
            }
        } else if ((xzPlaneMatch || xyPlaneMatch || yzPlaneMatch || offsetMatch) && targetNodeId) {
            const node = nodes.find(n => n.id === targetNodeId);
            if (node) {
                let [nx, ny, nz] = [...(node.position || [0, 0, 0])];
                let msg = `Translated ${node.name} via semantic command.`;
                
                const height = (node.shape === 'cylinder' || node.shape === 'screw_thread') ? (node.dimensions?.[2] || 20) : (node.dimensions?.[1] || 10);
                const depth  = (node.shape === 'cylinder' || node.shape === 'screw_thread') ? (node.dimensions?.[0] || 5) * 2 : (node.dimensions?.[2] || 10);
                const width  = (node.shape === 'cylinder' || node.shape === 'screw_thread') ? (node.dimensions?.[0] || 5) * 2 : (node.dimensions?.[0] || 10);
                
                // Base ground snap
                if (xzPlaneMatch) { ny = height / 2; msg = `Grounded ${node.name} to XZ Plane.`; }
                if (xyPlaneMatch) { nz = depth / 2; msg = `Snapped ${node.name} to XY Plane.`; }
                if (yzPlaneMatch) { nx = width / 2; msg = `Snapped ${node.name} to YZ Plane.`; }
                
                // Additive height overrides
                if (offsetMatch) {
                    const val = parseFloat(offsetMatch[1]);
                    if (lower.includes('up') || lower.includes('above') || lower.includes('higher')) {
                        ny += val;
                        msg = `Elevated ${node.name} securely by ${val}mm.`;
                    } else if (lower.includes('down') || lower.includes('below') || lower.includes('lower')) {
                        ny -= val;
                        msg = `Lowered ${node.name} linearly by ${val}mm.`;
                    }
                }

                updateNode(targetNodeId, { position: [nx, ny, nz] });
                logEvent('agent', msg);
            }
        } else if (lower.match(/\b(add|create|insert|make)\b/)) {
            if (lower.includes('cylinder') || lower.includes('hole')) {
                addPrimitive('cylinder');
                logEvent('agent', `Added new Standard Cylinder to Assembly.`);
            } else if (lower.includes('sphere')) {
                addPrimitive('sphere');
                logEvent('agent', `Added new Standard Sphere to Assembly.`);
            } else {
                addPrimitive('box');
                logEvent('agent', `Added new Standard Box to Assembly.`);
            }
        } else if (targetNodeId) {
            const node = nodes.find(n => n.id === targetNodeId);
            if (!node) { setIsAgentThinking(false); return; }

            if (lower.includes('increase') || lower.includes('bigger')) {
                updateNode(targetNodeId, { scale: [node.scale[0] * 1.5, node.scale[1] * 1.5, node.scale[2] * 1.5] });
                logEvent('agent', `Increased scale of ${node.name} by 150%.`);
            } else if (lower.includes('decrease') || lower.includes('smaller')) {
                updateNode(targetNodeId, { scale: [node.scale[0] * 0.8, node.scale[1] * 0.8, node.scale[2] * 0.8] });
                logEvent('agent', `Decreased scale of ${node.name} to 80%.`);
            } else if (lower.includes('metal') || lower.includes('aluminum')) {
                updateNode(targetNodeId, { materialType: 'metal', color: '#71717a' });
                logEvent('agent', `Applied Metal material to ${node.name}.`);
            } else if (lower.includes('plastic')) {
                updateNode(targetNodeId, { materialType: 'plastic', color: '#3b82f6' });
                logEvent('agent', `Applied Plastic material to ${node.name}.`);
            } else {
                logEvent('error', `Could not parse command parameters. Please try rephrasing explicitly (e.g., 'move to [10, 0, 5]' or 'use metal material').`);
            }
        } else {
            logEvent('error', `Context missing. Please select a shape from the Assembly view explicitly, or ask me to add a new basic shape first.`);
        }

        setIsAgentThinking(false);
    };

    const handleContextMenu = (e: React.MouseEvent, nodeId: string, csgId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuTarget({ nodeId, csgId });
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        if (contextMenuTimeout.current) clearTimeout(contextMenuTimeout.current);
    };

    const handleMenuMouseLeave = () => {
        contextMenuTimeout.current = setTimeout(() => {
            setContextMenuTarget(null);
        }, 3000);
    };

    const handleMenuMouseEnter = () => {
        if (contextMenuTimeout.current) clearTimeout(contextMenuTimeout.current);
    };

    const initiateCSG = (type: CSGOperation['type']) => {
        if (!selectedNodeId) {
            alert("Select a shape first to add a feature.");
            return;
        }
        setCsgPendingPlacement(type);
        if (type === 'boolean_union' || type === 'boolean_subtract') {
            setCsgDialogParams({ size: 2, depth: 10, angle: 45, axis: 'Y', limitType: 'blind', toolNodeId: '' });
        } else {
            setCsgDialogParams({ size: type === 'hole' ? 5 : 2, depth: type === 'hole' ? 15 : 5, angle: 45, axis: 'Y', limitType: 'blind' });
        }
    };

    const commitCSG = () => {
        if (csgPendingPlacement === 'edit_base' && selectedNodeId) {
            setNodes(prev => prev.map(n => {
                if (n.id === selectedNodeId) {
                    let finalPosX = csgDialogParams.tx ?? n.position?.[0] ?? 0;
                    let finalPosY = csgDialogParams.ty ?? n.position?.[1] ?? 0;
                    let finalPosZ = csgDialogParams.tz ?? n.position?.[2] ?? 0;
                    let finalRotX = (csgDialogParams.rx ?? 0) * Math.PI / 180;
                    let finalRotY = (csgDialogParams.ry ?? 0) * Math.PI / 180;
                    let finalRotZ = (csgDialogParams.rz ?? 0) * Math.PI / 180;

                    let newCsgStack = [...(n.csgStack || [])];
                    if (csgDialogParams.editTab === 'mirror' && csgDialogParams.mirrorPlane) {
                        
                        // Reflect world space positions
                        if (csgDialogParams.mirrorPlane === 'YZ') finalPosX *= -1; // X axis
                        if (csgDialogParams.mirrorPlane === 'XZ') finalPosY *= -1; // Y axis
                        if (csgDialogParams.mirrorPlane === 'XY') finalPosZ *= -1; // Z axis

                        // Pseudo-reflect rotations
                        if (csgDialogParams.mirrorPlane === 'YZ') { finalRotY *= -1; finalRotZ *= -1; }
                        if (csgDialogParams.mirrorPlane === 'XZ') { finalRotX *= -1; finalRotZ *= -1; }
                        if (csgDialogParams.mirrorPlane === 'XY') { finalRotX *= -1; finalRotY *= -1; }

                        // Reflect topology vectors
                        newCsgStack = newCsgStack.map(csg => {
                            const pos = [...(csg.params.position || [0, 0, 0])];
                            let newAxis = csg.params.axis || 'Y';
                            
                            if (csgDialogParams.mirrorPlane === 'XY') {
                                pos[2] *= -1;
                                if (newAxis === 'front' || newAxis === 'Z') newAxis = 'rear';
                                else if (newAxis === 'rear') newAxis = 'front';
                            } else if (csgDialogParams.mirrorPlane === 'YZ') {
                                pos[0] *= -1;
                                if (newAxis === 'right' || newAxis === 'X') newAxis = 'left';
                                else if (newAxis === 'left') newAxis = 'right';
                            } else if (csgDialogParams.mirrorPlane === 'XZ') {
                                pos[1] *= -1;
                                if (newAxis === 'top' || newAxis === 'Y') newAxis = 'bottom';
                                else if (newAxis === 'bottom') newAxis = 'top';
                            }
                            return { ...csg, params: { ...csg.params, position: pos as [number, number, number], axis: newAxis } };
                        });
                    }

                    return { 
                        ...n, 
                        csgStack: newCsgStack,
                        dimensions: [csgDialogParams.width ?? n.dimensions?.[0] ?? 10, csgDialogParams.height ?? n.dimensions?.[1] ?? 10, csgDialogParams.depth ?? n.dimensions?.[2] ?? 10],
                        position: [finalPosX, finalPosY, finalPosZ],
                        rotation: [finalRotX, finalRotY, finalRotZ]
                    };
                }
                return n;
            }));
            setCsgPendingPlacement(null);
            return;
        }

        if (csgEditTarget) {
            setNodes(prev => prev.map(n => {
                if (n.id === csgEditTarget.nodeId) {
                    return { ...n, csgStack: n.csgStack?.map(csg => csg.id === csgEditTarget.csgId ? { ...csg, params: { ...csg.params, ...csgDialogParams } } : csg) };
                }
                return n;
            }));
            logEvent('manual', `Edited existing CSG Feature parameters.`);
        } else if (csgPendingPlacement && selectedNodeId) {
            let toolNodeData = undefined;
            if ((csgPendingPlacement === 'boolean_union' || csgPendingPlacement === 'boolean_subtract') && csgDialogParams.toolNodeId) {
                // Find tool node, store it, remove it from top level
                const toolN = nodes.find(n => n.id === csgDialogParams.toolNodeId);
                if (toolN) toolNodeData = { ...toolN };
            }

            const newFeature: CSGOperation = { id: `csg_${Date.now()}`, type: csgPendingPlacement, params: { ...csgDialogParams, toolNodeData } };
            setNodes(prev => {
                let currentNodes = [...prev];
                if (toolNodeData) {
                    currentNodes = currentNodes.filter(n => n.id !== csgDialogParams.toolNodeId);
                }
                return currentNodes.map(n => n.id === selectedNodeId ? { ...n, csgStack: [...(n.csgStack || []), newFeature] } : n);
            });
            logEvent('manual', `Applied ${csgPendingPlacement.replace('_', ' ')} logic to topology.`);
        }
        setCsgPendingPlacement(null);
        setCsgEditTarget(null);
    };

    const handleNewProject = () => {
        const newProjectId = `proj_${Date.now()}`;
        const newProject = {
            id: newProjectId,
            name: 'Unsaved Assembly',
            prompt: 'Empty Assembly',
            createdAt: Date.now(),
            status: 'IDLE' as any,
            nodes: [],
            specs: {
                productName: 'Unsaved Assembly',
                tagline: '',
                description: '',
                dimensions: 'Units: mm',
                tolerances: '±0.1mm standard tolerance',
                weight: '',
                powerSource: '',
                connectivity: [],
                keyFeatures: [],
                materials: [],
                bom: [],
                manufacturingProcess: '',
                sourcingNotes: '',
                assumedParameters: null
            },
            assetUrls: null,
            simulationData: null,
            openScadCode: null,
            isConstrained: false,
            circuitComponents: null,
            appExtension: '.dreampro'
        };
        setProjects((prev: any) => [newProject as any, ...prev]);
        setNodes([]);
        setAssemblyName('Unsaved Assembly');
        setActiveProjectId(newProjectId);
        navigate(`/prostudio/${newProjectId}`, { replace: true });
    };

    const confirmDeleteLocalProject = () => {
        if (!activeProjectId || !activeProject) return;
        
        isClearingRef.current = true;
        setProjects(prev => prev.filter(p => p.id !== activeProjectId));
        setIsDeleteModalVisible(false);
        setActiveProjectId(null);
        setNodes([]);
        setAssemblyName('Unsaved Assembly');
        navigate('/prostudio', { replace: true });
    };

    const handleDeleteLocalProject = async (id: string) => {
        try {
            setProjects(prev => prev.filter(p => p.id !== id));
            if (activeProjectId === id) {
                setActiveProjectId(null);
                setNodes([]);
                setAssemblyName('Unsaved Assembly');
            }
        } catch (err) {
            console.error('Failed to delete project', err);
        }
    };

    const handleDeleteCloudProject = async (cloudProj: CloudProject) => {
        if (!auth.currentUser) return;
        setCloudLoadingAction(cloudProj.id);
        try {
            await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects/${cloudProj.id}`));
            try {
                await deleteObject(ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dreampro`));
            } catch(e) { console.warn("Storage object missing", e); }
            setCloudProjects(prev => prev.filter(p => p.id !== cloudProj.id));
            window.dispatchEvent(new Event('update-cloud-quota'));
        } catch (err) {
            console.error("Failed to delete from cloud", err);
        } finally {
            setCloudLoadingAction(null);
        }
    };

    const gridTemplateColumns = `256px 220px 50px minmax(400px, 1fr) 50px 6px ${agentPanelWidth}px`;

    return (
        <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
            <ThemePanel className="w-full shrink-0 border border-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] text-blue-400">
                <FileMenuBar projectName={activeProject?.name || assemblyName} />
            </ThemePanel>
            <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
                {/* Left Local/Cloud Explorer */}
                <ProjectSidebar 
                    projects={projects} 
                    activeProjectId={activeProjectId} 
                    onNewProject={handleNewProject} 
                    onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} 
                    triggerHierarchyView={null} 
                    onHierarchyViewClosed={() => {}} 
                    cloudProjects={cloudProjects}
                    onLoadCloudProject={handleDownloadFromCloud}
                    onDeleteCloudProject={handleDeleteCloudProject}
                    onDeleteLocalProject={handleDeleteLocalProject}
                    cloudLoadingAction={cloudLoadingAction}
                />

                {/* Assembly Panel Split 75/25 */}
                <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-zinc-800/80">
                    {/* Top 75% Tree */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-4 py-3 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center">
                            <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3" /> Assembly Hierarchy</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            <div className="px-3 py-2 text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-800/50 mb-1 flex items-center gap-2 group">
                                <Layers className="w-4 h-4 text-orange-500" />
                                {isEditingRoot ? (
                                    <input
                                        type="text"
                                        value={assemblyName}
                                        onChange={e => setAssemblyName(e.target.value)}
                                        onBlur={handleRenameRoot}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameRoot(); }}
                                        autoFocus
                                        className="bg-black/60 border border-blue-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded outline-none w-full uppercase tracking-wider h-6 font-mono"
                                    />
                                ) : (
                                    <span className="text-sm font-black text-white cursor-default select-none w-full px-1.5 py-0.5" title="Root Assembly">
                                        \
                                    </span>
                                )}
                            </div>
                            {nodes.length === 0 && <div className="text-center text-zinc-600 italic text-xs mt-6 px-2">No geometries or circuits localized to the canvas bounds.</div>}
                            {nodes.map((node, index) => {
                                const isExpanded = expandedNodes[node.id] !== false; // Active open is default
                                const hasChildren = node.csgStack && node.csgStack.length > 0;
                                return (
                                    <div key={node.id} className="pl-1 space-y-0.5">
                                        <div className="flex items-center w-full group pr-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setExpandedNodes(prev => ({ ...prev, [node.id]: !isExpanded })); }}
                                                className={`p-1 text-zinc-500 hover:text-white transition-colors flex items-center justify-center shrink-0`}
                                            >
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => setSelectedNodeId(node.id)}
                                                onContextMenu={(e) => handleContextMenu(e, node.id)}
                                                className={`flex-1 text-left px-2 py-1.5 rounded font-mono text-[10px] flex items-center justify-between transition-colors ${selectedNodeId === node.id ? 'bg-blue-900/40 border-l-[3px] border-blue-500 text-blue-300 shadow-inner' : 'text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300 border-l-[3px] border-transparent'}`}
                                            >
                                                <div className="flex items-center gap-2 truncate w-full">
                                                    {node.type === 'primitive' && node.shape === 'box' && <Box className="w-3 h-3 shrink-0 text-blue-500" />}
                                                    {node.type === 'primitive' && node.shape === 'cylinder' && <Cylinder className="w-3 h-3 shrink-0 text-blue-500" />}
                                                    {node.type === 'primitive' && node.shape === 'screw_thread' && <Wrench className="w-3 h-3 shrink-0 text-zinc-400" />}
                                                    {node.type === 'imported_circuit' && <Cpu className="w-3 h-3 shrink-0 text-emerald-500" />}
                                                    {(node.type === 'imported_cad' || node.type === 'imported_dxf') && <Layers className="w-3 h-3 shrink-0 text-zinc-400" />}
                                                    {editingNodeId === node.id && !editingCsgId ? (
                                                        <input
                                                            type="text"
                                                            value={editNameValue}
                                                            onChange={e => setEditNameValue(e.target.value)}
                                                            onBlur={commitRename}
                                                            onFocus={e => e.target.select()}
                                                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') { setEditingNodeId(null); setEditingCsgId(null); } }}
                                                            autoFocus
                                                            className="bg-black/80 border border-blue-500 text-white font-bold text-[10px] px-1 py-0.5 rounded outline-none w-full uppercase tracking-wider h-5 font-mono"
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span onDoubleClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); setEditingCsgId(null); setEditNameValue(node.name); }} className="truncate uppercase tracking-wider block hover:text-white">{node.name}</span>
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                        {/* Render Properties & CSG Stack Underneath */}
                                        {isExpanded && (
                                            <div className="pl-6 border-l border-zinc-800 ml-[18px] py-1 space-y-0.5 relative z-10">
                                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center justify-between gap-1.5 px-2 py-1.5 bg-zinc-900/30 rounded group">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: node.color }}></div>
                                                        <span className="group-hover:text-blue-400 transition-colors">Material</span>
                                                    </div>
                                                    <select
                                                        className="bg-black/80 text-[9px] border border-zinc-700/50 rounded px-1 py-0.5 outline-none text-zinc-300 max-w-[85px] cursor-pointer"
                                                        value={node.color}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            const val = e.target.value;
                                                            const mat = materialsLib.find(m => m.color === val);
                                                            if (mat) {
                                                                updateNode(node.id, { color: mat.color, materialType: mat.type.toLowerCase() as any });
                                                            } else {
                                                                if (val === '#3b82f6') updateNode(node.id, { color: val, materialType: 'plastic' });
                                                                else if (val === '#71717a') updateNode(node.id, { color: val, materialType: 'metal' });
                                                                else if (val === '#52525b') updateNode(node.id, { color: val, materialType: 'custom' });
                                                                else if (val === '#10b981') updateNode(node.id, { color: val, materialType: 'fr4' });
                                                                else updateNode(node.id, { color: val });
                                                            }
                                                        }}
                                                        onClick={e => e.stopPropagation()}
                                                        title="Assign Custom Material"
                                                    >
                                                        {(!materialsLib.some(m => m.color === node.color) && !["#3b82f6", "#71717a", "#52525b", "#10b981"].includes(node.color)) && (
                                                            <option value={node.color} hidden>Custom</option>
                                                        )}
                                                        {materialsLib.length > 0 ? materialsLib.map(m => (
                                                            <option key={m.id} value={m.color}>{m.name}</option>
                                                        )) : (
                                                            <>
                                                                <option value="#3b82f6">Plastic</option>
                                                                <option value="#71717a">Aluminum</option>
                                                                <option value="#52525b">Steel</option>
                                                                <option value="#10b981">FR4</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                                
                                                {hasChildren && node.csgStack!.map(csg => (
                                                    <div
                                                        key={csg.id}
                                                        onContextMenu={(e) => handleContextMenu(e, node.id, csg.id)}
                                                        className="text-[9px] text-zinc-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-900/50 rounded cursor-context-menu transition-colors"
                                                    >
                                                        {csg.type === 'hole' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 shrink-0 fill-red-500/30 stroke-red-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v4l-2 2v9a3 3 0 0 0 6 0V8l-2-2V2H9z" /><path d="M7 10l6 3" /><path d="M7 13l6 3" /></svg>}
                                                        {csg.type === 'chamfer' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 shrink-0 fill-orange-500/30 stroke-orange-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4V4z" fill="none" strokeWidth="1" strokeOpacity="0.2"/><path d="M4 14l10-10h6v16H4V14z" /></svg>}
                                                        {csg.type === 'round' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 shrink-0 fill-emerald-500/30 stroke-emerald-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4V4z" fill="none" strokeWidth="1" strokeOpacity="0.2"/><path d="M20 20H4V4h6a10 10 0 0 1 10 10v6z" /></svg>}
                                                        {csg.type === 'taper' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 shrink-0 fill-orange-500/30 stroke-orange-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 20 18 20 14 4 10 4" /></svg>}
                                                        {csg.type === 'countersink' && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 shrink-0 fill-red-500/30 stroke-red-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v4L15 14v6H9v-6L4 8V4z" /></svg>}
                                                        
                                                        {editingNodeId === node.id && editingCsgId === csg.id ? (
                                                            <input
                                                                type="text"
                                                                value={editNameValue}
                                                                onChange={e => setEditNameValue(e.target.value)}
                                                                onBlur={commitRename}
                                                                onFocus={e => e.target.select()}
                                                                onKeyDown={e => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') { setEditingNodeId(null); setEditingCsgId(null); } }}
                                                                autoFocus
                                                                className="bg-black/80 border border-blue-500 text-white font-bold text-[9px] px-1 py-0.5 rounded outline-none w-full uppercase tracking-wider h-4 font-mono ml-1"
                                                            />
                                                        ) : (
                                                            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); setEditingCsgId(csg.id); setEditNameValue(csg.name || `${csg.type} Feature`); }} className="truncate block font-bold capitalize hover:text-white">{csg.name || `${csg.type} Feature`}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Bottom 25% Settings */}
                    <div className="h-1/4 min-h-[140px] shrink-0 border-t border-zinc-800/80 bg-black/60 flex flex-col">
                        <div className="px-3 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center">
                            <h2 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Settings className="w-3 h-3" /> Global Assembly Settings</h2>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto space-y-3">
                            <label className="block text-xs text-zinc-500 font-mono">
                                Base Environment System
                                <select value={globalUnits} onChange={e => setGlobalUnits(e.target.value)} className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:border-blue-500 text-xs">
                                    <option value="mm">Metric (mm) - Preferred</option>
                                    <option value="in">Imperial (inch)</option>
                                    <option value="m">Metric (Meters)</option>
                                </select>
                            </label>
                            <label className="block text-xs text-zinc-500 font-mono">
                                Assembly Tolerance Constraints
                                <input type="text" defaultValue="±0.05 mm" className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:border-blue-500 text-xs" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Vertical Left Toolbar for Primitives & CSG Features */}
                <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm rounded-lg overflow-y-auto overflow-x-hidden border border-zinc-800/80 items-center py-2 space-y-3">
                    <div className="text-[8px] text-zinc-500 uppercase font-black rotate-180" style={{ writingMode: 'vertical-rl' }}>Basic Shapes</div>
                    <button onClick={() => addPrimitive('box')} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/30 rounded transition-colors" title="Solid Box"><Box className="w-6 h-6 fill-zinc-500/30 group-hover:fill-blue-500/50" /></button>
                    <button onClick={() => addPrimitive('cylinder')} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/30 rounded transition-colors" title="Solid Cylinder"><Cylinder className="w-6 h-6 fill-zinc-500/30 group-hover:fill-blue-500/50" /></button>
                    <button onClick={() => addPrimitive('screw_thread')} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/30 rounded transition-colors" title="Fastener Thread"><Wrench className="w-6 h-6 fill-zinc-500/30" /></button>

                    <div className="w-8 h-px bg-zinc-800 my-1"></div>
                    <button onClick={() => initiateCSG('hole')} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/40 rounded transition-colors" title="Drill Hole">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-red-500/30 stroke-red-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v4l-2 2v9a3 3 0 0 0 6 0V8l-2-2V2H9z" /><path d="M7 10l6 3" /><path d="M7 13l6 3" /></svg>
                    </button>
                    <button onClick={() => initiateCSG('chamfer')} className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/40 rounded transition-colors" title="Chamfer Edge">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-orange-500/30 stroke-orange-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4V4z" fill="none" strokeWidth="1" strokeOpacity="0.2"/><path d="M4 14l10-10h6v16H4V14z" /></svg>
                    </button>
                    <button onClick={() => initiateCSG('round')} className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/40 rounded transition-colors" title="Round / Fillet Edge">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-emerald-500/30 stroke-emerald-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4V4z" fill="none" strokeWidth="1" strokeOpacity="0.2"/><path d="M20 20H4V4h6a10 10 0 0 1 10 10v6z" /></svg>
                    </button>
                    <button onClick={() => initiateCSG('taper')} className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/40 rounded transition-colors" title="Taper Face">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-orange-500/30 stroke-orange-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 20 18 20 14 4 10 4" /></svg>
                    </button>
                    <button onClick={() => initiateCSG('countersink')} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/40 rounded transition-colors" title="Countersink Hole">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-red-500/30 stroke-red-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v4L15 14v6H9v-6L4 8V4z" /></svg>
                    </button>
                    <div className="w-8 h-px bg-zinc-800 my-1"></div>
                    <button onClick={() => initiateCSG('boolean_union')} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors" title="Boolean Union">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-blue-500/30 stroke-blue-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="12" height="12" rx="2" /><rect x="8" y="8" width="12" height="12" rx="2" /></svg>
                    </button>
                    <button onClick={() => initiateCSG('boolean_subtract')} className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/40 rounded transition-colors" title="Boolean Subtract">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-indigo-500/30 stroke-indigo-500 stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 4h8v8H4z" fill="none" strokeDasharray="2 2" /></svg>
                    </button>
                </div>

                <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.02)]">

                    {/* Two-Tier Top Multi-CAD Toolbar */}
                    <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20">
                        
                        {/* FIRST ROW: File Menu & Main Views */}
                        <div className="flex justify-between items-center w-full gap-4">
                            {/* File Main Actions */}
                            <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                                <button onClick={handleNewProject} className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors" title="New Project">
                                    <PlusCircle className="w-5 h-5 drop-shadow-md" />
                                </button>
                                <button onClick={handleSaveLocal} className="p-1.5 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center justify-center gap-1.5" title="Save File Locally">
                                    <Save className="w-5 h-5 drop-shadow-md fill-blue-500/10" />
                                    <ArrowDownToLine className="w-3.5 h-3.5 opacity-80" />
                                </button>
                                <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".stl,.obj,.step,.dxf,.skidl,.gbr,.gerber" onChange={handleFileUpload} />
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-1 hover:bg-emerald-900/40 rounded transition-colors flex items-center disabled:opacity-50" title="Import 3D Model">
                                    <div className="relative p-1 group flex items-center justify-center">
                                        <MeshedCubeIcon />
                                        <ArrowDown className="w-[18px] h-[18px] text-emerald-500 absolute -right-0.5 -bottom-0.5 drop-shadow-md stroke-[3]" />
                                    </div>
                                </button>
                                <button onClick={handleSaveToCloud} disabled={isCloudSaving} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Commit to Remote Cloud">
                                    {isCloudSaving ? <RefreshCw className="w-5 h-5 animate-spin drop-shadow-md" /> : <UploadCloud className="w-5 h-5 drop-shadow-md fill-blue-500/20" />}
                                </button>
                                <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                                <button onClick={() => { setActiveProjectId(null); setNodes([]); navigate('/prostudio'); }} className="p-1.5 text-zinc-300 hover:text-orange-400 hover:bg-orange-900/40 rounded transition-colors" title="Close Project">
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
                                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                                </button>
                            </div>

                            {/* App-Specific Tools (FEA, Vendor) */}
                            <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-indigo-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                                <button onClick={() => alert("FEA Solvers booting...")} className="relative p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/40 rounded transition-colors" title="Run FEA">
                                    <Cuboid className="w-5 h-5 opacity-80 fill-indigo-500/30 drop-shadow-md" />
                                    <ArrowDownRight className="w-[16px] h-[16px] absolute bottom-1 right-0 text-emerald-400 drop-shadow shadow-black stroke-[3]" />
                                </button>
                                <div className="w-px h-4 bg-zinc-700/80 mx-1 rounded"></div>
                                <button onClick={() => setIsVendorModalOpen(true)} className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-900/40 rounded transition-colors flex items-center gap-1" title="Search Parts Catalog">
                                    <Database className="w-5 h-5 fill-orange-500/30 drop-shadow-md" />
                                </button>
                            </div>

                            {/* View / CAD Mode */}
                            <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-blue-500/20 shadow-inner shrink-0">
                                <button onClick={() => setCsgMode('Part')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${csgMode === 'Part' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>Part</button>
                                <button onClick={() => setCsgMode('Assembly')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${csgMode === 'Assembly' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>Assembly</button>
                                <button onClick={() => setCsgMode('Circuit')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest gap-1 flex items-center ${csgMode === 'Circuit' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}><Cpu className="w-[18px] h-[18px]" /> Circuits</button>
                            </div>
                        </div>

                        {/* SECOND ROW: App-Specific Workspace Menubars */}
                        <div className="flex justify-between items-center w-full gap-4 mt-2">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                {/* Viewport Render Modes */}
                                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                    <button onClick={() => setRenderMode('wireframe')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'wireframe' ? 'bg-blue-900/60 text-blue-400 shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Wireframe View">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    </button>
                                    <button onClick={() => setRenderMode('edges')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'edges' ? 'bg-blue-900/60 text-blue-400 shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Solid + Edge View">
                                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                                        </svg>
                                    </button>
                                    <button onClick={() => setRenderMode('solid')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'solid' ? 'bg-blue-900/60 text-blue-400 shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Solid View">
                                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                                            <polygon points="12 2 3 7 12 12 21 7 12 2" fill="currentColor" fillOpacity="0.4"></polygon>
                                            <polygon points="3 16 3 7 12 12 12 22 3 16" fill="currentColor" fillOpacity="0.8"></polygon>
                                            <polygon points="12 22 12 12 21 7 21 16 12 22" fill="currentColor"></polygon>
                                        </svg>
                                    </button>

                                    <div className="w-px h-4 bg-zinc-700/80 mx-1.5 rounded"></div>

                                    <button onClick={() => setIsRenderModalOpen(true)} className="w-[39px] h-[39px] mx-0.5 rounded-sm border border-zinc-600/80 hover:border-orange-500 overflow-hidden relative shadow-md group outline-none transition-colors" title="Photorealistic GPU Render">
                                        <img src="/crankshaft_render.png" alt="Render" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out" />
                                        <div className="absolute inset-0 ring-1 ring-inset ring-black/40 group-hover:ring-orange-500/30 mix-blend-overlay pointer-events-none"></div>
                                    </button>
                                </div>
                                <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                                {/* Motion Constraints */}
                                <div className="flex items-center gap-1 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800">
                                    <span className="text-[8px] text-zinc-500 uppercase font-black mr-1 tracking-widest leading-none">Constraints</span>
                                    <button className="px-2 py-1 text-[9px] text-zinc-400 hover:text-blue-400 font-bold uppercase tracking-widest rounded hover:bg-blue-900/30">Frame</button>
                                    <button className="px-2 py-1 text-[9px] text-zinc-400 hover:text-blue-400 font-bold uppercase tracking-widest rounded hover:bg-blue-900/30">Linear</button>
                                    <button className="px-2 py-1 text-[9px] text-zinc-400 hover:text-blue-400 font-bold uppercase tracking-widest rounded hover:bg-blue-900/30">Rotary</button>
                                </div>
                            </div>
                            
                            {/* Transform Tools */}
                            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner shrink-0">
                                <button onClick={() => setIsExploded(!isExploded)} className={`mr-2 p-1.5 rounded transition-colors border ${isExploded ? 'bg-orange-900/40 text-orange-400 border-orange-500/50' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800'}`} title="Toggle Exploded View"><Expand className="w-6 h-6" /></button>
                                <button onClick={() => setTransformMode('translate')} className={`p-1.5 rounded transition-colors ${transformMode === 'translate' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Translate"><Move className="w-6 h-6" /></button>
                                <button onClick={() => setTransformMode('rotate')} className={`p-1.5 rounded transition-colors ${transformMode === 'rotate' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Rotate"><RefreshCw className="w-6 h-6" /></button>
                                <button onClick={() => setTransformMode('scale')} className={`p-1.5 rounded transition-colors ${transformMode === 'scale' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Scale"><Maximize2 className="w-6 h-6" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-[#09090b] relative z-0" onContextMenu={(e) => { e.preventDefault(); setCsgMode('Assembly'); }}>

                        {/* Camera Corner Watermarks */}
                        <div className="absolute inset-4 pointer-events-none select-none z-10 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="border-t-2 border-l-2 border-red-500/50 p-2 w-32 h-16 flex items-start justify-start">
                                    <span className="text-[10px] text-red-500/70 font-bold tracking-widest leading-relaxed">DREAM Giga<br />ProStudio</span>
                                </div>
                                <div className="border-t-2 border-r-2 border-red-500/50 p-2 w-32 h-16 flex items-start justify-end text-right">
                                    <span className="text-[10px] text-red-500/70 font-bold tracking-widest leading-relaxed">DREAM Giga<br />ProStudio</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="border-b-2 border-l-2 border-red-500/50 p-2 w-32 h-16 flex items-end justify-start">
                                    <span className="text-[10px] text-red-500/70 font-bold tracking-widest leading-relaxed">DREAM Giga<br />ProStudio</span>
                                </div>
                                <div className="border-b-2 border-r-2 border-red-500/50 p-2 w-32 h-16 flex items-end justify-end text-right">
                                    <span className="text-[10px] text-red-500/70 font-bold tracking-widest leading-relaxed">DREAM Giga<br />ProStudio</span>
                                </div>
                            </div>
                        </div>

                        {csgMode === 'Part' && !selectedNodeId && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                                <div className="bg-black/80 backdrop-blur border border-zinc-800 text-zinc-400 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                                    <Target className="w-8 h-8 text-blue-500/50 mb-2" />
                                    <p className="font-mono text-sm">Part Isolation Mode Active</p>
                                    <p className="text-xs text-zinc-500">Select a part from the Assembly Tree to focus.</p>
                                </div>
                            </div>
                        )}
                        {/* Side-Peeking Parameter Dialog */}
                        {(csgPendingPlacement || csgEditTarget) && (
                            <div className="absolute left-6 top-6 z-50 bg-[#09090b]/95 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-[10px_10px_30px_rgba(0,0,0,0.5)] shadow-blue-900/10 w-[240px] flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-200">
                                <div className="px-3 py-2 border-b border-zinc-800 bg-blue-900/10 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><Sliders className="w-3 h-3" /> {csgEditTarget ? 'Edit Feature' : `Add Feature`}</span>
                                    <button onClick={() => { setCsgPendingPlacement(null); setCsgEditTarget(null); }} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                                </div>
                                <div className="p-3 space-y-3">
                                    <div className="bg-black/50 border border-zinc-800/80 p-2 rounded flex flex-col gap-1">
                                        <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-widest">Target Shape</span>
                                        <span className="text-[10px] font-bold text-blue-300 truncate">{selectedNodeId ? nodes.find(n => n.id === selectedNodeId)?.name || 'Unknown Shape' : 'None Selected'}</span>
                                    </div>
                                    <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-center">
                                        <span className="text-[10px] text-blue-300 font-mono flex items-center justify-center gap-1.5 animate-pulse"><MousePointer2 className="w-3 h-3" /> Select target via mouse input</span>
                                        {csgEditTarget !== null && csgDialogParams.axis && (
                                            <span className="block mt-1 text-[9px] text-blue-400 font-bold uppercase tracking-widest bg-blue-950/40 rounded py-0.5">Target: {csgDialogParams.axis}</span>
                                        )}
                                        {csgPendingPlacement !== null && csgDialogParams.axis && (
                                            <span className="block mt-1 text-[9px] text-blue-400 font-bold uppercase tracking-widest bg-emerald-950/40 text-emerald-400 rounded py-0.5">Locked On: {csgDialogParams.axis}</span>
                                        )}
                                    </div>
                                    <div className="w-full h-px bg-zinc-800/50 my-1"></div>

                                    {(() => {
                                        const activeCsgType = csgPendingPlacement || (csgEditTarget ? nodes.find(n => n.id === csgEditTarget.nodeId)?.csgStack?.find(c => c.id === csgEditTarget.csgId)?.type : null);
                                        return (
                                            <>
                                                {(activeCsgType === 'edit_base') && (
                                                    <div className="flex bg-black/60 rounded border border-zinc-800 p-0.5 mb-3 mt-1">
                                                        {(['size', 'translate', 'rotate', 'mirror'] as any[]).map(t => (
                                                            <button key={t} onClick={() => setCsgDialogParams({...csgDialogParams, editTab: t})} className={`flex-1 text-[9px] uppercase font-bold py-1.5 rounded transition-colors ${csgDialogParams.editTab === t ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
                                                        ))}
                                                    </div>
                                                )}

                                                {(activeCsgType === 'edit_base' && csgDialogParams.editTab === 'size') && (
                                                    <>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Width (X)
                                                            <input type="number" step="0.1" value={csgDialogParams.width || 10} onChange={e => setCsgDialogParams({ ...csgDialogParams, width: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Height (Y)
                                                            <input type="number" step="0.1" value={csgDialogParams.height || 10} onChange={e => setCsgDialogParams({ ...csgDialogParams, height: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Depth (Z)
                                                            <input type="number" step="0.1" value={csgDialogParams.depth || 10} onChange={e => setCsgDialogParams({ ...csgDialogParams, depth: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                    </>
                                                )}

                                                {(activeCsgType === 'edit_base' && csgDialogParams.editTab === 'translate') && (
                                                    <>
                                                        <div className="text-[10px] text-zinc-400 leading-tight mb-2">Translate geometry relative to absolute world origin axes.</div>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Translate X (mm)
                                                            <input type="number" step="0.1" value={csgDialogParams.tx ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, tx: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                                                            Translate Y (mm)
                                                            <input type="number" step="0.1" value={csgDialogParams.ty ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, ty: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                                                            Translate Z (mm)
                                                            <input type="number" step="0.1" value={csgDialogParams.tz ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, tz: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                    </>
                                                )}

                                                {(activeCsgType === 'edit_base' && csgDialogParams.editTab === 'rotate') && (
                                                    <>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Pitch (Rotate X°)
                                                            <input type="number" step="1" value={csgDialogParams.rx ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, rx: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                                                            Yaw (Rotate Y°)
                                                            <input type="number" step="1" value={csgDialogParams.ry ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, ry: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                                                            Roll (Rotate Z°)
                                                            <input type="number" step="1" value={csgDialogParams.rz ?? 0} onChange={e => setCsgDialogParams({ ...csgDialogParams, rz: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                    </>
                                                )}

                                                {(activeCsgType === 'edit_base' && csgDialogParams.editTab === 'mirror') && (
                                                    <>
                                                        <div className="text-[10px] text-zinc-400 leading-tight mb-3">Select an orthogonal plane to mirror geometry.</div>
                                                        <div className="flex gap-2">
                                                            {(['XY', 'YZ', 'XZ'] as const).map(p => (
                                                                <button key={p} onClick={() => setCsgDialogParams({...csgDialogParams, mirrorPlane: p})} className={`flex-1 py-3 flex flex-col items-center justify-center border rounded transition-colors ${csgDialogParams.mirrorPlane === p ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-inner' : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white'}`}>
                                                                    <div className="text-[14px] font-black uppercase tracking-widest leading-none">{p}</div>
                                                                    <div className="text-[8px] opacity-60 mt-1">Plane</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                                {(activeCsgType === 'boolean_union' || activeCsgType === 'boolean_subtract') && (
                                                    <div className="text-[10px] text-zinc-400 leading-tight">
                                                        Click a secondary shape in the viewport to act as the Tool Body.
                                                        <br/><br/>
                                                        <strong>Selection Sequence:</strong><br/>
                                                        Target: {selectedNodeId ? nodes.find(n => n.id === selectedNodeId)?.name : 'None'}<br/>
                                                        Tool: <span className="text-orange-400">{csgDialogParams.toolNodeId ? nodes.find(n => n.id === csgDialogParams.toolNodeId)?.name : 'Awaiting Click...'}</span>
                                                    </div>
                                                )}
                                                {(activeCsgType === 'hole' || activeCsgType === 'chamfer' || activeCsgType === 'round' || activeCsgType === 'countersink' || activeCsgType === 'taper') && (
                                                    <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                        {activeCsgType === 'hole' ? 'Hole Diameter' : activeCsgType === 'chamfer' ? 'Chamfer Cut' : activeCsgType === 'round' ? 'Fillet Radius' : activeCsgType === 'countersink' ? 'Countersink Core' : 'Taper Width'}
                                                        <input type="number" step="0.1" value={csgDialogParams.size} onChange={e => setCsgDialogParams({ ...csgDialogParams, size: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                    </label>
                                                )}
                                                {(activeCsgType === 'hole') && (
                                                    <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-2">
                                                        Limit Type
                                                        <select value={csgDialogParams.limitType || 'blind'} onChange={e => setCsgDialogParams({ ...csgDialogParams, limitType: e.target.value as any })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none">
                                                            <option value="blind">Blind (Explicit Depth)</option>
                                                            <option value="through_all">Through-All</option>
                                                            <option value="up_to_surface">Up To Next Surface</option>
                                                        </select>
                                                    </label>
                                                )}
                                                {(activeCsgType === 'countersink') && (
                                                    <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                        Penetration Depth
                                                        <input type="number" step="0.1" value={csgDialogParams.depth || 10} onChange={e => setCsgDialogParams({ ...csgDialogParams, depth: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                    </label>
                                                )}
                                                {(activeCsgType === 'hole') && (!csgDialogParams.limitType || csgDialogParams.limitType === 'blind') && (
                                                    <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider mt-1">
                                                        Penetration Depth
                                                        <input type="number" step="0.1" value={csgDialogParams.depth || 10} onChange={e => setCsgDialogParams({ ...csgDialogParams, depth: parseFloat(e.target.value) })} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                    </label>
                                                )}
                                                {(activeCsgType === 'hole' && csgDialogParams.limitType === 'up_to_surface') && (
                                                    <div className="text-[10px] text-zinc-400 mt-2 p-1.5 bg-blue-900/20 border border-blue-500/20 rounded">
                                                        Select Reference Surface: <strong className="text-orange-400 block">{csgDialogParams.referenceSurfaceId || 'Awaiting Click...'}</strong>
                                                    </div>
                                                )}
                                                {activeCsgType === 'taper' && (
                                                    <>
                                                        <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                            Taper Angle (Deg)
                                                            <input type="number" step="1" value={csgDialogParams.angle || 45} onChange={e => {
                                                                const v = parseFloat(e.target.value);
                                                                // Validity check dummy
                                                                if (v > 89 || v < -89) alert("Invalid Taper Angle. Out of geometric bounds.");
                                                                else setCsgDialogParams({ ...csgDialogParams, angle: v });
                                                            }} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                                        </label>
                                                        <div className="text-[10px] text-zinc-400 mt-2 p-1.5 bg-blue-900/20 border border-blue-500/20 rounded">
                                                            Select Pivot Surface: <strong className="text-orange-400 block">{csgDialogParams.referenceSurfaceId || 'Awaiting Click...'}</strong>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="px-3 py-2 border-t border-zinc-800 flex justify-end gap-2 bg-black/40">
                                    <button onClick={() => { setCsgPendingPlacement(null); setCsgEditTarget(null); }} className="px-2 py-1 text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest rounded transition-colors">Cancel</button>
                                    <button onClick={commitCSG} className="px-3 py-1 text-[9px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded shadow text-shadow-sm uppercase tracking-widest transition-colors">Apply Feature</button>
                                </div>
                            </div>
                        )}

                        <EngineErrorBoundary fallback={
                            <div className="flex flex-col items-center justify-center h-full bg-red-950/20 border border-red-900/50 rounded-lg p-8 text-center space-y-4">
                                <AlertTriangle className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                                <h2 className="text-xl font-black text-red-400 tracking-widest uppercase">3D Render Engine Crash Recovered</h2>
                                <p className="text-zinc-400 text-sm max-w-md font-mono">The loaded geometry encountered an unrecoverable WebGL or topological parsing exception. ProStudio forcefully halted the thread to protect your local environment.</p>
                                <button onClick={() => window.location.reload()} className="px-6 py-2.5 mt-4 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg transition-colors tracking-wider uppercase text-xs">
                                    Reboot Simulation Matrix
                                </button>
                            </div>
                        }>
                        <Canvas dpr={[1, 2]} camera={{ position: [20, 20, 30], fov: 40 }} className="w-full h-full cursor-crosshair">
                            <CameraController view={cameraView} />
                            <color attach="background" args={['#09090b']} />
                            <fog attach="fog" args={['#09090b', 50, 400]} />
                            <ambientLight intensity={1.0} />
                            <directionalLight position={[100, 100, 50]} intensity={1.5} castShadow />
                            <directionalLight position={[-100, -100, -50]} intensity={0.5} />

                            <Grid renderOrder={-1} position={[0, -0.01, 0]} infiniteGrid cellSize={10} cellThickness={0.5} sectionSize={50} sectionThickness={1} cellColor={'#27272a'} sectionColor={'#3f3f46'} fadeDistance={200} />

                            <React.Suspense fallback={null}>
                                <Environment preset="city" />
                                <ContactShadows position={[0, -50, 0]} opacity={0.6} scale={200} blur={2.5} far={100} />

                                {nodes
                                    .filter((n: any) => csgMode === 'Part' ? n.id === selectedNodeId : true)
                                    .map((node: any, i: number) => (
                                        <MechatronicNodeMesh
                                            key={node.id}
                                            node={node}
                                            index={i}
                                            isExploded={isExploded}
                                            nodesLength={nodes.length}
                                            csgMode={csgMode}
                                            isSelected={selectedNodeId === node.id}
                                            isHovered={hoverFace === node.id}
                                            csgPendingPlacement={csgPendingPlacement}
                                            csgEditTarget={csgEditTarget}
                                            csgDialogParams={csgDialogParams}
                                            renderMode={renderMode}
                                            setSelectedNodeId={setSelectedNodeId}
                                            setCsgPendingPlacement={setCsgPendingPlacement}
                                            setCsgDialogParams={setCsgDialogParams}
                                            setHoverFace={setHoverFace}
                                            setHoverFaceData={setHoverFaceData}
                                        />
                                    ))}

                                {/* Attach TransformControls to the selected node natively via its UUID mapping */}
                                {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
                                    <TransformControls
                                        object={undefined /* Usually we bind to the mesh ref via object={ref}, but since we mutate state natively we use callbacks below instead for mock */}
                                        mode={transformMode}
                                        visible={false} // Hidden in pure React mock layout unless explicitly ref-bound to mesh groups
                                    />
                                )}
                            </React.Suspense>

                            <GizmoHelper alignment="center-right" margin={[60, 60]}>
                                <group scale={1.25}>
                                    <mesh>
                                        <sphereGeometry args={[22, 32, 32]} />
                                        <meshBasicMaterial color="#71717a" transparent opacity={0.2} depthTest={false} depthWrite={false} fog={false} />
                                    </mesh>
                                </group>
                                <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="white" hideNegativeAxes={true} />
                            </GizmoHelper>

                            {hoverFaceData && (
                                <group position={hoverFaceData.point}>
                                    <mesh quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), hoverFaceData.normal)}>
                                        <ringGeometry args={[0.5, 1.0, 32]} />
                                        <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} depthTest={false} side={THREE.DoubleSide} />
                                    </mesh>
                                </group>
                            )}

                            <OrbitControls makeDefault enablePan={!isOriginLocked} enableZoom={!isOriginLocked} enableRotate={!isOriginLocked} minDistance={10} maxDistance={400} />
                            <CameraManager />
                        </Canvas>
                        </EngineErrorBoundary>
                    </div>
                </ThemePanel>

                {/* Right Vertical Views Bar */}
                <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm rounded-lg overflow-y-auto overflow-x-hidden border border-zinc-800/80 items-center py-2 space-y-2 relative z-20">
                    <div className="text-[8px] text-zinc-500 uppercase font-black rotate-180 tracking-widest mb-2" style={{ writingMode: 'vertical-rl' }}>Views</div>
                    <button onClick={() => setIsOriginLocked(!isOriginLocked)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 mb-1 border ${isOriginLocked ? 'bg-indigo-900/60 border-indigo-500/40 text-indigo-400 shadow-inner' : 'bg-transparent border-transparent text-zinc-500 hover:bg-indigo-900/30 hover:text-indigo-400'}`} title={isOriginLocked ? 'Unlock Camera Matrix' : 'Lock Origin Viewport'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span className="text-[7px] font-black uppercase tracking-widest">Lock</span>
                    </button>
                    <div className="w-6 h-px bg-zinc-800 my-1 rounded-full"></div>
                    {[
                        { face: '3d', title: 'Default 3D View' },
                        { face: 'top', title: 'Top Projection' },
                        { face: 'bottom', title: 'Bottom Projection' },
                        { face: 'front', title: 'Front Projection' },
                        { face: 'rear', title: 'Rear Projection' },
                        { face: 'left', title: 'Left Projection' },
                        { face: 'right', title: 'Right Projection' }
                    ].map(v => (
                        <button key={v.face} onClick={() => setCameraView(v.face as any)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${cameraView === v.face ? 'bg-blue-900/50 shadow-inner' : 'hover:bg-blue-900/30'}`} title={v.title}>
                            <ViewCubeIcon face={v.face} />
                            <span className={`text-[7px] font-black uppercase tracking-widest ${cameraView === v.face ? 'text-blue-400' : 'text-zinc-600 group-hover:text-blue-400'}`}>{v.face === '3d' ? '3D' : v.face}</span>
                        </button>
                    ))}
                </div>

                {/* Resizer Handle */}
                <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 cursor-col-resize hover:bg-blue-500 transition-colors z-30"></div>

                {/* Right AI Agent Sidebar */}
                <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-20 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] p-0 w-full col-start-7 col-end-8">
                    <AgentSidebar 
                        onSubmit={handleAgentSubmit}
                        isThinking={isAgentThinking}
                    />
                </ThemePanel>

                {/* Global Context Menu Modal for Materials & Destruction */}
                {contextMenuTarget && (
                    <div
                        onMouseEnter={handleMenuMouseEnter}
                        onMouseLeave={handleMenuMouseLeave}
                        className="fixed z-50 bg-[#09090b] border border-blue-500/40 rounded shadow-[0_4px_30px_rgba(0,0,0,0.8)] shadow-blue-900/20 p-2 min-w-[200px]"
                        style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                    >
                        <div className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center mb-1">
                            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{contextMenuTarget.csgId ? 'Feature Options' : 'Shape Options'}</span>
                            <button onClick={() => setContextMenuTarget(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                        <div className="py-1">
                            {contextMenuTarget.csgId && (
                                <button
                                    onClick={() => {
                                        const node = nodes.find(n => n.id === contextMenuTarget.nodeId);
                                        const csg = node?.csgStack?.find(c => c.id === contextMenuTarget.csgId);
                                        if (csg) {
                                            setCsgEditTarget({ nodeId: node!.id, csgId: csg.id });
                                            setCsgDialogParams({ size: csg.params.size, depth: csg.params.depth || 10, angle: csg.params.angle || 45, axis: (csg.params.axis || 'Y') as any, limitType: csg.params.limitType || 'blind' });
                                            setContextMenuTarget(null);
                                        }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 rounded flex items-center gap-2 mb-2 transition-colors uppercase tracking-widest"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    Edit Feature
                                </button>
                            )}
                            <button
                                onClick={handleDeleteContextTarget}
                                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-900/40 hover:text-red-300 rounded flex items-center gap-2 mb-2 transition-colors uppercase tracking-widest"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete {contextMenuTarget.csgId ? 'Feature' : 'Shape'}
                            </button>

                            {!contextMenuTarget.csgId && (
                                <button
                                    onClick={() => {
                                        const node = nodes.find(n => n.id === contextMenuTarget.nodeId);
                                        if (node) {
                                            setSelectedNodeId(node.id);
                                            setCsgPendingPlacement('edit_base');
                                            setCsgDialogParams(prev => ({ 
                                                ...prev, 
                                                editTab: 'size',
                                                size: node.dimensions?.[0] || 10, width: node.dimensions?.[0] || 10, height: node.dimensions?.[1] || 10, depth: node.dimensions?.[2] || 10, axis: 'Y' as any,
                                                tx: node.position?.[0] || 0, ty: node.position?.[1] || 0, tz: node.position?.[2] || 0,
                                                rx: Math.round((node.rotation?.[0] || 0) * 180 / Math.PI), ry: Math.round((node.rotation?.[1] || 0) * 180 / Math.PI), rz: Math.round((node.rotation?.[2] || 0) * 180 / Math.PI),
                                                mirrorPlane: undefined
                                            }));
                                            setContextMenuTarget(null);
                                        }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 rounded flex items-center gap-2 mb-2 transition-colors uppercase tracking-widest"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    Edit Shape
                                </button>
                            )}

                            {!contextMenuTarget.csgId && (
                                <>
                                    <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-zinc-600 font-bold mt-2 border-t border-zinc-800/80 pt-2 mb-1">Assign Material</div>
                                    {[
                                        { label: 'PLA / ABS Plastic', val: 'plastic', hex: '#3b82f6' },
                                        { label: 'Machined Aluminum', val: 'metal', hex: '#71717a' },
                                        { label: 'Hardened Steel', val: 'custom', hex: '#52525b' },
                                        { label: 'FR4 (PCB)', val: 'fr4', hex: '#10b981' }
                                    ].map(mat => (
                                        <button
                                            key={mat.val}
                                            onClick={() => {
                                                updateNode(contextMenuTarget.nodeId, { materialType: mat.val as any, color: mat.hex });
                                                setContextMenuTarget(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-blue-900/40 hover:text-white rounded flex items-center gap-2 transition-colors"
                                        >
                                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: mat.hex }}></span>
                                            {mat.label}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                        <div className="px-3 py-1.5 border-t border-zinc-800 mt-1 text-center">
                            <span className="text-[8px] text-zinc-600 block leading-tight uppercase tracking-widest">Menu will auto-close when inactive</span>
                        </div>
                    </div>
                )}



                {/* Photorealistic Render Mock Modal */}
                {isRenderModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                        <div className="bg-[#09090b] border border-orange-500/30 rounded-xl shadow-[0_0_80px_rgba(249,115,22,0.15)] w-[800px] h-[600px] overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><CircleDot className="w-4 h-4 animate-spin-slow" /> DREAM Engine Photorealistic GPU Renderer</h2>
                                <button onClick={() => setIsRenderModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="relative flex-1 bg-black flex items-center justify-center p-8 overflow-hidden">
                                {/* Fake raytracing noise overlay */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none animate-pulse"></div>

                                <div className="relative w-full h-full border border-zinc-800 bg-zinc-900/40 rounded flex flex-col items-center justify-center overflow-hidden">
                                    <div className="absolute top-4 left-4 text-xs font-mono text-orange-500">
                                        [Local RTX GPU Accelerated]<br />
                                        Pass: 124 / 2048<br />
                                        Samples: 4096<br />
                                        Time Remaining: Est. 12s
                                    </div>

                                    <div className="w-64 h-64 border border-orange-500/20 rounded-full animate-pulse flex items-center justify-center">
                                        <ViewCubeIcon face="3d" />
                                    </div>

                                    <div className="absolute bottom-4 right-4 text-xs font-mono text-zinc-500">
                                        ProStudio Advanced Visualizer
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vendor Catalog Modal */}
                {isVendorModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-[#09090b] border border-orange-500/40 rounded-xl shadow-[0_0_50px_rgba(249,115,22,0.15)] w-[500px] overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><Database className="w-4 h-4" /> Vendor Automation Catalogs</h2>
                                <button onClick={() => setIsVendorModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <p className="text-xs text-zinc-400 leading-relaxed">Search official McMaster-Carr, Maxon, or Omega catalogs by part number to add precise hardware parts into your active project.</p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={vendorSearchQuery}
                                        onChange={e => setVendorSearchQuery(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && vendorSearchQuery.trim().length > 0) {
                                                setNodes(prev => [...prev, { id: `vendor_${Date.now()}`, type: 'primitive', name: `Vendor P/N: ${vendorSearchQuery}`, shape: 'cylinder', dimensions: [6, 6, 30], position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], materialType: 'metal', color: '#71717a', functionTag: 'Automation Component' }]);
                                                setIsVendorModalOpen(false);
                                                setVendorSearchQuery('');
                                            }
                                        }}
                                        placeholder="e.g. 91251A542 (McMaster) or 273752 (Maxon)"
                                        className="w-full bg-black/60 border border-zinc-700/80 rounded-lg py-2.5 px-3 focus:outline-none focus:border-orange-500 text-sm text-white font-mono"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setIsVendorModalOpen(false)} className="px-4 py-2 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
                                    <button onClick={() => {
                                        if (vendorSearchQuery.trim().length === 0) return;
                                        setNodes(prev => [...prev, {
                                            id: `vendor_${Date.now()}`,
                                            type: 'primitive',
                                            name: `Vendor P/N: ${vendorSearchQuery}`,
                                            shape: 'cylinder', // Proxy geometry for the demo
                                            dimensions: [6, 6, 30],
                                            position: [0, 0, 0],
                                            rotation: [0, 0, 0],
                                            scale: [1, 1, 1],
                                            materialType: 'metal',
                                            color: '#71717a',
                                            functionTag: 'Automation Component'
                                        }]);
                                        setIsVendorModalOpen(false);
                                        setVendorSearchQuery('');
                                    }} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold transition-colors shadow-lg shadow-orange-900/50">Fetch Topology</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {isDeleteModalVisible && (
                <DeleteConfirmationDialog 
                    onCancel={() => setIsDeleteModalVisible(false)}
                    onConfirm={confirmDeleteLocalProject}
                    projectName={activeProject?.name || ''}
                />
            )}
            <LoadingModal isOpen={isUploading} message="Loading & Initializing Model..." />
        </div>
    );
};

export default ProStudioPage;
