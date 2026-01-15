const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

const TETROMINOS = {
    'I': { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'type-I' },
    'J': { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'type-J' },
    'L': { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'type-L' },
    'O': { shape: [[1, 1], [1, 1]], color: 'type-O' },
    'S': { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'type-S' },
    'T': { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'type-T' },
    'Z': { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'type-Z' }
};

let grid = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
let score = 0;
let level = 1;
let currentPiece = null;
let nextPiece = null;
let gameLoop = null;
let isGameOver = false;
let isPaused = false;
let dropInterval = 1000;

const gameBoard = document.getElementById('game-board');
const nextPieceDisplay = document.getElementById('next-piece');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');

function init() {
    // Create initial empty grid
    renderGrid();
    startBtn.addEventListener('click', startGame);
    document.addEventListener('keydown', handleInput);
}

function startGame() {
    resetGame();
    spawnPiece();
    gameLoop = setInterval(update, dropInterval);
    startBtn.textContent = 'RESTART';
    startBtn.blur();
}

function resetGame() {
    grid = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null));
    score = 0;
    level = 1;
    isGameOver = false;
    isPaused = false;
    updateScore();
    clearInterval(gameLoop);
    gameBoard.innerHTML = '';
    renderGrid();
}

function spawnPiece() {
    if (nextPiece) {
        currentPiece = nextPiece;
    } else {
        currentPiece = createPiece();
    }
    nextPiece = createPiece();

    // Position at top center
    currentPiece.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPiece.y = 0;

    renderNextPiece();

    if (checkCollision(0, 0)) {
        isGameOver = true;
        clearInterval(gameLoop);
        alert('Game Over! Score: ' + score);
    }
}

function createPiece() {
    const keys = Object.keys(TETROMINOS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    // Deep copy the shape so we can rotate it without affecting the definition
    const shape = TETROMINOS[type].shape.map(row => [...row]);
    return {
        shape: shape,
        color: TETROMINOS[type].color,
        type: type,
        x: 0,
        y: 0
    };
}

function update() {
    if (isPaused || isGameOver) return;
    moveDown();
}

function moveDown() {
    if (!checkCollision(0, 1)) {
        currentPiece.y++;
        renderFrame();
    } else {
        lockPiece();
        clearLines();
        spawnPiece();
        renderFrame();
    }
}

function move(dir) {
    if (!checkCollision(dir, 0)) {
        currentPiece.x += dir;
        renderFrame();
    }
}

function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;

    // Basic wall kick (try sticking to bounds)
    if (checkCollision(0, 0)) {
        // Try shifting left
        if (!checkCollision(-1, 0)) {
            currentPiece.x -= 1;
        }
        // Try shifting right
        else if (!checkCollision(1, 0)) {
            currentPiece.x += 1;
        }
        // If still colliding, revert
        else {
            currentPiece.shape = previousShape;
        }
    }
    renderFrame();
}

function basicHardDrop() {
    while (!checkCollision(0, 1)) {
        currentPiece.y++;
    }
    lockPiece();
    clearLines();
    spawnPiece();
    renderFrame();
}

function checkCollision(offsetX, offsetY) {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;

                if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
                if (newY >= 0 && grid[newY][newX]) return true;
            }
        }
    }
    return false;
}

function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    grid[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== null)) {
            // Trigger Explosion
            for (let x = 0; x < BOARD_WIDTH; x++) {
                spawnExplosion(x, y, grid[y][x]);
            }

            grid.splice(y, 1);
            grid.unshift(Array(BOARD_WIDTH).fill(null));
            linesCleared++;
            y++; // Check same row again
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100 * level;
        // Simple level up every 500 points
        level = Math.floor(score / 500) + 1;
        dropInterval = Math.max(100, 1000 - (level * 50));
        clearInterval(gameLoop);
        gameLoop = setInterval(update, dropInterval);
        updateScore();
    }
}

function spawnExplosion(x, y, colorClass) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('explosion-particle', colorClass);

        // Position centering (relative to game board)
        const left = x * BLOCK_SIZE + BLOCK_SIZE / 2;
        const top = y * BLOCK_SIZE + BLOCK_SIZE / 2;
        particle.style.left = `${left}px`;
        particle.style.top = `${top}px`;

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 60; // Distance to travel
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        gameBoard.appendChild(particle);

        // Cleanup
        setTimeout(() => {
            particle.remove();
        }, 800);
    }
}

function updateScore() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
}

function handleInput(e) {
    if (isGameOver || !currentPiece) return;

    switch (e.keyCode) {
        case 37: // Left
            move(-1);
            break;
        case 39: // Right
            move(1);
            break;
        case 40: // Down
            moveDown();
            break;
        case 38: // Up
            rotate();
            break;
        case 32: // Space
            basicHardDrop();
            break;
    }
}

// Rendering
function renderGrid() {
    gameBoard.innerHTML = '';

    // Render static grid
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (grid[y][x]) {
                cell.classList.add('block', grid[y][x]);
            }
            gameBoard.appendChild(cell);
        }
    }
}

function renderFrame() {
    // Much more efficient to just re-render classes on existing divs
    // But for simplicity/robustness in vanilla JS, we can just clear/redraw
    // Optimization: Don't recreate divs, just update classes

    const cells = document.getElementsByClassName('cell');

    // Clear dynamic pieces from view (maintain static grid)
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const index = y * BOARD_WIDTH + x;
            const cell = cells[index];
            cell.className = 'cell'; // Reset
            if (grid[y][x]) {
                cell.classList.add('block', grid[y][x]);
            }
        }
    }

    // Draw Ghost Piece (Optional polish)
    // ...

    // Draw Current Piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    const boardY = currentPiece.y + y;
                    const boardX = currentPiece.x + x;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                        const index = boardY * BOARD_WIDTH + boardX;
                        const cell = cells[index];
                        cell.classList.add('block', currentPiece.color);
                    }
                }
            }
        }
    }
}

function renderNextPiece() {
    nextPieceDisplay.innerHTML = '';
    if (!nextPiece) return;

    // Center the piece in 4x4 grid
    const offsetX = Math.floor((4 - nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((4 - nextPiece.shape.length) / 2);

    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            // Check if this coordinate maps to a block in the shape
            const shapeY = y - offsetY;
            const shapeX = x - offsetX;

            if (shapeY >= 0 && shapeY < nextPiece.shape.length &&
                shapeX >= 0 && shapeX < nextPiece.shape[shapeY].length &&
                nextPiece.shape[shapeY][shapeX]) {
                cell.classList.add('block', nextPiece.color);
            }
            nextPieceDisplay.appendChild(cell);
        }
    }
}

// --- Tab Switching Logic ---
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');

        // Optional: Pause game if not on game tab
        if (targetId !== 'game') {
            isPaused = true;
        } else {
            if (!isGameOver && gameLoop) isPaused = false;
        }
    });
});

init();
