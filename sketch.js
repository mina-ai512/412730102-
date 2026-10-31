// ==========================================
// 全局變數定義 (Global Variables)
// ==========================================

// 關卡資料集 (包含賓士、特斯拉、寶馬 3 關)
let questionsData = [
  {
    brand: "賓士 (Mercedes-Benz)",
    imgUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop" // 賓士寫實照片
  },
  {
    brand: "特斯拉 (Tesla)",
    imgUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop" // 特斯拉寫實照片
  },
  {
    brand: "寶馬 (BMW)",
    imgUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop" // 寶馬寫實照片
  }
];

let currentLevel = 0;           // 當前關卡索引 (0, 1, 2)
let currentImg = null;          // 當前載入的汽車圖片物件
let pieces = [];                // 存放 9 塊拼圖物件的陣列
let boardCells = [];            // 左側目標拼圖格子的座標資訊

// 遊戲狀態控制
let gameState = "PLAYING";      // "PLAYING", "LEVEL_CLEAR", "GAME_OVER"
let startTime = 0;              // 遊戲開始時間戳
let totalElapsedTime = 0;       // 完成三關總共耗時 (秒)
let fireworks = [];             // 煙火粒子陣列

// 拖曳狀態管理
let draggedPiece = null;        // 當前正在被拖曳的拼圖物件
let offsetX = 0;                // 拖曳時滑鼠與拼圖左上角的 X 軸偏移
let offsetY = 0;                // 拖曳時滑鼠與拼圖左上角的 Y 軸偏移

// 拼圖形狀邊緣卡扣類型定義 (0: 平邊, 1: 凸出, -1: 凹陷)
let boardEdges = {
  v: [
    [1, -1],   // 第一列的 2 條垂直內部邊
    [-1, 1],   // 第二列的 2 條垂直內部邊
    [1, -1]    // 第三列的 2 條垂直內部邊
  ],
  h: [
    [1, -1, 1],  // 第一橫排與第二橫排之間的 3 條水平內部邊
    [-1, 1, -1]  // 第二橫排與第三橫排之間的 3 條水平內部邊
  ]
};

// ==========================================
// p5.js 預載與初始化函數 (Preload & Setup)
// ==========================================

function preload() {
  loadLevelImage(currentLevel); // 呼叫載入圖片函式
}

function loadLevelImage(levelIndex) {
  currentImg = loadImage(questionsData[levelIndex].imgUrl, () => {
    initPuzzleBoard(); // 圖片載入完成後初始化拼圖板
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight); // 創建響應式全螢幕畫布
  startTime = millis();                    // 紀錄遊戲開始毫秒數
  initPuzzleBoard();                       // 初始化拼圖板與拼圖碎片
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // 重置畫布大小為當前視窗尺寸
  initPuzzleBoard();                       // 重新初始化拼圖板
}

// ==========================================
// 拼圖板與拼圖碎片初始化邏輯
// ==========================================

function initPuzzleBoard() {
  boardCells = []; // 清空目標格子陣列
  pieces = [];     // 清空拼圖碎片陣列
  
  let halfWidth = width / 2; // 畫布一半寬度
  
  let maxW = halfWidth * 0.75; // 左側區域 75% 寬度
  let maxH = height * 0.65;    // 螢幕高度 65% 高度
  
  let boardW = maxW; 
  let boardH = boardW * (2 / 3); 
  
  if (boardH > maxH) { 
    boardH = maxH; 
    boardW = boardH * (1.5); 
  }
  
  let boardStartX = (halfWidth - boardW) / 2; 
  let boardStartY = (height - boardH) / 2 + 40; 
  
  let cellW = boardW / 3; 
  let cellH = boardH / 3; 
  
  let index = 0; 
  for (let r = 0; r < 3; r++) { 
    for (let c = 0; c < 3; c++) { 
      let targetX = boardStartX + c * cellW; 
      let targetY = boardStartY + r * cellH; 
      
      boardCells.push({ 
        x: targetX, 
        y: targetY, 
        w: cellW,   
        h: cellH    
      });
      
      let rightStartX = halfWidth + 40; 
      let rightEndX = width - cellW - 40; 
      let rightStartY = boardStartY; 
      let rightEndY = boardStartY + boardH - cellH; 
      
      let randomX = random(rightStartX, max(rightStartX, rightEndX)); 
      let randomY = random(rightStartY, max(rightStartY, rightEndY)); 
      
      let topEdge = (r === 0) ? 0 : -boardEdges.h[r - 1][c]; 
      let rightEdge = (c === 2) ? 0 : boardEdges.v[r][c];    
      let bottomEdge = (r === 2) ? 0 : boardEdges.h[r][c];   
      let leftEdge = (c === 0) ? 0 : -boardEdges.v[r][c - 1]; 
      
      pieces.push({ 
        id: index,               
        row: r,                  
        col: c,                  
        x: randomX,              
        y: randomY,              
        targetX: targetX,        
        targetY: targetY,        
        w: cellW,                
        h: cellH,                
        isUnlocked: true,        
        isSnapped: false,        
        edges: [topEdge, rightEdge, bottomEdge, leftEdge] 
      });
      
      index++; 
    }
  }
}

// ==========================================
// p5.js 繪圖主迴圈 (draw)
// ==========================================

function draw() {
  background(15, 23, 42); // 繪製科技感深色背景
  
  if (gameState === "PLAYING" || gameState === "LEVEL_CLEAR") { 
    drawHeaderUI();       // 繪製頂部標題與進度
    drawLeftBoard();      // 繪製左側半透明底圖與目標框架
    drawRightArea();      // 繪製右側拼圖區域
    
    if (gameState === "LEVEL_CLEAR") { 
      drawLevelClearBanner(); // 繪製關卡成功橫幅
    }
  } else if (gameState === "GAME_OVER") { 
    drawGameOverScreen(); // 繪製最終結算與煙火畫面
  }
}

// ==========================================
// 介面與圖形繪製函數 (UI & Rendering)
// ==========================================

function drawHeaderUI() {
  fill(255); 
  textAlign(CENTER, TOP); 
  
  textSize(26); 
  textStyle(BOLD); 
  text("台灣常見汽車品牌拼圖教學測驗", width / 2, 15); 
  
  textSize(16); 
  textStyle(NORMAL); 
  fill(148, 163, 184); 
  let levelText = `第 ${currentLevel + 1} / 3 關：${questionsData[currentLevel].brand}`; 
  text(levelText, width / 2, 48); 
}

function drawLeftBoard() {
  if (boardCells.length === 0) return; 
  
  let boardX = boardCells[0].x; 
  let boardY = boardCells[0].y; 
  let boardW = boardCells[2].w * 3; 
  let boardH = boardCells[8].h * 3; 
  
  // 繪製半透明原圖底板 (已移除上方文字說明)
  if (currentImg) { 
    tint(255, 80); 
    image(currentImg, boardX, boardY, boardW, boardH); 
    noTint(); 
  }
  
  // 繪製 3x3 九宮格目標外框
  stroke(255, 255, 255, 100); 
  strokeWeight(2); 
  noFill(); 
  rect(boardX, boardY, boardW, boardH, 8); 
  
  stroke(255, 255, 255, 40); 
  strokeWeight(1); 
  for (let r = 0; r < 3; r++) { 
    for (let c = 0; c < 3; c++) { 
      let cell = boardCells[r * 3 + c]; 
      rect(cell.x, cell.y, cell.w, cell.h); 
    }
  }
  
  // 繪製已經成功吸附置中的拼圖
  for (let p of pieces) { 
    if (p.isSnapped) { 
      drawPuzzlePiece(p); 
    }
  }
}

function drawRightArea() {
  let halfWidth = width / 2; 
  let boardY = boardCells[0] ? boardCells[0].y : 100; 
  
  fill(203, 213, 225); 
  textSize(16); 
  textAlign(CENTER, BOTTOM); 
  text("【拖曳拼圖區】", halfWidth + (width - halfWidth) / 2, boardY - 10); 
  
  // 繪製所有未吸附的拼圖塊
  for (let p of pieces) { 
    if (!p.isSnapped) { 
      drawPuzzlePiece(p); 
    }
  }
}

function drawPuzzlePiece(p) {
  push(); 
  translate(p.x, p.y); 
  
  beginShape(); 
  
  let w = p.w; 
  let h = p.h; 
  let tabSize = min(w, h) * 0.2; 
  
  // 1. 上邊緣
  vertex(0, 0); 
  if (p.edges[0] !== 0) { 
    let dir = p.edges[0]; 
    bezierVertex(w*0.35, 0, w*0.35, dir*tabSize, w*0.5, dir*tabSize); 
    bezierVertex(w*0.65, dir*tabSize, w*0.65, 0, w, 0); 
  } else {
    vertex(w, 0); 
  }
  
  // 2. 右邊緣
  if (p.edges[1] !== 0) { 
    let dir = p.edges[1]; 
    bezierVertex(w, h*0.35, w + dir*tabSize, h*0.35, w + dir*tabSize, h*0.5); 
    bezierVertex(w + dir*tabSize, h*0.65, w, h*0.65, w, h); 
  } else {
    vertex(w, h); 
  }
  
  // 3. 下邊緣
  if (p.edges[2] !== 0) { 
    let dir = p.edges[2]; 
    bezierVertex(w*0.65, h, w*0.65, h + dir*tabSize, w*0.5, h + dir*tabSize); 
    bezierVertex(w*0.35, h + dir*tabSize, w*0.35, h, 0, h); 
  } else {
    vertex(0, h); 
  }
  
  // 4. 左邊緣
  if (p.edges[3] !== 0) { 
    let dir = p.edges[3]; 
    bezierVertex(0, h*0.65, dir*tabSize, h*0.65, dir*tabSize, h*0.5); 
    bezierVertex(dir*tabSize, h*0.35, 0, h*0.35, 0, 0); 
  } else {
    vertex(0, 0); 
  }
  
  endShape(CLOSE); 
  
  if (currentImg) { 
    let sx = (p.col / 3) * currentImg.width; 
    let sy = (p.row / 3) * currentImg.height; 
    let sw = currentImg.width / 3; 
    let sh = currentImg.height / 3; 
    
    image(currentImg, 0, 0, p.w, p.h, sx, sy, sw, sh); 
  }
  
  stroke(255, 255, 255, 180); 
  strokeWeight(2); 
  noFill(); 
  
  beginShape(); 
  vertex(0, 0); 
  vertex(w, 0); 
  vertex(w, h); 
  vertex(0, h); 
  endShape(CLOSE); 
  
  pop(); 
}

function drawLevelClearBanner() {
  fill(16, 185, 129, 230); 
  rect(0, height / 2 - 50, width, 100); 
  
  fill(255); 
  textAlign(CENTER, CENTER); 
  textSize(28); 
  textStyle(BOLD); 
  text(`🎉 恭喜完成【${questionsData[currentLevel].brand}】拼圖！`, width / 2, height / 2 - 10); 
  
  textSize(16); 
  textStyle(NORMAL); 
  text("點擊畫布任意處進入下一關...", width / 2, height / 2 + 25); 
}

// ==========================================
// 最終結算與煙火特效 (Game Over & Fireworks)
// ==========================================

function drawGameOverScreen() {
  if (random(1) < 0.08) { 
    fireworks.push(new Firework()); 
  }
  
  for (let i = fireworks.length - 1; i >= 0; i--) { 
    fireworks[i].update(); 
    fireworks[i].show();   
    if (fireworks[i].done()) { 
      fireworks.splice(i, 1); 
    }
  }
  
  let cardW = min(560, width * 0.9); 
  let cardH = 460; 
  let cardX = (width - cardW) / 2; 
  let cardY = (height - cardH) / 2; 
  
  fill(30, 41, 59, 230); 
  stroke(234, 179, 8); 
  strokeWeight(3); 
  rect(cardX, cardY, cardW, cardH, 20); 
  
  fill(250, 204, 21); 
  textAlign(CENTER, TOP); 
  textSize(30); 
  textStyle(BOLD); 
  text("🏆 恭喜完成全部三關拼圖挑戰！", width / 2, cardY + 30); 
  
  fill(241, 245, 249); 
  textSize(18); 
  textStyle(NORMAL); 
  text(`總共花費時間：${totalElapsedTime} 秒`, width / 2, cardY + 80); 
  
  let gridStartY = cardY + 130; 
  let gridCellW = 120; 
  let gridCellH = 80;  
  let gap = 15;        
  let totalGridW = 3 * gridCellW + 2 * gap; 
  let startX = (width - totalGridW) / 2; 
  
  for (let i = 0; i < 3; i++) { 
    let gx = startX + i * (gridCellW + gap); 
    
    fill(51, 65, 85); 
    stroke(71, 85, 105); 
    strokeWeight(1); 
    rect(gx, gridStartY, gridCellW, gridCellH, 10); 
    
    fill(255); 
    textSize(14); 
    textStyle(BOLD); 
    text(`第 ${i + 1} 關`, gx + gridCellW / 2, gridStartY + 15); 
    
    textSize(12); 
    textStyle(NORMAL); 
    fill(148, 163, 184); 
    text(questionsData[i].brand.split(" ")[0], gx + gridCellW / 2, gridStartY + 38); 
    
    fill(52, 211, 153); 
    text("通關完成 ✔", gx + gridCellW / 2, gridStartY + 58); 
  }
  
  fill(148, 163, 184); 
  textSize(15); 
  text("按下 [ F5 ] 或重新整理網頁即可重新挑戰！", width / 2, cardY + cardH - 40); 
}

// ==========================================
// 使用者互動控制 (Mouse Events)
// ==========================================

function mousePressed() {
  if (gameState === "LEVEL_CLEAR") { 
    currentLevel++; 
    if (currentLevel < questionsData.length) { 
      gameState = "PLAYING"; 
      loadLevelImage(currentLevel); 
    } else { 
      gameState = "GAME_OVER"; 
      totalElapsedTime = floor((millis() - startTime) / 1000); 
    }
    return; 
  }
  
  if (gameState === "PLAYING") { 
    for (let i = pieces.length - 1; i >= 0; i--) { 
      let p = pieces[i]; 
      
      if (p.isSnapped) continue; 
      
      if (mouseX > p.x && mouseX < p.x + p.w &&
          mouseY > p.y && mouseY < p.y + p.h) { 
          
        draggedPiece = p; 
        offsetX = mouseX - p.x; 
        offsetY = mouseY - p.y; 
        
        pieces.splice(i, 1); 
        pieces.push(p);      
        break; 
      }
    }
  }
}

function mouseDragged() {
  if (draggedPiece) { 
    draggedPiece.x = mouseX - offsetX; 
    draggedPiece.y = mouseY - offsetY; 
  }
}

function mouseReleased() {
  if (draggedPiece) { 
    let distanceThreshold = 40; 
    let d = dist(draggedPiece.x, draggedPiece.y, draggedPiece.targetX, draggedPiece.targetY); 
    
    if (d < distanceThreshold) { 
      draggedPiece.x = draggedPiece.targetX; 
      draggedPiece.y = draggedPiece.targetY; 
      draggedPiece.isSnapped = true;         
    } else {
      draggedPiece.isSnapped = false; 
    }
    
    draggedPiece = null; 
    checkLevelCompletion(); 
  }
}

function checkLevelCompletion() {
  let allSnapped = pieces.every(p => p.isSnapped); 
  if (allSnapped) { 
    gameState = "LEVEL_CLEAR"; 
  }
}

// ==========================================
// 煙火特效粒子系統 (Firework Particle System)
// ==========================================

class Firework {
  constructor() {
    this.x = random(width * 0.1, width * 0.9); 
    this.firework = new Particle(this.x, height, true); 
    this.exploded = false; 
    this.particles = [];   
  }
  
  update() {
    if (!this.exploded) { 
      this.firework.applyForce(createVector(0, 0.2)); 
      this.firework.update(); 
      
      if (this.firework.vel.y >= 0) { 
        this.exploded = true; 
        this.explode();       
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) { 
      this.particles[i].applyForce(createVector(0, 0.15)); 
      this.particles[i].update(); 
      if (this.particles[i].done()) { 
        this.particles.splice(i, 1); 
      }
    }
  }
  
  explode() {
    let particleCount = 60; 
    let hu = random(255);   
    for (let i = 0; i < particleCount; i++) { 
      let p = new Particle(this.firework.pos.x, this.firework.pos.y, false, hu); 
      this.particles.push(p); 
    }
  }
  
  done() {
    return this.exploded && this.particles.length === 0; 
  }
  
  show() {
    if (!this.exploded) { 
      this.firework.show(); 
    }
    for (let p of this.particles) { 
      p.show(); 
    }
  }
}

class Particle {
  constructor(x, y, isSeed, hueVal) {
    this.pos = createVector(x, y); 
    this.isSeed = isSeed;          
    this.lifespan = 255;           
    
    if (this.isSeed) { 
      this.vel = createVector(0, random(-14, -18)); 
    } else { 
      this.vel = p5.Vector.random2D(); 
      this.vel.mult(random(2, 10));    
    }
    this.acc = createVector(0, 0); 
    this.color = hueVal || random(255); 
  }
  
  applyForce(force) {
    this.acc.add(force); 
  }
  
  update() {
    if (!this.isSeed) { 
      this.vel.mult(0.92); 
      this.lifespan -= 4;  
    }
    this.vel.add(this.acc); 
    this.pos.add(this.vel); 
    this.acc.mult(0);       
  }
  
  done() {
    return this.lifespan < 0; 
  }
  
  show() {
    colorMode(HSB, 255); 
    if (this.isSeed) { 
      strokeWeight(6); 
      stroke(this.color, 255, 255); 
    } else { 
      strokeWeight(4); 
      stroke(this.color, 255, 255, this.lifespan); 
    }
    point(this.pos.x, this.pos.y); 
    colorMode(RGB, 255); 
  }
}