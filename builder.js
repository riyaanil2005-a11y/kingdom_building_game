// builder.js — gold persists only during session

const rows = 7;
const cols = 5;
const totalCells = rows * cols;

let gold = parseInt(sessionStorage.getItem("gold") || "0");
let goldDisplay = document.getElementById("goldDisplay");
let grid = document.getElementById("kingdomGrid");

// Load placed items safely
let placedItems = JSON.parse(sessionStorage.getItem("kingdomPlaced") || "[]").filter(item => {
  return Number.isInteger(item.gridX) && Number.isInteger(item.gridY)
    && item.gridX >= 0 && item.gridX < cols
    && item.gridY >= 0 && item.gridY < rows
    && typeof item.src === "string";
});

if (placedItems.length !== (JSON.parse(sessionStorage.getItem("kingdomPlaced") || "[]")).length) {
  sessionStorage.setItem("kingdomPlaced", JSON.stringify(placedItems));
}

let filledCells = placedItems.length;
let placedTypes = new Set(JSON.parse(sessionStorage.getItem("placedTypes") || "[]"));

// ✅ NEW: get rounds info saved from game.js
let rounds = parseInt(sessionStorage.getItem("rounds") || "0");
let optimalRounds = parseInt(sessionStorage.getItem("optimalRounds") || "0");

function updateGold() {
  goldDisplay.textContent = gold;
  sessionStorage.setItem("gold", gold);
}

function savePlaced() {
  sessionStorage.setItem("kingdomPlaced", JSON.stringify(placedItems));
  sessionStorage.setItem("placedTypes", JSON.stringify([...placedTypes]));
  sessionStorage.setItem("filledCells", filledCells);
}

// --- PROGRESS + CASTLE UNLOCK ---
function updateProgress() {
  const progress = Math.floor((filledCells / totalCells) * 100);
  let bar = document.getElementById("progressBar");
  let msg = document.getElementById("progressMsg");

  bar.style.width = progress + "%";
  bar.textContent = progress + "%";

  if (progress < 25) {
    msg.textContent = "Start building your kingdom!";
  } else if (progress < 50) {
    msg.textContent = "Your kingdom is growing!";
  } else if (progress < 75) {
    msg.textContent = "Halfway there!";
  } else if (progress < 100) {
    msg.textContent = "Almost complete!";
  } else {
    msg.textContent = "Your kingdom is fully built!";
    showAnalysis(); // ✅ trigger final popup
  }

  // ✅ Unlock castle when 50% of cells are filled
  if (progress >= 50) {
    let castleItem = document.getElementById("castleItem");
    if (castleItem && castleItem.classList.contains("locked")) {
      castleItem.classList.remove("locked");
      castleItem.setAttribute("draggable", "true");

      // 🔥 Add highlight animation
      castleItem.classList.add("highlight");
      setTimeout(() => {
        castleItem.classList.remove("highlight");
      }, 3000);
    }
  }
}

// --- BUILD GRID ---
function buildGrid() {
  grid.innerHTML = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cell = document.createElement("div");
      cell.classList.add("cell");

      // allow drop
      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", e => {
        e.preventDefault();

        let itemType = e.dataTransfer.getData("item");
        let itemCost = parseInt(e.dataTransfer.getData("cost"));
        let itemSrc  = e.dataTransfer.getData("src"); // ✅ real image path

        if (!itemType || !itemSrc || isNaN(itemCost)) return;

        if (gold < itemCost) {
          alert("Not enough gold!");
          return;
        }

        if (cell.classList.contains("placed")) {
          alert("Cell already occupied!");
          return;
        }

        // deduct gold
        gold -= itemCost;
        updateGold();

        // place item
        let img = document.createElement("img");
        img.src = itemSrc;   // ✅ use stored src, supports .png/.jpg/.webp
        img.alt = itemType;
        cell.appendChild(img);
        cell.classList.add("placed");

        placedItems.push({ gridX: c, gridY: r, type: itemType, src: itemSrc });
        placedTypes.add(itemType);
        filledCells++;
        savePlaced();
        updateProgress();
      });

      grid.appendChild(cell);
    }
  }

  // restore previous placed items
  placedItems.forEach(item => {
    let index = item.gridY * cols + item.gridX;
    let cell = grid.children[index];
    if (cell && !cell.classList.contains("placed")) {
      let img = document.createElement("img");
      img.src = item.src;   // ✅ restore exact saved src
      img.alt = item.type;
      cell.appendChild(img);
      cell.classList.add("placed");
    }
  });
}

// --- DRAG START LISTENERS FOR SHOP ITEMS ---
document.querySelectorAll(".item").forEach(el => {
  el.addEventListener("dragstart", e => {
    if (el.classList.contains("locked")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("item", el.dataset.item);
    e.dataTransfer.setData("cost", el.dataset.cost);

    // ✅ also pass the actual image src
    let imgEl = el.querySelector("img");
    if (imgEl) {
      e.dataTransfer.setData("src", imgEl.getAttribute("src"));
    }
  });
});

// --- RESET EVERYTHING (but keep gold for session) ---
function resetEverything() {
  sessionStorage.removeItem("kingdomPlaced");
  sessionStorage.removeItem("placedTypes");
  sessionStorage.removeItem("filledCells");

  placedItems = [];
  placedTypes = new Set();
  filledCells = 0;

  location.reload();
}

// --- NAVIGATE BACK ---
function goBack() {
  window.location.href = "index.html";
}

// ✅ NEW: show analysis popup at the end
function showAnalysis() {
  const efficiency = rounds > 0 ? ((optimalRounds / rounds) * 100).toFixed(2) : 0;

  let modal = document.createElement("div");
  modal.id = "analysisModal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🏰 Kingdom Fully Built!</h2>
      <p><strong>Total Rounds Played:</strong> ${rounds}</p>
      <p><strong>Optimal Rounds:</strong> ${optimalRounds}</p>
      <p><strong>Efficiency:</strong> ${efficiency}%</p>
      <button id="closeModal">OK</button>
    </div>
  `;
  document.body.appendChild(modal);

  // basic modal style
  Object.assign(modal.style, {
    position: "fixed",
    top: "0", left: "0",
    width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999"
  });

  let content = modal.querySelector(".modal-content");
  Object.assign(content.style, {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center",
    width: "300px",
    fontFamily: "Arial, sans-serif"
  });

  modal.querySelector("#closeModal").addEventListener("click", () => {
    modal.remove();

    // reset for next run
    rounds = 0;
    optimalRounds = 0;
    sessionStorage.setItem("rounds", 0);
    sessionStorage.setItem("optimalRounds", 0);
  });
}

// --- INIT ---
updateGold();
buildGrid();
updateProgress();
