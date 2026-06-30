'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GAMES, type ScoreRow } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const game = useMemo(() => GAMES.find((g) => g.id === id), [id]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [plays, setPlays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from('scores')
      .select('player_name, score, achieved_at', { count: 'exact' })
      .eq('game_id', id)
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data, error, count }) => {
        if (!error && data) {
          setPlays(count ?? 0);
          setScores(
            (data as Array<{ player_name: string; score: number; achieved_at: string }>).map(
              (row, i) => ({
                rank: i + 1,
                name: row.player_name,
                score: row.score,
                date: new Date(row.achieved_at).toLocaleDateString('es-ES', {
                  timeZone: 'UTC',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
              })
            )
          );
        }
        setLoading(false);
      });
  }, [id]);

  if (!game) return null;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={'cover-bg ' + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">
                {plays === null
                  ? game.plays
                  : plays >= 1000
                    ? (plays / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                    : String(plays)}
              </div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: 'var(--magenta)',
                  textShadow: '0 0 6px rgba(255,0,110,0.5)',
                }}
              >
                {(scores[0]?.score ?? game.best).toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: 'var(--yellow)',
                  textShadow: '0 0 6px rgba(245,255,0,0.5)',
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn xl pulse" onClick={() => router.push(`/games/${game.id}/play`)}>
              ▶ JUGAR AHORA
            </button>
            <button className="btn ghost lg" onClick={() => router.push('/games')}>
              VOLVER AL VAULT
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {loading ? (
            <div
              className="pixel"
              style={{
                fontSize: 11,
                letterSpacing: '0.16em',
                color: 'var(--ink-dim)',
                padding: '24px 0',
              }}
            >
              CARGANDO…
            </div>
          ) : scores.length === 0 ? (
            <div
              className="pixel"
              style={{
                fontSize: 11,
                letterSpacing: '0.16em',
                color: 'var(--ink-dim)',
                padding: '24px 0',
              }}
            >
              AÚN NO HAY PUNTUACIONES
            </div>
          ) : (
            scores.map((r, i) => (
              <div
                key={r.name + i}
                className={
                  'lb-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
                }
              >
                <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
                <div className="pl">
                  {r.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString('es-ES')}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
