// Procedural "Backrooms" maze generator.
// Cells form a grid; each cell tracks which of its 4 walls are open (carved).
// A perfect maze is carved with randomized DFS, then extra passages are
// knocked out to create loops and pooled "pillar rooms" -- the hallmark of
// the Backrooms' irregular, half-open floor plan.

export const N = 1, E = 2, S = 4, W = 8;
const OPPOSITE = { [N]: S, [E]: W, [S]: N, [W]: E };
const DX = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
const DY = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };

export const GRID_SIZE = 17;
export const CELL_SIZE = 4.2;
export const WALL_HEIGHT = 3.1;

function key(x, y) {
  return x + ',' + y;
}

export class Maze {
  constructor(size = GRID_SIZE, seed) {
    this.size = size;
    this.rand = mulberry32(seed ?? (Date.now() >>> 0));
    this.cells = new Array(size * size).fill(0); // bitmask of open walls
    this.carve();
    this.addLoops(0.16);
    this.pillarRooms = this.makePillarRooms(Math.max(4, Math.floor(size / 4)));
    this.classify();
  }

  idx(x, y) {
    return y * this.size + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  open(x, y, dir) {
    this.cells[this.idx(x, y)] |= dir;
    const nx = x + DX[dir], ny = y + DY[dir];
    if (this.inBounds(nx, ny)) this.cells[this.idx(nx, ny)] |= OPPOSITE[dir];
  }

  isOpen(x, y, dir) {
    if (!this.inBounds(x, y)) return false;
    return (this.cells[this.idx(x, y)] & dir) !== 0;
  }

  carve() {
    const visited = new Uint8Array(this.size * this.size);
    const stack = [[0, 0]];
    visited[0] = 1;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const dirs = shuffle([N, E, S, W], this.rand);
      let carved = false;
      for (const dir of dirs) {
        const nx = x + DX[dir], ny = y + DY[dir];
        if (!this.inBounds(nx, ny)) continue;
        if (visited[this.idx(nx, ny)]) continue;
        this.open(x, y, dir);
        visited[this.idx(nx, ny)] = 1;
        stack.push([nx, ny]);
        carved = true;
        break;
      }
      if (!carved) stack.pop();
    }
  }

  addLoops(probability) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        for (const dir of [E, S]) {
          const nx = x + DX[dir], ny = y + DY[dir];
          if (!this.inBounds(nx, ny)) continue;
          if (this.isOpen(x, y, dir)) continue;
          if (this.rand() < probability) this.open(x, y, dir);
        }
      }
    }
  }

  // Knock out the walls inside random 2x2 blocks to form open "pillar rooms"
  // reminiscent of Backrooms level 0's pooled, pillar-dotted halls.
  makePillarRooms(count) {
    const rooms = [];
    let attempts = 0;
    while (rooms.length < count && attempts < count * 40) {
      attempts++;
      const x = 1 + Math.floor(this.rand() * (this.size - 3));
      const y = 1 + Math.floor(this.rand() * (this.size - 3));
      this.open(x, y, E);
      this.open(x, y, S);
      this.open(x + 1, y, S);
      this.open(x, y + 1, E);
      rooms.push({ x, y });
    }
    return rooms;
  }

  degree(x, y) {
    const m = this.cells[this.idx(x, y)];
    return (m & N ? 1 : 0) + (m & E ? 1 : 0) + (m & S ? 1 : 0) + (m & W ? 1 : 0);
  }

  bfsDistances(sx, sy) {
    const dist = new Int32Array(this.size * this.size).fill(-1);
    dist[this.idx(sx, sy)] = 0;
    const queue = [[sx, sy]];
    let head = 0;
    while (head < queue.length) {
      const [x, y] = queue[head++];
      const d = dist[this.idx(x, y)];
      for (const dir of [N, E, S, W]) {
        if (!this.isOpen(x, y, dir)) continue;
        const nx = x + DX[dir], ny = y + DY[dir];
        if (dist[this.idx(nx, ny)] !== -1) continue;
        dist[this.idx(nx, ny)] = d + 1;
        queue.push([nx, ny]);
      }
    }
    return dist;
  }

  // Shortest path between two cells as an array of {x,y} waypoints (inclusive).
  path(sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [{ x: sx, y: sy }];
    const size = this.size;
    const prev = new Int32Array(size * size).fill(-2);
    prev[this.idx(sx, sy)] = -1;
    const queue = [[sx, sy]];
    let head = 0;
    let found = false;
    while (head < queue.length) {
      const [x, y] = queue[head++];
      if (x === tx && y === ty) { found = true; break; }
      for (const dir of [N, E, S, W]) {
        if (!this.isOpen(x, y, dir)) continue;
        const nx = x + DX[dir], ny = y + DY[dir];
        const i = this.idx(nx, ny);
        if (prev[i] !== -2) continue;
        prev[i] = this.idx(x, y);
        queue.push([nx, ny]);
      }
    }
    if (!found) return null;
    const out = [];
    let cur = this.idx(tx, ty);
    while (cur !== -1) {
      out.push({ x: cur % size, y: Math.floor(cur / size) });
      cur = prev[cur];
    }
    out.reverse();
    return out;
  }

  classify() {
    // Spawn near a corner-ish cell with low degree (a small, contained room).
    const spawn = { x: 1, y: 1 };
    const dist = this.bfsDistances(spawn.x, spawn.y);

    // Rank all cells by distance from spawn; exit is far away.
    const candidates = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const d = dist[this.idx(x, y)];
        if (d < 0) continue;
        candidates.push({ x, y, d, deg: this.degree(x, y) });
      }
    }
    candidates.sort((a, b) => b.d - a.d);

    const exit = candidates[0];

    // Pick terminal rooms: prefer dead ends / low-degree cells spread across
    // the map, far enough from spawn and from each other.
    const minSeparation = Math.floor(this.size / 3.2);
    const terminals = [];
    const used = new Set([key(spawn.x, spawn.y), key(exit.x, exit.y)]);
    const pool = candidates
      .filter((c) => c.deg <= 2 && c.d > 3)
      .sort((a, b) => this.rand() - 0.5);

    for (const c of pool) {
      if (terminals.length >= 7) break;
      if (used.has(key(c.x, c.y))) continue;
      const tooClose = terminals.some(
        (t) => Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < minSeparation
      );
      if (tooClose) continue;
      terminals.push({ x: c.x, y: c.y });
      used.add(key(c.x, c.y));
    }
    // Fallback fill if the maze was too loopy to find enough dead ends.
    for (const c of candidates) {
      if (terminals.length >= 6) break;
      if (used.has(key(c.x, c.y))) continue;
      if (c.d < 3) continue;
      terminals.push({ x: c.x, y: c.y });
      used.add(key(c.x, c.y));
    }

    this.spawn = spawn;
    this.exit = { x: exit.x, y: exit.y };
    this.terminals = terminals;
  }

  // World-space center of a cell.
  worldOf(cx, cy) {
    const half = (this.size * CELL_SIZE) / 2;
    return {
      x: cx * CELL_SIZE - half + CELL_SIZE / 2,
      z: cy * CELL_SIZE - half + CELL_SIZE / 2,
    };
  }

  cellOfWorld(x, z) {
    const half = (this.size * CELL_SIZE) / 2;
    return {
      x: Math.floor((x + half) / CELL_SIZE),
      y: Math.floor((z + half) / CELL_SIZE),
    };
  }
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic-ish PRNG so a seed can reproduce a layout if ever needed.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
