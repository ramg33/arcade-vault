'use client';

import { useEffect, useRef } from 'react';

export type TetrisGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export default function TetrisGame(props: TetrisGameProps) {
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

    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;
    const BOARD_W = COLS * BLOCK; // 300
    const PREVIEW_X = BOARD_W; // 300
    const PREVIEW_W = 120;

    const COLORS: (string | null)[] = [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - pale blue
      '#ffb74d', // L - orange
      '#9e9e9e', // N - gray
    ];

    const PIECES: (number[][] | null)[] = [
      null,
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ], // I
      [
        [2, 2],
        [2, 2],
      ], // O
      [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0],
      ], // T
      [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0],
      ], // S
      [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0],
      ], // Z
      [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0],
      ], // J
      [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0],
      ], // L
      [
        [8, 8, 8],
        [8, 0, 8],
        [8, 8, 8],
      ], // N
    ];

    const LINE_SCORES = [0, 100, 300, 500, 800];

    type Piece = { type: number; shape: number[][]; x: number; y: number };

    let current: Piece;
    let next: Piece;
    let score: number;
    let lines: number;
    let level: number;
    let gameOver: boolean;
    let dropAccum: number; // seconds
    let dropInterval: number; // ms

    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = (PIECES[type] as number[][]).map((row) => [...row]);
      return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length,
        cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
        cbRef.current.onScoreChange(score);
        cbRef.current.onLevelChange(level);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      cbRef.current.onScoreChange(score);
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
        cbRef.current.onScoreChange(score);
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        endGame();
      }
    }

    function endGame() {
      gameOver = true;
      cbRef.current.onGameOver(score);
    }

    function drawBlock(x: number, y: number, colorIndex: number, alpha = 1) {
      if (!colorIndex) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS[colorIndex]!;
      ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
      ctx.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(BOARD_W, r * BLOCK);
        ctx.stroke();
      }
    }

    function drawNext() {
      const NB = 24;
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(PREVIEW_X, 0, PREVIEW_W, ROWS * BLOCK);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(PREVIEW_X, 0, PREVIEW_W, ROWS * BLOCK);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', PREVIEW_X + PREVIEW_W / 2, 18);

      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      const startX = PREVIEW_X + (PREVIEW_W - 4 * NB) / 2;
      const startY = 32;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const px = startX + (offX + c) * NB;
          const py = startY + (offY + r) * NB;
          ctx.fillStyle = COLORS[shape[r][c]]!;
          ctx.fillRect(px + 1, py + 1, NB - 2, NB - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(px + 1, py + 1, NB - 2, 3);
        }
      }
    }

    function drawOverlay() {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, BOARD_W, ROWS * BLOCK);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('EN PAUSA', BOARD_W / 2, (ROWS * BLOCK) / 2);
    }

    function draw() {
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(0, 0, BOARD_W, ROWS * BLOCK);
      drawGrid();

      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c]);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) drawBlock(current.x + c, gy + r, current.shape[r][c], 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) drawBlock(current.x + c, current.y + r, current.shape[r][c]);

      if (pausedRef.current) drawOverlay();
      drawNext();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current || gameOver) return;
      switch (e.code) {
        case 'ArrowLeft':
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case 'ArrowRight':
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case 'ArrowDown':
          softDrop();
          break;
        case 'ArrowUp':
        case 'KeyX':
          tryRotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let lastTime: number | null = null;
    let rafHandle: number;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      if (!pausedRef.current && !gameOver) {
        dropAccum += dt;
        if (dropAccum >= dropInterval / 1000) {
          dropAccum = 0;
          if (!collide(current.shape, current.x, current.y + 1)) {
            current.y++;
          } else {
            lockPiece();
          }
        }
      }

      draw();
      rafHandle = requestAnimationFrame(loop);
    }

    const board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    next = randomPiece();
    spawn();
    cbRef.current.onScoreChange(0);
    cbRef.current.onLevelChange(1);
    cbRef.current.onLivesChange(1);

    rafHandle = requestAnimationFrame(loop);

    return () => {
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
        width={420}
        height={600}
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
      <div className="tetris-touch-controls">
        <button {...touchButton('◁', 'ArrowLeft')} />
        <button {...touchButton('▷', 'ArrowRight')} />
        <button {...touchButton('△', 'ArrowUp')} />
        <button {...touchButton('▼', 'ArrowDown')} />
        <button {...touchButton('⬛', 'Space')} />
      </div>
    </div>
  );
}
