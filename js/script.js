(function () {
  /// User-defined.
  var gridSize = 32,
      gridDim = [20, 20],
      allowDiagonals = true,
      canCrossWalls = !true,
      aStarLimit = 1000,
      terrainScalar = 10,
      clickIncr = 0.25;

  $(document).ready(function () {
    const CANVAS = $('#world').get(0),
          CTX = CANVAS.getContext('2d'),
          WIDTH = CANVAS.width = gridSize * gridDim[0] * 3/4,
          HEIGHT = CANVAS.height = gridSize * gridDim[1] * Math.sqrt(3)/2,
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
            ctx.hexagon = function (x, y, r) {
              ctx.beginPath();
              let f = 'moveTo';
              for (let i = 0; i <= 6; i++) {
                let hx = x * 3/4 + r * Math.cos(Math.PI * i/3),
                    hy = y * Math.sqrt(3/4) + r * Math.sin(Math.PI * i/3);
                ctx[f](hx, hy);
                f = 'lineTo';
              }
            };
            ctx.strokeHexagon = function (x, y, r) {
              ctx.hexagon(x, y, r);
              ctx.stroke();
            };
            ctx.fillHexagon = function (x, y, r) {
              ctx.hexagon(x, y, r);
              ctx.fill();
            };
            return ctx;
          },
          lumToHex = function (lum) {
            /// Convert a luminosity value into a hex color value.
            let hex = Math.round(lum*255).toString(16);
            hex = ('00' + hex).slice(-2);
            return '#' + hex + hex + hex;
          };

    let mapTerrain = [],
        mapPath = [],
        ctx = createCanvas('grid'),
        aStarCTX = createCanvas('a-star'),
        aStarIsRunning = false,
        aStarCurrent,
        startXY = worldToCart(
          Math.floor(Math.random() * gridDim[0]),
          Math.floor(Math.random() * gridDim[1])
        ),
        endXY = worldToCart(
          Math.floor(Math.random() * gridDim[0]),
          Math.floor(Math.random() * gridDim[1])
        ),
        start = {
          x: startXY.x,
          y: startXY.y
        },
        end = {
          x: endXY.x,
          y: endXY.y
        };

    function dist(a, b) {
      return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
    }
    function cartToWorld(x, y) {
      let row = Math.floor(x) * 2 + 7/4,
          col = Math.floor(y) / 2 + 1/2;
      if (Math.floor(y) % 2) row--;
      return {x: row * gridSize, y: col * gridSize};
    }
    function worldToCart(u, v) {
      // u /= gridSize;
      // v /= gridSize;
      let x = 0.5 * gridDim[0] * u/WIDTH,
          y = 2 * gridDim[1] * v/HEIGHT;
      // if (Math.floor(u/gridSize) % 2) y++;
      return {x: Math.floor(x), y: Math.floor(y)};
    }

    ctx.strokeStyle = '#aaaaaa';
    aStarCTX.fillStyle = '#ff00007F';
    aStarCTX.font = gridSize * 2/3 + 'px Courier New';
    aStarCTX.textAlign = 'center';

    /// Initialize the world grid.
    for (let x = 0, w = gridDim[0]/2; x < w; x++) {
      mapTerrain[x] = [];
      for (let y = 0, h = gridDim[1]*2; y < h; y++) {
        mapTerrain[x][y] = {
          val: 1//,
          // fCost: Infinity,
          // child: null
        };
      }
    }

    async function aStar(start, end) {
      console.log('Searching for path...');
      aStarIsRunning = true;
      mapPath = [];

      let tStart = Date.now(),
          iter = 0,
          open = [start],
          closed = [],
          current,
          fCost = function (a) {
            let gCost = dist(a, start),
                hCost = dist(a, end),
                fatigue = 1 - mapTerrain[a.x][a.y].val;
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
            if (!mapPath[x]) mapPath[x] = [];
            if (!mapPath[x][y]) {
              mapPath[x][y] = {
                fCost: Infinity,
                child: null
              };
            }
            /// Keep within bounds.
            if (x < 0 || x >= gridDim[0]) return;
            if (y < 0 || y >= gridDim[1]) return;
            newF = fCost({x: x, y: y});
            /// Ignore walls. They cannot be crossed.
            if (!canCrossWalls && mapTerrain[x][y].val === 0) return;
            /// Do not reevaluate tiles.
            if (closed.filter(a => a.x === x && a.y === y).length) return;
            /// Should have a lesser fCost.
            if (newF >= mapPath[x][y].fCost && open.filter(a => a.x === x && a.y === y).length) return;
            /// This tile is now open for evaluation!
            open.push({x: x, y: y});
            mapPath[x][y].fCost = newF;
            mapPath[x][y].child = {
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
              gxy = worldToCart(px, py),
              gx = gxy.x,//Math.floor(px/gridSize),
              gy = gxy.y,//Math.floor(py/gridSize);
              val = mapTerrain[gx][gy].val + clickIncr;
          if (val > 1) val = 0;
          mapTerrain[gx][gy].val = clickColor = val;
          console.log([px, py], [gx, gy], mapTerrain[gx][gy]);
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
                gxy = worldToCart(px, py),
                gx = gxy.x,//Math.floor(px/gridSize),
                gy = gxy.y;//Math.floor(py/gridSize);
            mapTerrain[gx][gy].val = clickColor;
          });
    })();

    let loop = setInterval(
      function () {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        /// Draw the mapTerrain.
        for (let x = 0, w = gridDim[0]/2; x < w; x++) {
          for (let y = 0, h = gridDim[1]*2; y < h; y++) {
            let c = mapTerrain[x][y].val,
                xy = cartToWorld(x, y);
            ctx.fillStyle = lumToHex(c);
            // ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize);
            // ctx.strokeRect(x*gridSize, y*gridSize, gridSize, gridSize);
            ctx.fillHexagon(xy.x, xy.y, gridSize/2);
            ctx.strokeHexagon(xy.x, xy.y, gridSize/2);
          }
        }

        /// Draw the mapTerrain onto the display.
        CTX.clearRect(0, 0, WIDTH, HEIGHT);
        CTX.drawImage(ctx.canvas, 0, 0);

        /// Draw the path, even while it is being calculated.
        if (aStarCurrent) {
          let x = aStarCurrent.x,
              y = aStarCurrent.y,
              child = mapPath[x][y] ? mapPath[x][y].child : null;
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
              if (mapPath[child.x][child.y]) {
                child = mapPath[child.x][child.y].child;
              } else {
                child = null;
              }
            }
            CTX.stroke();
          }
        }

        /// Draw the start and finish spots.
        CTX.fillStyle = 'green';
        CTX.beginPath();
        CTX.arc(
          start.x * gridSize,
          start.y * gridSize,
          gridSize * 0.4,
          0, 2*Math.PI
        );
        CTX.fill();
        CTX.fillStyle = 'red';
        CTX.beginPath();
        CTX.arc(
          end.x * gridSize,
          end.y * gridSize,
          gridSize * 0.4,
          0, 2*Math.PI
        );
        CTX.fill();

        /// Draw the A* labels.
        CTX.drawImage(aStarCTX.canvas, 0, 0);
      }, 1000/30);
  });
})();
