import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import { LinkedInData, XData } from '../../types';
import { SocialMetricCard } from '../ui/SocialMetricCard';

type SocialState<T> = T | null | 'error';

export function SocialPage() {
  const { app, plugin } = useAppContext();
  const [linkedInData, setLinkedInData] = useState<SocialState<LinkedInData>>(null);
  const [xData, setXData] = useState<SocialState<XData>>(null);

  // SOCIAL-01 + SOCIAL-03 + SOCIAL-04: Read LinkedIn data from configurable path
  useEffect(() => {
    const path = plugin.settings.linkedinDataPath;
    if (!path || path.trim() === '') {
      setLinkedInData(null); // path-empty: show "No LinkedIn data" + "Set a file path"
      return;
    }
    readJsonFile<LinkedInData>(app, path).then(data => {
      setLinkedInData(data !== null ? data : 'error'); // null from readJsonFile = file unreadable
    });
  }, [plugin.settings.linkedinDataPath]);

  // SOCIAL-02 + SOCIAL-03 + SOCIAL-04: Read X data from configurable path
  useEffect(() => {
    const path = plugin.settings.xDataPath;
    if (!path || path.trim() === '') {
      setXData(null); // path-empty: show "No X data" + "Set a file path"
      return;
    }
    readJsonFile<XData>(app, path).then(data => {
      setXData(data !== null ? data : 'error'); // null from readJsonFile = file unreadable
    });
  }, [plugin.settings.xDataPath]);

  return (
    <div className="claudeos-page claudeos-page--social">
      <SocialMetricCard platform="linkedin" data={linkedInData} />
      <SocialMetricCard platform="x" data={xData} />
    </div>
  );
}
