import { useState, useEffect } from 'react';

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error writing localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}
