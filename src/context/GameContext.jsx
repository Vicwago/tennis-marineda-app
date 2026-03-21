import React, { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const [sport, setSport] = useState(null); // 'padel' | 'tennis' | null (landing)
    const [role, setRole] = useState(null); // 'admin' | 'player' | null
    const [tennisCategory, setTennisCategory] = useState('adults'); // 'adults' | 'juveniles'

    // Helper to reset or switch modes
    const selectMode = (selectedSport, selectedRole) => {
        setSport(selectedSport);
        setRole(selectedRole);
    };

    const value = {
        sport,
        setSport,
        role,
        setRole,
        tennisCategory,
        setTennisCategory,
        selectMode
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};
