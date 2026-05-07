// 推箱子游戏 - JavaScript 逻辑
const gameBoard = document.getElementById('game-board');
const levelDisplay = document.getElementById('level');
const movesDisplay = document.getElementById('moves');
const message = document.getElementById('message');
const prevBtn = document.getElementById('prev-level');
const nextBtn = document.getElementById('next-level');
const resetBtn = document.getElementById('reset-btn');

// 游戏地图数据（0=空地, 1=墙, 2=箱子, 3=目标点, 4=玩家, 5=箱子在目标点, 6=玩家在目标点）
const levels = [
  // 第1关
  [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 3, 0, 0, 1],
    [1, 0, 2, 4, 2, 0, 1],
    [1, 0, 0, 3, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ],
  // 第2关
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 0, 4, 2, 3, 0, 1],
    [1, 0, 1, 1, 0, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 第3关
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 3, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 2, 4, 2, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 第4关
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 2, 0, 1, 0, 2, 0, 1],
    [1, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  // 第5关
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 1, 4, 1, 2, 0, 1],
    [1, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 3, 0, 0, 0, 0, 3, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
];

let currentLevel = 0;
let moves = 0;
let map = [];
let playerPos = { x: 0, y: 0 };
let boxes = [];
let targets = [];

// 初始化游戏
function initGame() {
  map = JSON.parse(JSON.stringify(levels[currentLevel]));
  moves = 0;
  boxes = [];
  targets = [];
  
  // 解析地图，找到玩家、箱子、目标点位置
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 3 || map[y][x] === 5 || map[y][x] === 6) {
        targets.push({ x, y });
      }
      if (map[y][x] === 4 || map[y][x] === 6) {
        playerPos = { x, y };
      }
      if (map[y][x] === 2 || map[y][x] === 5) {
        boxes.push({ x, y });
      }
    }
  }
  
  updateDisplay();
  updateMoves();
  checkWin();
}

// 更新游戏显示
function updateDisplay() {
  gameBoard.innerHTML = '';
  gameBoard.style.gridTemplateRows = `repeat(${map.length}, 50px)`;
  gameBoard.style.gridTemplateColumns = `repeat(${map[0].length}, 50px)`;
  
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      
      switch (map[y][x]) {
        case 0: // 空地
          cell.classList.add('empty');
          break;
        case 1: // 墙
          cell.classList.add('wall');
          break;
        case 2: // 箱子
          cell.classList.add('box');
          break;
        case 3: // 目标点
          cell.classList.add('target');
          break;
        case 4: // 玩家
          cell.classList.add('player');
          break;
        case 5: // 箱子在目标点
          cell.classList.add('box-on-target');
          break;
        case 6: // 玩家在目标点
          cell.classList.add('player-on-target');
          break;
      }
      
      gameBoard.appendChild(cell);
    }
  }
}

// 更新步数显示
function updateMoves() {
  movesDisplay.textContent = moves;
}

// 检查是否胜利
function checkWin() {
  let allBoxesOnTarget = true;
  
  for (let box of boxes) {
    let onTarget = false;
    for (let target of targets) {
      if (box.x === target.x && box.y === target.y) {
        onTarget = true;
        break;
      }
    }
    if (!onTarget) {
      allBoxesOnTarget = false;
      break;
    }
  }
  
  if (allBoxesOnTarget) {
    message.textContent = '🎉 恭喜！你赢了！';
    message.style.display = 'block';
  } else {
    message.style.display = 'none';
  }
}

// 移动玩家
function movePlayer(dx, dy) {
  const newX = playerPos.x + dx;
  const newY = playerPos.y + dy;
  
  // 检查是否越界
  if (newX < 0 || newX >= map[0].length || newY < 0 || newY >= map.length) {
    return;
  }
  
  const nextCell = map[newY][newX];
  
  // 如果是墙，不能移动
  if (nextCell === 1) {
    return;
  }
  
  // 如果是箱子，检查箱子后面是否可以推动
  if (nextCell === 2 || nextCell === 5) {
    const boxNewX = newX + dx;
    const boxNewY = newY + dy;
    
    // 检查箱子新位置是否越界
    if (boxNewX < 0 || boxNewX >= map[0].length || boxNewY < 0 || boxNewY >= map.length) {
      return;
    }
    
    const boxNextCell = map[boxNewY][boxNewX];
    
    // 箱子后面是墙或另一个箱子，不能推动
    if (boxNextCell === 1 || boxNextCell === 2 || boxNextCell === 5) {
      return;
    }
    
    // 移动箱子
    if (boxNextCell === 3) {
      map[boxNewY][boxNewX] = 5; // 箱子在目标点
    } else {
      map[boxNewY][boxNewX] = 2; // 箱子在空地
    }
    
    // 更新箱子位置
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].x === newX && boxes[i].y === newY) {
        boxes[i] = { x: boxNewX, y: boxNewY };
        break;
      }
    }
  }
  
  // 移动玩家
  const currentCell = map[playerPos.y][playerPos.x];
  const newCell = map[newY][newX];
  
  // 恢复原来的位置
  if (currentCell === 4) {
    map[playerPos.y][playerPos.x] = 0; // 玩家在空地
  } else if (currentCell === 6) {
    map[playerPos.y][playerPos.x] = 3; // 玩家在目标点
  }
  
  // 更新新位置
  if (newCell === 0) {
    map[newY][newX] = 4; // 玩家在空地
  } else if (newCell === 3) {
    map[newY][newX] = 6; // 玩家在目标点
  } else if (newCell === 2) {
    map[newY][newX] = 4; // 玩家在箱子位置（箱子已移动）
  } else if (newCell === 5) {
    map[newY][newX] = 6; // 玩家在箱子+目标点位置
  }
  
  // 更新玩家位置
  playerPos = { x: newX, y: newY };
  
  // 增加步数
  moves++;
  updateMoves();
  
  // 更新显示
  updateDisplay();
  
  // 检查是否胜利
  checkWin();
}

// 键盘控制
document.addEventListener('keydown', (e) => {
  if (message.style.display === 'block') return;
  
  switch (e.key) {
    case 'ArrowUp':
      movePlayer(0, -1);
      break;
    case 'ArrowDown':
      movePlayer(0, 1);
      break;
    case 'ArrowLeft':
      movePlayer(-1, 0);
      break;
    case 'ArrowRight':
      movePlayer(1, 0);
      break;
    case 'r':
    case 'R':
      resetLevel();
      break;
  }
});

// 重置关卡
function resetLevel() {
  initGame();
}

// 切换关卡
function changeLevel(delta) {
  currentLevel += delta;
  
  if (currentLevel < 0) {
    currentLevel = levels.length - 1;
  } else if (currentLevel >= levels.length) {
    currentLevel = 0;
  }
  
  levelDisplay.textContent = currentLevel + 1;
  initGame();
}

// 按钮事件
prevBtn.addEventListener('click', () => changeLevel(-1));
nextBtn.addEventListener('click', () => changeLevel(1));
resetBtn.addEventListener('click', resetLevel);

// 初始化第一关
levelDisplay.textContent = currentLevel + 1;
initGame();
