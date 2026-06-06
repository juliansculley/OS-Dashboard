import React from 'react';
import { LinkedInData, XData } from '../../types';

type SocialData<T> = T | null | 'error';

interface SocialMetricCardProps {
  platform: 'linkedin' | 'x';
  data: SocialData<LinkedInData> | SocialData<XData>;
}

function formatUpdated(iso: string): string {
  return iso.substring(0, 10);
}

export function SocialMetricCard({ platform, data }: SocialMetricCardProps) {
  const isLinkedIn = platform === 'linkedin';
  const heading = isLinkedIn ? 'LinkedIn' : 'X (Twitter)';

  // path-empty: "No data" message + action prompt
  if (data === null) {
    const emptyHeading = isLinkedIn ? 'No LinkedIn data' : 'No X data';
    return (
      <div className="claudeos-social-card claudeos-social-card--empty">
        <div className="claudeos-social-card__heading">{heading}</div>
        <div className="claudeos-empty-state">
          <div className="claudeos-empty-state__heading">{emptyHeading}</div>
          <div className="claudeos-empty-state__body">Set a file path in Settings to load metrics.</div>
        </div>
      </div>
    );
  }

  // file-unreadable: "Couldn't read" message + fix prompt
  if (data === 'error') {
    const errorHeading = isLinkedIn ? "Couldn't read LinkedIn data" : "Couldn't read X data";
    return (
      <div className="claudeos-social-card claudeos-social-card--empty">
        <div className="claudeos-social-card__heading">{heading}</div>
        <div className="claudeos-empty-state">
          <div className="claudeos-empty-state__heading">{errorHeading}</div>
          <div className="claudeos-empty-state__body">Check that the file path in Settings is correct.</div>
        </div>
      </div>
    );
  }

  // Render LinkedIn metrics
  if (isLinkedIn) {
    const li = data as LinkedInData;
    return (
      <div className="claudeos-social-card">
        <div className="claudeos-social-card__heading">{heading}</div>
        <div className="claudeos-social-metrics-row">
          <div className="claudeos-metric">
            <div className="claudeos-metric__label">Followers</div>
            <div className="claudeos-metric__value">{li.followers.toLocaleString()}</div>
          </div>
          <div className="claudeos-metric">
            <div className="claudeos-metric__label">Connections</div>
            <div className="claudeos-metric__value">{li.connections.toLocaleString()}</div>
          </div>
          <div className="claudeos-metric">
            <div className="claudeos-metric__label">Posts</div>
            <div className="claudeos-metric__value">{li.posts.toLocaleString()}</div>
          </div>
        </div>
        {li.updated_at && (
          <div className="claudeos-metric__updated">
            Updated: {formatUpdated(li.updated_at)}
          </div>
        )}
      </div>
    );
  }

  // Render X metrics
  const x = data as XData;
  return (
    <div className="claudeos-social-card">
      <div className="claudeos-social-card__heading">{heading}</div>
      <div className="claudeos-social-metrics-row">
        <div className="claudeos-metric">
          <div className="claudeos-metric__label">Followers</div>
          <div className="claudeos-metric__value">{x.followers.toLocaleString()}</div>
        </div>
        <div className="claudeos-metric">
          <div className="claudeos-metric__label">Following</div>
          <div className="claudeos-metric__value">{x.following.toLocaleString()}</div>
        </div>
        <div className="claudeos-metric">
          <div className="claudeos-metric__label">Tweets</div>
          <div className="claudeos-metric__value">{x.tweets.toLocaleString()}</div>
        </div>
      </div>
      {x.updated_at && (
        <div className="claudeos-metric__updated">
          Updated: {formatUpdated(x.updated_at)}
        </div>
      )}
    </div>
  );
}
