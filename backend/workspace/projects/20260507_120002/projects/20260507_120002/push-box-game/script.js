// 游戏地图数据
const levels = [
  [
    "##########",
    "#        #",
    "# $ #  @ #",
    "#   #  # #",
    "#   #  # #",
    "#  #   # #",
    "#  #  # #",
    "#  #    #",
    "#   #### #",
    "##########"
  ],
  [
    "##########",
    "#        #",
    "# $ #  @ #",
    "#   #  # #",
    "#   #  # #",
    "#  #   # #",
    "#  #  # #",
    "#  #    #",
    "#   #### #",
    "##########"
  ]
];

let currentLevel = 0;
let playerPos = { x: 0, y: 0 };
let boxes = [];
let targets = [];
let steps = 0;
let gridSize = 40;

function initGame() {
  const levelData = levels[currentLevel];
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // 解析地图
  boxes = [];
  targets = [];
  
  for (let y = 0; y < levelData.length; y++) {
    const row = levelData[y];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      
      if (cell === '@') {
        playerPos = { x, y };
      } else if (cell === '$') {
        boxes.push({ x, y });
      } else if (cell === '.') {
        targets.push({ x, y });
      }
    }
  }
  
  steps = 0;
  document.getElementById('steps').textContent = steps;
  drawGame(ctx);
}

function drawGame(ctx) {
  const levelData = levels[currentLevel];
  
  // 清空画布
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // 绘制地图
  for (let y = 0; y < levelData.length; y++) {
    const row = levelData[y];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      
      // 绘制地面
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      
      // 绘制墙壁
      if (cell === '#') {
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
      
      // 绘制目标点
      if (cell === '.') {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          x * gridSize + gridSize / 2,
          y * gridSize + gridSize / 2,
          gridSize / 3,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }
  }
  
  // 绘制箱子
  boxes.forEach(box => {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(box.x * gridSize, box.y * gridSize, gridSize, gridSize);
    
    // 箱子边框
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x * gridSize, box.y * gridSize, gridSize, gridSize);
    
    // 箱子上的标记
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', box.x * gridSize + gridSize / 2, box.y * gridSize + gridSize / 2);
  });
  
  // 绘制玩家
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.arc(
    playerPos.x * gridSize + gridSize / 2,
    playerPos.y * gridSize + gridSize / 2,
    gridSize / 2.5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  // 玩家标记
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤', playerPos.x * gridSize + gridSize / 2, playerPos.y * gridSize + gridSize / 2);
}

function movePlayer(dx, dy) {
  const newX = playerPos.x + dx;
  const newY = playerPos.y + dy;
  
  // 检查是否撞墙
  const levelData = levels[currentLevel];
  if (levelData[newY] && levelData[newY][newX] === '#') {
    return;
  }
  
  // 检查是否推箱子
  const boxIndex = boxes.findIndex(b => b.x === newX && b.y === newY);
  if (boxIndex !== -1) {
    const boxNewX = newX + dx;
    const boxNewY = newY + dy;
    
    // 检查箱子前方是否有墙或其他箱子
    if (
      levelData[boxNewY] && 
      levelData[boxNewY][boxNewX] === '#' ||
      boxes.some(b => b.x === boxNewX && b.y === boxNewY)
    ) {
      return;
    }
    
    // 移动箱子
    boxes[boxIndex].x = boxNewX;
    boxes[boxIndex].y = boxNewY;
  }
  
  // 移动玩家
  playerPos.x = newX;
  playerPos.y = newY;
  steps++;
  document.getElementById('steps').textContent = steps;
  
  // 重绘游戏
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  drawGame(ctx);
  
  // 检查是否胜利
  checkWin();
}

function checkWin() {
  const allOnTarget = boxes.every(box => 
    targets.some(target => target.x === box.x && target.y === box.y)
  );
  
  if (allOnTarget) {
    setTimeout(() => {
      alert(`🎉 恭喜通关！\n用了 ${steps} 步`);
    }, 100);
  }
}

function resetLevel() {
  initGame();
}

function nextLevel() {
  if (currentLevel < levels.length - 1) {
    currentLevel++;
    initGame();
  } else {
    alert('已经是最后一关了！');
  }
}

function prevLevel() {
  if (currentLevel > 0) {
    currentLevel--;
    initGame();
  } else {
    alert('已经是第一关了！');
  }
}

// 键盘控制
document.addEventListener('keydown', (e) => {
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
  }
});

// 初始化游戏
window.onload = () => {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = levels[0][0].length * gridSize;
  canvas.height = levels[0].length * gridSize;
  initGame();
};
