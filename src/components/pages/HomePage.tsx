import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import { TileSyncData, TileCountData } from '../../types';
import { TileGrid } from '../ui/TileGrid';
import { StatusTile } from '../ui/StatusTile';
import { SkillsSection } from '../ui/SkillsSection';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

export function HomePage(): React.JSX.Element {
  const { app, plugin } = useAppContext();
  const [syncValue, setSyncValue] = useState<string | null>(null);
  const [projectsValue, setProjectsValue] = useState<string | null>(null);

  // Load sync tile data on mount and when path changes
  useEffect(() => {
    readJsonFile<TileSyncData>(app, plugin.settings.lastSyncPath).then(data => {
      if (data && typeof data.timestamp === 'string' && data.timestamp.trim() !== '') {
        const formatted = formatTimestamp(data.timestamp);
        setSyncValue(formatted !== '' ? formatted : null);
      } else {
        setSyncValue(null);
      }
    });
  }, [plugin.settings.lastSyncPath]);

  // Load active projects tile data on mount and when path changes
  useEffect(() => {
    readJsonFile<TileCountData>(app, plugin.settings.activeProjectsPath).then(data => {
      if (data && typeof data.count === 'number' && !isNaN(data.count)) {
        setProjectsValue(String(data.count));
      } else {
        setProjectsValue(null);
      }
    });
  }, [plugin.settings.activeProjectsPath]);

  return (
    <div className="claudeos-page claudeos-page--home">
      <TileGrid>
        <StatusTile label="Last vault sync" value={syncValue} />
        <StatusTile label="Active projects" value={projectsValue} numeric={true} />
      </TileGrid>
      <SkillsSection />
    </div>
  );
}
