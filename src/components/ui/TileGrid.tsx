import React from 'react';

interface TileGridProps {
  children: React.ReactNode;
}

export function TileGrid({ children }: TileGridProps) {
  return (
    <div className="claudeos-tile-grid">
      {children}
    </div>
  );
}
