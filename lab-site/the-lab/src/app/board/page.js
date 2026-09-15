'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';

const fmt = cents => `$${(cents / 100).toFixed(0)}`;

// Sections the bulletin is being built around. Only bounty_board is wired up; the
// rest are deliberately blocked out rather than hidden, so the kiosk reads as a
// board with rooms still being filled instead of a board with nothing on it.
const SECTIONS = [
  {
    key: 'announcements',
    title: 'announcements',
    desc: 'Lab news, closures, and anything members need to know today.',
    accent: 'var(--cyan)',
  },
  {
    key: 'events_calendar',
    title: 'events_calendar',
    desc: 'Workshops, open labs, and member meetups.',
    accent: 'var(--amber)',
  },
  {
    key: 'member_projects',
    title: 'member_projects',
    desc: 'See what the community is building right now.',
    accent: 'var(--cyan)',
  },
];

// Funded-project crowdfunding, discussed but not built. Blocked out here so the
// layout already reserves the space it will need.
const PROJECT_FUNDING = {
  key: 'project_funding',
  title: 'project_funding',
  desc: 'Back a specific piece of equipment or a shop upgrade, not just the general fund.',
  accent: 'var(--amber)',
};

/** A section the board has reserved but has not filled in yet. */
function BlockedOut({ section }) {
  return (
    <div
      style={{
        border: '1px dashed var(--bd)',
        background: 'var(--bg-card)',
        padding: '20px 22px',
        opacity: 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 120,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 'auto' }}>
        <span style={{ fontFamily: 'var(--mono)', color: section.accent, fontSize: 12, letterSpacing: '0.1em' }}>
          {section.title}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-dim)',
            border: '1px solid var(--bd)',
            padding: '2px 8px',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.1em',
            flexShrink: 0,
          }}
        >
          soon
        </span>
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginBottom: 'auto' }}>{section.desc}</div>
    </div>
  );
}

// Compact funding readout. This used to be half the board; it is now a single strip
// along the bottom so the bulletin itself is what people read first.
//
// Dues is the steady base the lab can count on; donations are what pushes past it, so
// the bar reads as "committed" + "given". Aggregate only; the per-tier breakdown is
// admin-only (see /dashboard/admin/donations).
//
// The two segment colours are stepped into the legible lightness band and CVD-validated
// (deutan dE 22.7), not the raw --green/--cyan neons which read as one colour to a
// colourblind viewer at that lightness.
function FundingStrip({ stats, donateUrl }) {
  const DUES = '#2da810';   // recurring dues - validated categorical 1
  const DON  = '#2f9fd4';   // donations      - validated categorical 2

  if (!stats) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
        funding stats unavailable
      </div>
    );
  }

  const goalCents      = stats.goalCents || 0;
  const duesCents      = stats.duesCents || 0;
  const donationsCents = stats.donationsCents || 0;
  const totalCents     = stats.totalCents ?? (duesCents + donationsCents);

  const scale    = Math.max(goalCents, totalCents, 1);   // overshoot stays on-scale
  const duesW    = (duesCents / scale) * 100;
  const donW     = (donationsCents / scale) * 100;
  const goalMark = (goalCents / scale) * 100;
  const pct      = goalCents > 0 ? Math.round((totalCents / goalCents) * 100) : 0;
  const met      = totalCents >= goalCents;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', flexShrink: 0 }}>
        MONTHLY_FUNDING
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-mid)', flexShrink: 0 }}>
        <span style={{ color: met ? 'var(--green)' : 'var(--text-bright)' }}>{fmt(totalCents)}</span>
        {' / '}{fmt(goalCents)}
      </div>

      {/* Stacked bar. 2px surface gap between the two fills so they read as distinct. */}
      <div
        role="img"
        aria-label={`${fmt(totalCents)} of a ${fmt(goalCents)} monthly goal: ${fmt(duesCents)} recurring dues and ${fmt(donationsCents)} donations.`}
        style={{ display: 'flex', height: 6, flex: 1, background: 'var(--bg)', border: '1px solid var(--bd)', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ width: `${duesW}%`, background: DUES, transition: 'width 1s ease' }} />
        <div style={{ width: `${donW}%`, background: DON, borderLeft: donW > 0 && duesW > 0 ? '2px solid var(--bg)' : 'none', transition: 'width 1s ease' }} />
        {goalMark < 100 && (
          <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${goalMark}%`, width: 2, background: 'var(--amber)' }} />
        )}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: met ? 'var(--green)' : 'var(--text-mid)', flexShrink: 0 }}>
        {pct}% funded
      </div>

      {/* Donating still happens on the visitor's own phone, never on this panel. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ padding: 6, background: '#fff', lineHeight: 0 }}>
          <QRCode value={donateUrl} size={54} level="M" />
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          scan to<br />donate
        </span>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const baseUrl   = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const donateUrl = `${baseUrl}/donate`;

  const [stats, setStats] = useState(null);

  // Refresh donation stats every 5 min. The board runs unattended for weeks.
  useEffect(() => {
    const load = () => {
      fetch('/api/v1/donations/stats')
        .then(r => (r.ok ? r.json() : null))
        .then(data => setStats(data))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 40px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: '0.18em', marginBottom: 8 }}>
          <span style={{ color: 'var(--green)' }}>$</span> ./board --bulletin
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.04em', color: 'var(--text-bright)', margin: 0 }}>
          fab lab fort smith
        </h1>
      </div>

      {/* Bulletin sections, blocked out until they are built */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flex: 2 }}>
        {SECTIONS.map(section => (
          <BlockedOut key={section.key} section={section} />
        ))}
      </div>

      {/* The one live destination, plus the funding idea it will sit beside */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
        <div className="card" style={{ border: '1px solid var(--green)' }}>
          <Link
            href="/board/bounties"
            style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 22px', textDecoration: 'none', height: '100%', justifyContent: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontSize: 12, letterSpacing: '0.1em' }}>
                bounty_board
              </span>
              <span style={{ color: 'var(--green)', fontSize: 12, fontFamily: 'var(--mono)' }}>&rarr;</span>
            </div>
            <div style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.6 }}>
              View and claim open community tasks. Earn points, build reputation.
            </div>
          </Link>
        </div>

        <BlockedOut section={PROJECT_FUNDING} />
      </div>

      {/* Funding, demoted to a strip */}
      <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 18 }}>
        <FundingStrip stats={stats} donateUrl={donateUrl} />
      </div>

    </div>
  );
}
