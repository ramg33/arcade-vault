'use client';

import { useEffect, useRef } from 'react';

export type SerpentinaGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause?: () => void;
};

type Segment = { x: number; y: number };
type Fruit = { x: number; y: number; kind: string };
type SpriteFrame = { sx: number; sy: number; sw: number; sh: number };

const FRUIT_SPRITES: Record<string, SpriteFrame> = {
  banana: { sx: 34, sy: 136, sw: 110, sh: 160 },
  orange: { sx: 186, sy: 136, sw: 150, sh: 160 },
  grape: { sx: 378, sy: 136, sw: 110, sh: 160 },
  garlic: { sx: 540, sy: 136, sw: 130, sh: 160 },
  eggplant: { sx: 712, sy: 136, sw: 130, sh: 160 },
  strawberry: { sx: 894, sy: 136, sw: 110, sh: 160 },
  cherry: { sx: 1066, sy: 136, sw: 110, sh: 160 },
  carrot: { sx: 1228, sy: 136, sw: 130, sh: 160 },
  mushroom: { sx: 1400, sy: 136, sw: 130, sh: 160 },
  broccoli: { sx: 1582, sy: 136, sw: 110, sh: 160 },
  watermelon: { sx: 1734, sy: 136, sw: 150, sh: 160 },
  pepper: { sx: 1906, sy: 136, sw: 150, sh: 160 },
  kiwi: { sx: 2068, sy: 136, sw: 170, sh: 160 },
  lemon: { sx: 2250, sy: 136, sw: 140, sh: 160 },
  peach: { sx: 2432, sy: 136, sw: 130, sh: 160 },
  peanut: { sx: 2604, sy: 136, sw: 130, sh: 160 },
  apple: { sx: 2786, sy: 136, sw: 110, sh: 160 },
  tomato: { sx: 2948, sy: 136, sw: 130, sh: 160 },
  berries: { sx: 3110, sy: 136, sw: 150, sh: 160 },
  grapes2: { sx: 3302, sy: 136, sw: 110, sh: 160 },
  pineapple: { sx: 3454, sy: 136, sw: 150, sh: 160 },
  melon: { sx: 3637, sy: 136, sw: 130, sh: 160 },
};

const FRUIT_KINDS = Object.keys(FRUIT_SPRITES);

const W = 800;
const H = 800;
const TILE = 32;
const COLS = W / TILE;
const ROWS = H / TILE;
const BASE_INTERVAL = 200;
const MIN_INTERVAL = 80;
const INTERVAL_STEP = 12;

export default function SerpentinaGame(props: SerpentinaGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(props);
  // eslint-disable-next-line react-hooks/refs
  cbRef.current = props;
  const pausedRef = useRef(props.paused);
  // eslint-disable-next-line react-hooks/refs
  pausedRef.current = props.paused;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    let fruitsImg: HTMLCanvasElement | null = null;
    let imgLoaded = false;

    let snake: Segment[] = [];
    let dir: Segment = { x: 1, y: 0 };
    let nextDir: Segment = { x: 1, y: 0 };
    let fruit: Fruit = { x: 0, y: 0, kind: 'apple' };
    let score = 0;
    let level = 1;
    let fruitsEaten = 0;
    let moveInterval = BASE_INTERVAL;
    let moveTimer = 0;
    let state: 'playing' | 'gameover' = 'playing';
    let gameOverFired = false;

    function spawnFruit() {
      const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
      let fx: number, fy: number;
      do {
        fx = Math.floor(Math.random() * COLS);
        fy = Math.floor(Math.random() * ROWS);
      } while (occupied.has(`${fx},${fy}`));
      fruit = { x: fx, y: fy, kind: FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)] };
    }

    function initGame() {
      const cx = Math.floor(COLS / 2);
      const cy = Math.floor(ROWS / 2);
      snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      level = 1;
      fruitsEaten = 0;
      moveInterval = BASE_INTERVAL;
      moveTimer = 0;
      state = 'playing';
      gameOverFired = false;
      spawnFruit();
      cbRef.current.onScoreChange(0);
      cbRef.current.onLivesChange(1);
      cbRef.current.onLevelChange(1);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') cbRef.current.onTogglePause?.();
      if (e.code === 'ArrowUp' && dir.y !== 1) nextDir = { x: 0, y: -1 };
      if (e.code === 'ArrowDown' && dir.y !== -1) nextDir = { x: 0, y: 1 };
      if (e.code === 'ArrowLeft' && dir.x !== 1) nextDir = { x: -1, y: 0 };
      if (e.code === 'ArrowRight' && dir.x !== -1) nextDir = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);

    function drawSpriteFrame(frame: SpriteFrame, x: number, y: number, w: number, h: number) {
      if (!imgLoaded || !fruitsImg) return;
      ctx.drawImage(fruitsImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
    }

    function update(dt: number) {
      if (state !== 'playing') return;

      moveTimer += dt * 1000;
      if (moveTimer < moveInterval) return;
      moveTimer -= moveInterval;

      dir = { ...nextDir };

      const head = snake[0];
      const nx = head.x + dir.x;
      const ny = head.y + dir.y;

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        state = 'gameover';
        return;
      }

      if (snake.some((s) => s.x === nx && s.y === ny)) {
        state = 'gameover';
        return;
      }

      const ate = nx === fruit.x && ny === fruit.y;
      const newHead: Segment = { x: nx, y: ny };

      if (ate) {
        snake = [newHead, ...snake];
        fruitsEaten++;
        score += 10 * level;
        cbRef.current.onScoreChange(score);

        if (fruitsEaten % 5 === 0) {
          level++;
          moveInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - (level - 1) * INTERVAL_STEP);
          cbRef.current.onLevelChange(level);
        }

        spawnFruit();
      } else {
        snake = [newHead, ...snake.slice(0, -1)];
      }
    }

    function drawOverlay(title: string, sub: string) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 46px monospace';
      ctx.fillText(title, W / 2, H / 2 - 18);
      ctx.font = '18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(sub, W / 2, H / 2 + 22);
    }

    function draw() {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          ctx.fillRect(col * TILE + TILE / 2 - 1, row * TILE + TILE / 2 - 1, 2, 2);
        }
      }

      const frame = FRUIT_SPRITES[fruit.kind];
      const pad = 4;
      drawSpriteFrame(
        frame,
        fruit.x * TILE + pad,
        fruit.y * TILE + pad,
        TILE - pad * 2,
        TILE - pad * 2
      );

      for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        const isHead = i === 0;
        const margin = isHead ? 2 : 3;
        ctx.fillStyle = isHead ? '#4ade80' : '#166534';
        ctx.fillRect(
          seg.x * TILE + margin,
          seg.y * TILE + margin,
          TILE - margin * 2,
          TILE - margin * 2
        );

        if (isHead) {
          ctx.fillStyle = '#0a0a0a';
          const e = 3;
          if (dir.x === 1) {
            ctx.fillRect(seg.x * TILE + TILE - 8, seg.y * TILE + 6, e, e);
            ctx.fillRect(seg.x * TILE + TILE - 8, seg.y * TILE + TILE - 9, e, e);
          } else if (dir.x === -1) {
            ctx.fillRect(seg.x * TILE + 5, seg.y * TILE + 6, e, e);
            ctx.fillRect(seg.x * TILE + 5, seg.y * TILE + TILE - 9, e, e);
          } else if (dir.y === -1) {
            ctx.fillRect(seg.x * TILE + 6, seg.y * TILE + 5, e, e);
            ctx.fillRect(seg.x * TILE + TILE - 9, seg.y * TILE + 5, e, e);
          } else {
            ctx.fillRect(seg.x * TILE + 6, seg.y * TILE + TILE - 8, e, e);
            ctx.fillRect(seg.x * TILE + TILE - 9, seg.y * TILE + TILE - 8, e, e);
          }
        }
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Score: ' + score, 10, 10);
      ctx.textAlign = 'center';
      ctx.fillText('Nivel: ' + level, W / 2, 10);

      if (state === 'gameover') drawOverlay('GAME OVER', `PUNTAJE: ${score}`);
      if (pausedRef.current) drawOverlay('EN PAUSA', 'PULSA REANUDAR PARA CONTINUAR');
    }

    let lastTime: number | null = null;
    let rafHandle: number;
    let cancelled = false;

    function loop(ts: number) {
      if (cancelled) return;
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) {
        update(dt);
        if (state === 'gameover' && !gameOverFired) {
          gameOverFired = true;
          cbRef.current.onGameOver(score);
        }
      }
      draw();
      rafHandle = requestAnimationFrame(loop);
    }

    const rawImg = new Image();
    rawImg.onload = () => {
      if (cancelled) return;
      const oc = document.createElement('canvas');
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext('2d')!;
      octx.drawImage(rawImg, 0, 0);
      fruitsImg = oc;
      imgLoaded = true;
      initGame();
      rafHandle = requestAnimationFrame(loop);
    };
    rawImg.onerror = () => console.error('Failed to load fruit sprites');
    rawImg.src = '/games/serpentina/fruits.png';

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const touchButton = (label: string, code: string) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    },
    onTouchCancel: (e: React.TouchEvent) => {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    },
    children: label,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
      <div className="serpentina-touch-controls">
        <button {...touchButton('↑', 'ArrowUp')} />
        <button {...touchButton('↓', 'ArrowDown')} />
        <button {...touchButton('←', 'ArrowLeft')} />
        <button {...touchButton('→', 'ArrowRight')} />
      </div>
    </div>
  );
}
