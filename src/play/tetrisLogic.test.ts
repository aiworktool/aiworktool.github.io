import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cellsOf, clearLines, collides, dropIntervalMs, emptyBoard, ghostY, hardDrop, linePoints,
  movePiece, newGame, rotatePiece, shuffledBag, tick, TETRIS_H, TETRIS_W,
  type ActivePiece, type PieceId, type Rotation, type TetrisBoard, type TetrisGame,
} from './tetrisLogic';

describe('tetris shapes', () => {
  it('defines a 10 by 20 board', () => {
    const board = emptyBoard();
    expect(board).toHaveLength(TETRIS_H);
    expect(board[0]).toHaveLength(TETRIS_W);
  });

  it('gives every piece four rotations with four cells each', () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7] as PieceId[]) {
      for (let rotation = 0; rotation < 4; rotation += 1) {
        expect(cellsOf(piece(id, rotation as Rotation, 0, 0)), `piece ${id} rotation ${rotation}`)
          .toHaveLength(4);
      }
    }
    expect(cellsOf(piece(1, 0, 0, 0))).toEqual([[0, 1], [1, 1], [2, 1], [3, 1]]);
    expect(cellsOf(piece(2, 0, 0, 0))).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
  });

  it('turns the T piece clockwise', () => {
    expect(cellsOf(piece(3, 0, 0, 0))).toEqual([[1, 0], [0, 1], [1, 1], [2, 1]]);
    expect(cellsOf(piece(3, 1, 0, 0))).toEqual([[1, 0], [1, 1], [2, 1], [1, 2]]);
    expect(cellsOf(piece(3, 2, 0, 0))).toEqual([[0, 1], [1, 1], [2, 1], [1, 2]]);
  });
});

describe('tetris collision and movement', () => {
  it('detects walls, the floor and stacked cells', () => {
    expect(collides(emptyBoard(), piece(2, 0, -1, 0))).toBe(true);
    expect(collides(emptyBoard(), piece(2, 0, 0, 19))).toBe(true);
    expect(collides(emptyBoard(), piece(1, 0, 3, 0))).toBe(false);
    const board = emptyBoard();
    board[5][3] = 1;
    expect(collides(board, piece(1, 0, 3, 4))).toBe(true);
  });

  it('moves a piece and stops at walls and the floor', () => {
    const atWall = game(piece(2, 0, 0, 0));
    expect(movePiece(atWall, -1, 0)).toBe(atWall);
    expect(movePiece(atWall, 1, 0).piece?.x).toBe(1);
    const atFloor = game(piece(2, 0, 0, 18));
    expect(movePiece(atFloor, 0, 1)).toBe(atFloor);
    const noPiece = game(null);
    expect(movePiece(noPiece, 0, 1)).toBe(noPiece);
  });

  it('rotates in the open and kicks off the wall', () => {
    const open = game(piece(3, 0, 4, 0));
    const turned = rotatePiece(open, 1);
    expect(turned.piece?.rotation).toBe(1);
    expect(turned.piece?.x).toBe(4);
    const nearWall = game(piece(3, 0, 8, 0));
    const kicked = rotatePiece(nearWall, 1);
    expect(kicked.piece?.rotation).toBe(1);
    expect(kicked.piece?.x).toBe(7);
  });

  it('leaves the piece alone when a rotation fits nowhere', () => {
    const board = emptyBoard();
    for (const x of [3, 4, 5, 6, 7, 8]) board[2][x] = 1;
    const trapped = game(piece(1, 0, 3, 0), board);
    expect(rotatePiece(trapped, 1)).toBe(trapped);
  });
});

describe('tetris 7-bag', () => {
  it('deals a permutation of all seven pieces', () => {
    const bag = shuffledBag(() => 0);
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
    expect(bag.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(shuffledBag(() => 0)).toEqual(shuffledBag(() => 0));
  });

  it('cycles the bag before repeating a piece', () => {
    let game = newGame(() => 0);
    const first = game.piece?.id;
    const ids: Array<PieceId | undefined> = [first];
    for (let index = 0; index < 7; index += 1) {
      game = hardDrop(game, () => 0);
      ids.push(game.piece?.id);
    }
    const dealt = ids.slice(0, 7);
    expect(new Set(dealt).size).toBe(7);
    expect(ids[7]).toBe(first);
  });
});

describe('tetris gravity and locking', () => {
  it('ticks down one row and locks at the floor', () => {
    const falling = game(piece(2, 0, 4, 0));
    expect(tick(falling, () => 0).piece?.y).toBe(1);
    const atFloor = game(piece(2, 0, 4, 18));
    const locked = tick(atFloor, () => 0);
    expect(locked.board[18][4]).toBe(2);
    expect(locked.board[19][4]).toBe(2);
    expect(locked.piece).not.toBeNull();
  });

  it('hard drops to the floor and scores two points per row', () => {
    const game = newGame(() => 0);
    const dropped = hardDrop(game, () => 0);
    expect(dropped.board[19][4]).toBe(2);
    expect(dropped.board[19][3]).toBe(0);
    expect(dropped.score).toBe(36);
    expect(dropped.piece).not.toBeNull();
  });

  it('shows the ghost at the landing row', () => {
    expect(ghostY(game(piece(2, 0, 4, 5)))).toBe(18);
    expect(ghostY(game(piece(1, 0, 3, 0)))).toBe(18);
    expect(ghostY(game(null))).toBe(0);
  });

  it('ends the game when a spawn has no room', () => {
    const board = emptyBoard();
    for (let x = 0; x < TETRIS_W; x += 1) {
      board[0][x] = 1;
      board[1][x] = 1;
    }
    board[0][0] = 0;
    board[1][0] = 0;
    const final = hardDrop(game(piece(2, 0, 4, 0), board), () => 0);
    expect(final.over).toBe(true);
    expect(final.piece).toBeNull();
  });
});

describe('tetris scoring', () => {
  it('clears full rows and leaves holes alone', () => {
    const board = emptyBoard();
    board[19] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const one = clearLines(board);
    expect(one.cleared).toBe(1);
    expect(one.board[19].every((value) => value === 0)).toBe(true);
    board[16] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    board[17] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    board[18] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    board[19] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const four = clearLines(board);
    expect(four.cleared).toBe(4);
  });

  it('awards classic line points scaled by level', () => {
    expect(linePoints(1, 1)).toBe(100);
    expect(linePoints(2, 1)).toBe(300);
    expect(linePoints(3, 1)).toBe(500);
    expect(linePoints(4, 1)).toBe(800);
    expect(linePoints(4, 3)).toBe(2400);
    expect(linePoints(0, 1)).toBe(0);
    expect(linePoints(5, 1)).toBe(0);
    expect(linePoints(-1, 1)).toBe(0);
  });

  it('speeds up with level and never drops below the floor cap', () => {
    expect(dropIntervalMs(1)).toBe(800);
    expect(dropIntervalMs(2)).toBe(640);
    expect(dropIntervalMs(3)).toBe(512);
    expect(dropIntervalMs(1)).toBeGreaterThan(dropIntervalMs(2));
    expect(dropIntervalMs(20)).toBe(80);
  });
});

describe('tetris route', () => {
  it('adds the card on the play list without a new home card', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const list = readFileSync('src/pages/PlayListPage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("plainRoute('/play/tetris'");
    expect(home.match(/'\/play'/g)).toHaveLength(1);
    expect(home).not.toContain('/play/tetris');
    expect(list).toContain("'/play/tetris'");
    expect(script).toContain("'play/tetris'");
  });
});

function game(piece: ActivePiece | null, board: TetrisBoard = emptyBoard()): TetrisGame {
  return { board, piece, next: 1, queue: [], score: 0, lines: 0, level: 1, over: false };
}

function piece(id: PieceId, rotation: Rotation, x: number, y: number): ActivePiece {
  return { id, rotation, x, y };
}
