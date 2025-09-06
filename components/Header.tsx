
import React from 'react';

const FilmIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
);

export const Header: React.FC = () => {
    return (
        <header className="py-4 shadow-md bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 flex items-center justify-center">
                <FilmIcon />
                <h1 className="ml-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    AI Video Caption Generator
                </h1>
            </div>
        </header>
    );
};