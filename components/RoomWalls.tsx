import React from 'react';
import * as THREE from 'three';

export const RoomWalls = () => {
    return (
        <group position={[0, -50, 0]}>
            <mesh position={[0, 100, -200]} receiveShadow>
                <planeGeometry args={[400, 200]} />
                <meshStandardMaterial color="#08080a" roughness={1} />
            </mesh>
            <mesh position={[-200, 100, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[400, 200]} />
                <meshStandardMaterial color="#08080a" roughness={1} />
            </mesh>
            <mesh position={[200, 100, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[400, 200]} />
                <meshStandardMaterial color="#08080a" roughness={1} />
            </mesh>
        </group>
    );
};
