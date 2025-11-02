
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');
const input = document.getElementById('labelInput');

// 状态
let drawing = false;
let currentPoints = [];
let shapes = []; // 存储所有已闭合的 shape
const CLOSE_THRESHOLD = 100;

// 样式
const strokeStyle = '#34C759';
const fillStyle = '#8ED596';
const lineWidth = 2;

let text = input.value;
let showLabelPoint = false;



input.addEventListener('input', (e) => {
    text = e.target.value;
    redraw(text); 
});

drawShape();



resetBtn.addEventListener("click", () => {
    window.location.reload();
});



function drawShape() {
  
    // 不需要高DPI适配，直接设置canvas尺寸
    canvas.width = 720;   // 实际绘图宽度
    canvas.height = 480;  // 实际绘图高度

    // 控制显示大小（响应屏幕宽度，同时不超过720px）
    canvas.style.width = '100%';     // 占满父容器宽度
    canvas.style.maxWidth = '720px'; // 最大宽度限制
    canvas.style.height = 'auto';    // 高度自动按比例
  
    // 工具函数
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  
    const clearCanvas = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    function drawShape(points) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.fill();
      ctx.stroke();
    }
  
    function redraw() {
        clearCanvas();

        // 1. 绘制已保存的 shapes
        for (const shape of shapes) {
          drawShape(shape.points);
          if (shape.labelPoint) {
            drawLabelPoint(shape.labelPoint); // ✅ 移到循环内部
            drawLabelText(shape.labelPoint);
          }
        }
      
        // 2. 绘制当前正在画的 shape 轮廓
        if (drawing && currentPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
          }
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
      
          // 绘制起点
          const start = currentPoints[0];
          ctx.beginPath();
          ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = strokeStyle;
          ctx.fill();
        }
    }
  
    // 坐标转换
    const getCanvasPoint = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };
  
    // 绘制事件
    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      currentPoints = [];
      const p = getCanvasPoint(e.clientX, e.clientY);
      currentPoints.push(p);
      canvas.setPointerCapture(e.pointerId);
      redraw();
    });
  
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = getCanvasPoint(e.clientX, e.clientY);
      const last = currentPoints[currentPoints.length - 1];
      if (!last || distance(last, p) > 2) currentPoints.push(p);
      redraw();
    });
  
    canvas.addEventListener('pointerup', (e) => {
      if (!drawing) return;
      drawing = false;
      canvas.releasePointerCapture(e.pointerId);
  
      if (currentPoints.length >= 3) {
        const first = currentPoints[0];
        const last = currentPoints[currentPoints.length - 1];
        if (distance(first, last) <= CLOSE_THRESHOLD) {
        // 闭合 shape
        currentPoints[currentPoints.length - 1] = { x: first.x, y: first.y };

        // 创建 shape 并保存
        const shape = { points: currentPoints.slice(0, -1) };

        // 🧠 计算 label 圆心点
        shape.labelPoint = computeLabelPoint(shape.points);

        // 存入 shapes
        shapes.push(shape);

        // 🎯 在画布上画出该 label 点
        drawLabelPoint(shape.labelPoint);
            
        // 🎯 在 label 点写text
        drawLabelText(shape.labelPoint);
        }
      }
  
      currentPoints = [];
      redraw();
    });
  
    canvas.addEventListener('pointercancel', (e) => {
      drawing = false;
      canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId);
    });
  
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  
    // Reset
    resetBtn.addEventListener('click', () => {
      shapes = [];
      currentPoints = [];
      redraw();
    });
  
    redraw();
  
    


    
  

    //////////////////////////
    ///// 左右挪动 按Y指】值数排列


    function computeLabelPoint(points) {
        if (!points || points.length === 0) return null;
    
        // 1️⃣ 计算边界矩形中心
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
    
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
    
        let labelPoint = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2
        };
    
        // 2️⃣ 射线法判断点是否在多边形内部，并获取所有交点
        const intersections = [];
        const x0 = labelPoint.x;
    
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
    
            // 只考虑与水平射线相交
            if ((a.x - x0) * (b.x - x0) <= 0 && a.x !== b.x) {
                // 计算交点的 Y 坐标
                const t = (x0 - a.x) / (b.x - a.x);
                const yIntersect = a.y + t * (b.y - a.y);
                intersections.push(yIntersect);
            }
        }
    
        // 按 Y 排序
        intersections.sort((a, b) => a - b);
    
        // 3️⃣ 判断奇偶
        if (intersections.length % 2 === 0 && intersections.length >= 2) {
            let maxDist = -Infinity;
            let bestY = labelPoint.y;
        
            for (let i = 0; i < intersections.length; i += 2) {
                const y1 = intersections[i];
                const y2 = intersections[i + 1];
                const dist = y2 - y1;
                if (dist > maxDist) {
                    maxDist = dist;
                    bestY = (y1 + y2) / 2; // 区间中点
                }
            }
        
            labelPoint.y = bestY;
        }
        // 如果是奇数，说明点在内部，不调整
    
        return labelPoint;
    }





    
    /**
     * 在 Canvas 上绘制一个小圆点（label 点）
     * @param {{x: number, y: number}} point - 圆心位置
     */
    function drawLabelPoint(point) {
        if (!showLabelPoint || !point) return;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#34C759';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 8;
        ctx.stroke();
    }


    function drawLabelText(point) {
        if (!point || !text) return;
    
        ctx.save(); // 保存当前绘图状态
        ctx.font = 'bold 20px Arial';       // 字体样式   
        ctx.textAlign = 'center';           // 水平居中
        ctx.textBaseline = 'middle';        // 垂直居中

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeText(text, point.x, point.y);

            // 内层填充（主文字颜色）
        ctx.fillStyle = '#0B5D54';
        ctx.fillText(text, point.x, point.y);

        ctx.restore(); // 恢复状态

        
    }
  
};



