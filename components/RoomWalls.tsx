import React from 'react';
import * as THREE from 'three';

export const RoomWalls = ({ roomTheme = 'dark' }: { roomTheme?: 'dark' | 'light' }) => {
    const wallColor = roomTheme === 'light' ? '#808080' : '#08080a';

    return (
        <group position={[0, -50, 0]}>
            <mesh receiveShadow>
                <sphereGeometry args={[350, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial 
                   color={wallColor} 
                   roughness={1} 
                   side={THREE.BackSide} 
                />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[350, 64]} />
                <meshStandardMaterial color={wallColor} roughness={1} />
            </mesh>
        </group>
    );
};
