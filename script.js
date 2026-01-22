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

// --- Role Dice Logic ---
const roles = [
    { name: '교실쓸기', desc: '빗자루를 들고 교실 바닥을 깨끗이 쓸어주세요.' },
    { name: '교실환기하기', desc: '창문을 열어 신선한 공기가 들어오게 해주세요.' },
    { name: '쓰레기통 비우기', desc: '쓰레기통이 가득 찼다면 비워주세요.' },
    { name: '책상 줄 맞추기', desc: '친구들의 책상이 삐뚤어지지 않게 정리해주세요.' },
    { name: '칠판 닦기', desc: '수업이 끝나면 칠판을 깨끗하게 지워주세요.' }
];

let isRolling = false;

function rollDice() {
    if (isRolling) return;
    isRolling = true;

    const cube = document.querySelector('.cube');
    const resultDiv = document.getElementById('role-result');
    
    // Hide previous result
    resultDiv.classList.add('hidden');

    // Start spinning
    cube.classList.add('is-spinning');

    // Wait for spin (random time between 2-3 seconds for effect)
    setTimeout(() => {
        cube.classList.remove('is-spinning');
        
        // Random rotation to stop at
        // To make it look like it landed on a side, we'd need complex math or just snap to a side.
        // For simplicity, we'll just stop spinning and show the result overlay.
        
        pickRole();
        isRolling = false;
    }, 2000);
}

function pickRole() {
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    
    const nameEl = document.getElementById('role-name');
    const descEl = document.getElementById('role-desc');
    const resultDiv = document.getElementById('role-result');

    nameEl.textContent = randomRole.name;
    descEl.textContent = randomRole.desc;

    resultDiv.classList.remove('hidden');
}

function resetDice() {
    const resultDiv = document.getElementById('role-result');
    resultDiv.classList.add('hidden');
    isRolling = false;
}

init();

/* Roulette Logic */
let currentRotation = 0;

function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const resultDiv = document.getElementById('roulette-result');
    const winnerText = document.getElementById('roulette-winner');
    
    // Hide previous result
    resultDiv.classList.add('hidden');
    resultDiv.classList.remove('active');

    // Calculate random spin
    // Minimum 5 full spins (1800 deg) + random angle
    const randomDegree = Math.floor(Math.random() * 360);
    const extraSpins = 360 * 5; 
    const totalRotation = currentRotation + extraSpins + randomDegree;
    
    // Rotate
    wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
    currentRotation = totalRotation;

    // Determine winner after animation (5s)
    setTimeout(() => {
        // Calculate the actual angle in 0-360 range
        // We need to account for the pointer being at the top (0 degrees or 270/90 depending on init).
        // Our segments start at 0 (top-left if unskewed? No, let's trace).
        // Segment 1: 0deg. Top-left quadrant before skew... this geometry is tricky.
        
        // Easier: visual mapping.
        // The rotation is clockwise. The pointer is at TOP.
        // So the winning segment is the one that lands at the TOP.
        // Landing Angle = (360 - (totalRotation % 360)) % 360.
        
        const actualDeg = totalRotation % 360;
        // Pointer is at Top (0 deg relative to wheel if wheel wasn't rotated, but wheel rotates CW)
        // If wheel rotates 10 deg, 350 deg point is at top.
        // So index is determined by checking what range covers 360-actualDeg.
        
        const effectiveAngle = (360 - actualDeg) % 360;
        const segmentSize = 72; // 360 / 5
        
        // Items order in DOM: 1, 2, 3, 4, 5
        // DOM Rotations: 0, 72, 144, 216, 288
        // Segment 1 covers [0, 72)
        // Segment 2 covers [72, 144) ... etc.
        
        // BUT, our segments are skewed.
        // Segment 1 (Pink) starts at 0 deg (12 o'clock approx after transform adjustments).
        // Due to skew/rotation setup, center of Segment 1 is roughly at 36 deg?
        // Let's rely on standard calculation: Floor(angle / 72)
        
        // Adjust for potential offset due to skew logic:
        // SkewY(-18) means the visual block is squished. 
        // Start edge is at 0. End edge is at 72.
        
        const winningIndex = Math.floor(effectiveAngle / segmentSize);
        // winningIndex 0 -> Segment 1
        // winningIndex 1 -> Segment 2 ...
        
        const items = ['�մԸ�ſ���', '�̷� ��� �Ͼ', '���ɱ���', '������ �ڼ�', '������'];
        // Note: The segments are rendered in order 1..5.
        // Segment 1 starts at 0 deg.
        
        const winner = items[winningIndex];

        winnerText.textContent = winner;
        resultDiv.classList.remove('hidden');
        resultDiv.classList.add('active'); // Reuse active animation
        
    }, 5000);
}

function resetRoulette() {
    const resultDiv = document.getElementById('roulette-result');
    resultDiv.classList.add('hidden');
    spinRoulette();
}

