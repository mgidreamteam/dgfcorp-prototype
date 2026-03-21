import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export type ViewMode = '3D' | 'FRONT' | 'TOP';

export const CameraPresets: React.FC<{ mode: ViewMode }> = ({ mode }) => {
  const { camera, controls } = useThree();
  
  useEffect(() => {
    if (!controls) return;
    const ctrl = controls as any;
    
    switch (mode) {
      case '3D':
        camera.position.set(150, 100, 150);
        break;
      case 'FRONT':
        camera.position.set(0, 0, 150);
        break;
      case 'TOP':
        camera.position.set(0, 150, 0);
        break;
    }
    camera.lookAt(0, 0, 0);
    if(ctrl.target) {
        ctrl.target.set(0, 0, 0);
        ctrl.update();
    }
  }, [mode, camera, controls]);

  return null;
};
