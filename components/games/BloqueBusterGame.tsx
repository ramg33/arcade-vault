'use client';

import { useEffect, useRef } from 'react';

export type BloqueBusterGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type SpriteFrame = { sx: number; sy: number; sw: number; sh: number };
type BlockDef = { col: number; row: number; color: string };
type Level = { speed: number; blocks: BlockDef[] };

type Paddle = { x: number; y: number; w: number; h: number };
type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };
type Block = { x: number; y: number; w: number; h: number; color: string; alive: boolean };
type Explosion = { x: number; y: number; w: number; h: number; color: string; elapsed: number };

const SPRITES: Record<string, SpriteFrame> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
};

const BLOCK_SPRITES: Record<string, SpriteFrame> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const LEVELS: Level[] = (() => {
  const rowColors1 = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
  const rowColors2 = ['gray', 'cyan', 'hotpink', 'yellow', 'magenta', 'green'];
  const rowColors4 = ['cyan', 'magenta', 'green', 'yellow', 'hotpink', 'red'];

  const l1: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? 'yellow' : 'magenta' });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? 'hotpink' : 'cyan' });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

export default function BloqueBusterGame(props: BloqueBusterGameProps) {
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
    const W = 800;
    const H = 600;

    let ssImg: HTMLCanvasElement | null = null;
    let ssLoaded = false;

    const bounceSound = new Audio('/games/bloque-buster/sounds/ball-bounce.mp3');
    const breakSound = new Audio('/games/bloque-buster/sounds/break-sound.mp3');

    function playSound(audio: HTMLAudioElement) {
      try {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.play().catch(() => {});
      } catch {}
    }

    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') e.preventDefault();
      keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function drawSpriteFrame(frame: SpriteFrame, x: number, y: number, w: number, h: number) {
      if (!ssLoaded || !ssImg) return;
      ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
    }

    const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };

    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let currentLevel = 1;
    let gameOver = false;

    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
      cbRef.current.onLevelChange(currentLevel);
    }

    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function initGame() {
      initPaddle();
      lives = 3;
      score = 0;
      gameOver = false;
      loadLevel(1);
      cbRef.current.onScoreChange(0);
      cbRef.current.onLivesChange(3);
    }

    function update(dt: number) {
      if (gameOver) return;

      if (keys['ArrowLeft']) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys['ArrowRight']) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        playSound(bounceSound);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        playSound(bounceSound);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          cbRef.current.onScoreChange(score);
          ball.vy = -ball.vy;
          playSound(breakSound);
          if (blocks.every((b) => !b.alive)) {
            loadLevel(currentLevel < 5 ? currentLevel + 1 : 1);
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        cbRef.current.onLivesChange(lives);
        if (lives <= 0) {
          lives = 0;
          gameOver = true;
          cbRef.current.onGameOver(score);
        } else {
          initBall();
        }
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
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive)
          drawSpriteFrame(BLOCK_SPRITES[block.color], block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawSpriteFrame(EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSpriteFrame(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
      drawSpriteFrame(SPRITES.ball, ball.x, ball.y, ball.w, ball.h);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Score: ' + score, 10, 10);
      ctx.textAlign = 'center';
      ctx.fillText('Nivel: ' + currentLevel, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSpriteFrame(SPRITES.ball, bx, 10, ballSize, ballSize);
      }

      if (gameOver) drawOverlay('GAME OVER', `PUNTAJE: ${score}`);
      if (pausedRef.current) drawOverlay('EN PAUSA', 'PULSA REANUDAR PARA CONTINUAR');
    }

    let lastTime: number | null = null;
    let rafHandle: number;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) update(dt);
      draw();
      rafHandle = requestAnimationFrame(loop);
    }

    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement('canvas');
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext('2d')!;
      octx.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      initGame();
      rafHandle = requestAnimationFrame(loop);
    };
    rawImg.onerror = () => console.error('Failed to load spritesheet');
    rawImg.src = '/games/bloque-buster/spritesheet-breakout.png';

    return () => {
      cancelAnimationFrame(rafHandle);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
        height={600}
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
      <div className="bloque-buster-touch-controls">
        <button {...touchButton('◁', 'ArrowLeft')} />
        <button {...touchButton('▷', 'ArrowRight')} />
      </div>
    </div>
  );
}
