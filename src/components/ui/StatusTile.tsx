import React from 'react';

interface StatusTileProps {
  label: string;
  value: string | null;
  numeric?: boolean;
}

export function StatusTile({ label, value, numeric = false }: StatusTileProps) {
  const isNoData = value === null;

  return (
    <div className={`claudeos-tile${isNoData ? ' claudeos-tile--no-data' : ''}`}>
      <div className="claudeos-tile__label">{label}</div>
      {isNoData ? (
        <>
          <div className="claudeos-tile__value">—</div>
          <div className="claudeos-tile__no-data-label">No data</div>
        </>
      ) : (
        <div className={`claudeos-tile__value${numeric ? ' claudeos-tile__value--numeric' : ''}`}>
          {value}
        </div>
      )}
    </div>
  );
}
