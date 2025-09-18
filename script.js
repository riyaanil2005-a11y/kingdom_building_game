// script.js — minesweeper with gold carryover + bombs halve gold + reset per session
const rows = 10;
const cols = 10;
const mineCount = 15;

let grid = [];
let gameBoard = null;
let gameOver = false;
let start = { x: 0, y: 0 };
let target = { x: rows - 1, y: cols - 1 };

let moves = 0;
let flags = 0;

// Gold & rounds (reset fresh each browser session, persist between game and builder)
let totalGold = parseInt(sessionStorage.getItem("gold") || "0");
let rounds = parseInt(sessionStorage.getItem("rounds") || "0");

function updateStats() {
  document.getElementById("goldCount").textContent = totalGold;
  document.getElementById("movesCount").textContent = moves;
  document.getElementById("flagsCount").textContent = flags;
  document.getElementById("roundsCount").textContent = rounds;
}

function createCell(x, y) {
  return { x, y, mine: false, revealed: false, flagged: false, number: 0, div: null };
}

function initBoard() {
  gameBoard = document.getElementById("gameBoard");
  grid = [];
  gameBoard.innerHTML = "";
  gameBoard.style.display = "grid";
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 40px)`;

  moves = 0;
  flags = 0;
  gameOver = false;

  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      let cell = createCell(i, j);
      let div = document.createElement("div");
      div.classList.add("cell");
      div.addEventListener("click", () => { revealCell(cell); moves++; updateStats(); });
      div.addEventListener("contextmenu", e => { e.preventDefault(); toggleFlag(cell); updateStats(); });
      cell.div = div;
      grid[i][j] = cell;
      gameBoard.appendChild(div);
    }
  }

  // place mines
  let placed = 0;
  while (placed < mineCount) {
    let i = Math.floor(Math.random() * rows);
    let j = Math.floor(Math.random() * cols);
    if (!grid[i][j].mine && !(i === start.x && j === start.y)) {
      grid[i][j].mine = true;
      placed++;
    }
  }

  // numbers
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!grid[i][j].mine) {
        grid[i][j].number = countMines(i, j);
      }
    }
  }

  grid[start.x][start.y].div.textContent = "🤴";
  placeTreasure();
  updateStats();
}

function countMines(x, y) {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
        if (grid[nx][ny].mine) count++;
      }
    }
  }
  return count;
}

function revealCell(cell) {
  if (gameOver || cell.revealed || cell.flagged) return;

  cell.revealed = true;
  cell.div.classList.add("revealed");

  if (cell.mine) {
    cell.div.textContent = "💥";
    handleBombPenalty();
    endGame(false);
    return;
  }

  // Treasure clicked
  if (cell.x === target.x && cell.y === target.y) {
    if (isPathRevealed()) {
      cell.div.textContent = "💰";
      winGame();
    } else {
      alert("🚫 Reveal a full path to the treasure first!");
      cell.revealed = false;
      cell.div.classList.remove("revealed");
    }
    return;
  }

  if (cell.number > 0) {
    cell.div.textContent = cell.number;
    cell.div.classList.add(`num${cell.number}`);
  } else {
    cell.div.classList.add("safe-zone");
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let nx = cell.x + dx, ny = cell.y + dy;
        if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
          revealCell(grid[nx][ny]);
        }
      }
    }
  }
}

function toggleFlag(cell) {
  if (gameOver || cell.revealed) return;
  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  cell.div.textContent = cell.flagged ? "🚩" : "";
}

function handleBombPenalty() {
  totalGold = Math.floor(totalGold / 2);
  sessionStorage.setItem("gold", totalGold);
  updateStats();
  alert("💥 Boom! Your gold is halved.");
}

function endGame() {
  gameOver = true;
  document.getElementById("statusBar").textContent = "💥 You hit a trap! Game Over.";

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j].mine) {
        grid[i][j].div.textContent = "💣";
        grid[i][j].div.classList.add("bomb-reveal");
      }
    }
  }
}

function winGame() {
  gameOver = true;
  rounds++;
  sessionStorage.setItem("rounds", rounds);

  let earnedGold = 50 + Math.floor(Math.random() * 50);
  let shortest = getShortestPathLength();
  if (moves === shortest) {
    earnedGold += 50;
    alert("✨ Bonus! Shortest path achieved!");
  }

  totalGold += earnedGold;
  sessionStorage.setItem("gold", totalGold);

  document.getElementById("statusBar").textContent = `🎉 Treasure found! You earned ${earnedGold} gold.`;
  updateStats();

  setTimeout(() => window.location.href = "builder.html", 1200);
}

function resetGame() {
  initBoard();
  document.getElementById("statusBar").textContent = "New adventure begins!";
}

function placeTreasure() {
  let i, j;
  do {
    i = Math.floor(Math.random() * rows);
    j = Math.floor(Math.random() * cols);
  } while (grid[i][j].mine || (i === start.x && j === start.y));

  target = { x: i, y: j };
  grid[i][j].div.textContent = "💰";
  grid[i][j].div.classList.add("treasure");
}

// ✅ New: shuffle treasure button handler
function shuffleTreasure() {
  if (gameOver) return;

  // Remove old treasure
  for (let row of grid) {
    for (let cell of row) {
      if (cell.div.classList.contains("treasure")) {
        cell.div.classList.remove("treasure");
        if (!cell.revealed && !cell.flagged) {
          cell.div.textContent = "";
        }
      }
    }
  }

  // Place new treasure
  placeTreasure();

  document.getElementById("statusBar").textContent = "🔀 Treasure reshuffled!";
}

function isPathRevealed() {
  let visited = new Set();
  let queue = [start];

  while (queue.length > 0) {
    let { x, y } = queue.shift();
    if (x === target.x && y === target.y) return true;
    let key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    for (let neighbor of getNeighbors({ x, y })) {
      let cell = grid[neighbor.x][neighbor.y];
      if (cell.revealed || (neighbor.x === target.x && neighbor.y === target.y)) {
        queue.push(neighbor);
      }
    }
  }
  return false;
}

function getNeighbors(node) {
  let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  let neighbors = [];
  for (let [dx, dy] of dirs) {
    let nx = node.x + dx, ny = node.y + dy;
    if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

function getShortestPathLength() {
  let path = getShortestPath();
  return path.length - 1; // steps, not nodes
}

function getShortestPath() {
  let dist = {};
  let prev = {};
  let pq = [];

  function push(node, d) {
    pq.push({ node, d });
    pq.sort((a, b) => a.d - b.d);
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dist[`${i},${j}`] = Infinity;
    }
  }
  dist[`${start.x},${start.y}`] = 0;
  push(start, 0);

  while (pq.length > 0) {
    let { node } = pq.shift();
    if (node.x === target.x && node.y === target.y) {
      let path = [];
      let key = `${target.x},${target.y}`;
      while (key) {
        let [x, y] = key.split(",").map(Number);
        path.unshift({ x, y });
        key = prev[key];
      }
      return path;
    }

    for (let v of getNeighbors(node)) {
      if (!grid[v.x][v.y].mine) {
        let alt = dist[`${node.x},${node.y}`] + 1;
        if (alt < dist[`${v.x},${v.y}`]) {
          dist[`${v.x},${v.y}`] = alt;
          prev[`${v.x},${v.y}`] = `${node.x},${node.y}`;
          push(v, alt);
        }
      }
    }
  }
  return [];
}

function highlightSafePath() {
  let path = getShortestPath();
  if (path.length === 0) {
    alert("⚠️ No safe path to the treasure!");
    return;
  }

  for (let step of path) {
    let cell = grid[step.x][step.y];
    if (!cell.mine && !(step.x === start.x && step.y === start.y) && !(step.x === target.x && step.y === target.y)) {
      cell.div.classList.add("safe-path");
    }
  }
}

// ✅ Ensure grid builds after DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  initBoard();
});
