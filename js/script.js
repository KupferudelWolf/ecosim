(function () {
  /// User-defined.
  var gridSize = 32,
      gridDim = [25, 25],
      allowDiagonals = true,
      canCrossWalls = !true,
      aStarLimit = 1000,
      terrainScalar = 10,
      clickIncr = 0.25;

  $(document).ready(function () {
    const CANVAS = $('#world').get(0),
          CTX = CANVAS.getContext('2d'),
          WIDTH = CANVAS.width = gridSize * gridDim[0],
          HEIGHT = CANVAS.height = gridSize * gridDim[1],
          createCanvas = function (id) {
            let canvas = $('<canvas>')
                  .attr('width', WIDTH)
                  .attr('height', HEIGHT)
                  .attr('id', id)
                  // .appendTo('body')
                  .get(0),
                ctx = canvas.getContext('2d');
            ctx.getPL = function (x, y) {
              return ctx.getImageData(x, y, 1, 1).data[0] / 255;
            };
            return ctx;
          },
          lumToHex = function (lum) {
            /// Convert a luminosity value into a hex color value.
            let hex = Math.round(lum*255).toString(16);
            hex = ('00' + hex).slice(-2);
            return '#' + hex + hex + hex;
          };

    let worldGrid = [],
        ctx = createCanvas('grid'),
        aStarCTX = createCanvas('a-star'),
        aStarIsRunning = false,
        aStarCurrent,
        start = {
          x: Math.floor(Math.random() * gridDim[0]),
          y: Math.floor(Math.random() * gridDim[1])
        },
        end = {
          x: start.x,//Math.floor(Math.random() * gridDim[0]),
          y: Math.floor(Math.random() * gridDim[1])
        };

    function dist(a, b) {
      return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
    };

    ctx.strokeStyle = '#aaaaaa';
    aStarCTX.fillStyle = '#ff00007F';
    aStarCTX.font = gridSize*2/3 + 'px Courier New';
    aStarCTX.textAlign = 'center';

    /// Initialize the world grid.
    for (let x = 0, w = gridDim[0]; x < w; x++) {
      worldGrid[x] = [];
      for (let y = 0, h = gridDim[1]; y < h; y++) {
        worldGrid[x][y] = {
          val: 1,
          fCost: Infinity,
          child: null
        };
      }
    }

    async function aStar(start, end) {
      console.log('Searching for path...');
      aStarIsRunning = true;

      let tStart = Date.now(),
          iter = 0,
          open = [start],
          closed = [],
          current,
          fCost = function (a) {
            let gCost = dist(a, start),
                hCost = dist(a, end),
                fatigue = 1 - worldGrid[a.x][a.y].val;
            return gCost + hCost + terrainScalar * fatigue;
          },
          evaluate = function (x, y) {
            let newF, px, py;
            /// Ignore the current tile itself.
            /// (Redundant, since the current tile will be closed.)
            if (!x && !y) return;
            /// If diagonals are disabled, one of the values should be 0.
            if (!allowDiagonals && x && y) return;
            x += current.x;
            y += current.y;
            /// Keep within bounds.
            if (x < 0 || x >= gridDim[0]) return;
            if (y < 0 || y >= gridDim[1]) return;
            newF = fCost({x: x, y: y});
            /// Ignore walls. They cannot be crossed.
            if (!canCrossWalls && worldGrid[x][y].val === 0) return;
            /// Do not reevaluate tiles.
            if (closed.filter(a => a.x === x && a.y === y).length) return;
            /// Should have a lesser fCost.
            if (newF >= worldGrid[x][y].fCost && open.filter(a => a.x === x && a.y === y).length) return;
            /// This tile is now open for evaluation!
            open.push({x: x, y: y});
            worldGrid[x][y].fCost = newF;
            worldGrid[x][y].child = {
              x: current.x,
              y: current.y
            };
            /// Draw the fCost values.
            px = x * gridSize;
            py = y * gridSize;
            aStarCTX.clearRect(px, py, gridSize, gridSize);
            aStarCTX.fillText(Math.round(newF), px + gridSize/2, py + gridSize * 3/4);
          };

      while (true) {
        open.sort((a, b) => {
          let fCostA = fCost(a), fCostB = fCost(b);
          if (fCostA < fCostB) return -1;
          if (fCostA > fCostB) return 1;
          return 0;
        });
        /// Pick the cell with the lowest fCost.
        current = open.shift();
        closed.push(current);

        aStarCurrent = current;

        if (!current) {
          console.error('Path could not be found.', Math.floor(Date.now() - tStart) + 'ms');
          break;
        }
        if (current.x === end.x && current.y === end.y) {
          console.log('Path found!', Math.floor(Date.now() - tStart) + 'ms');
          break;
        }

        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            evaluate(x, y);
          }
        }

        if (iter > aStarLimit) {
          console.error('A* loop iteration limit reached.');
          break;
        }
        iter++;
        await new Promise((resolve) => {
          // $(document).one('keypress', resolve);
          setTimeout(resolve, 0);
        });
      }
      aStarIsRunning = false;
    };

    (function () {
      $(document).bind('keypress', function (e) {
        switch (e.which) {
          case 32:
            /// Spacebar.
            if (aStarIsRunning) break;
            aStarCTX.clearRect(0, 0, WIDTH, HEIGHT);
            aStar(start, end);
            break;
        }
      });

      let isClick = false, clickColor = -1;
      $(CANVAS)
          .bind('mousedown', (e) => {
            isClick = true;
            let pos = $(CANVAS).position(),
                px = Math.floor(e.pageX - pos.top),
                py = Math.floor(e.pageY - pos.left),
                gx = Math.floor(px/gridSize),
                gy = Math.floor(py/gridSize),
                val = worldGrid[gx][gy].val + clickIncr;
            if (val > 1) val = 0;
            worldGrid[gx][gy].val = clickColor = val;
          })
          .bind('mouseleave mouseup', (e) => {
            isClick = false;
            clickColor = -1;
          })
          .bind('mousemove', (e) => {
            if (!isClick) return;
            let pos = $(CANVAS).position(),
                px = Math.floor(e.pageX - pos.top),
                py = Math.floor(e.pageY - pos.left),
                gx = Math.floor(px/gridSize),
                gy = Math.floor(py/gridSize);
            worldGrid[gx][gy].val = clickColor;
            // console.log([px, py], [gx, gy], worldGrid[gx][gy]);
          });
    })();

    let loop = setInterval(
      function () {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        /// Draw the worldGrid.
        for (let x = 0, w = gridDim[0]; x < w; x++) {
          for (let y = 0, h = gridDim[1]; y < h; y++) {
            let c = worldGrid[x][y].val;
            ctx.fillStyle = lumToHex(c);
            ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize);
            ctx.strokeRect(x*gridSize, y*gridSize, gridSize, gridSize);
          }
        }

        /// Draw the worldGrid onto the display.
        CTX.clearRect(0, 0, WIDTH, HEIGHT);
        CTX.drawImage(ctx.canvas, 0, 0);

        /// Draw the path, even while it is being calculated.
        if (aStarCurrent) {
          let x = aStarCurrent.x,
              y = aStarCurrent.y,
              child = worldGrid[x][y].child;
          CTX.fillStyle = CTX.strokeStyle = '#00ff7f7f';
          CTX.lineWidth = 4;
          CTX.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
          if (child) {
            /// Draw the path so far.
            CTX.beginPath();
            CTX.moveTo((x+0.5)*gridSize, (y+0.5)*gridSize);
            CTX.lineTo((child.x+0.5)*gridSize, (child.y+0.5)*gridSize);
            while (child) {
              CTX.lineTo((child.x+0.5)*gridSize, (child.y+0.5)*gridSize);
              child = worldGrid[child.x][child.y].child;
            }
            CTX.stroke();
          }
        }

        /// Draw the start and finish spots.
        CTX.fillStyle = 'green';
        CTX.beginPath();
        CTX.arc(
          (start.x+0.5) * gridSize,
          (start.y+0.5) * gridSize,
          gridSize * 0.4,
          0, 2*Math.PI
        );
        CTX.fill();
        CTX.fillStyle = 'red';
        CTX.beginPath();
        CTX.arc(
          (end.x+0.5) * gridSize,
          (end.y+0.5) * gridSize,
          gridSize * 0.4,
          0, 2*Math.PI
        );
        CTX.fill();

        /// Draw the A* labels.
        CTX.drawImage(aStarCTX.canvas, 0, 0);
      }, 1000/30);
  });
})();
