(function () {
  $(document).ready(function () {
    const gridSize = 32,
          gridDim = [25, 25];

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
          makeGrey = function (lum) {
            let hex = Math.round(lum*255).toString(16);
            hex = ('00' + hex).slice(-2);
            return '#' + hex + hex + hex;
          };


    let grid = [],
        ctx = createCanvas('grid');
    ctx.strokeStyle = '#aaaaaa';
    for (let x = 0, w = gridDim[0]; x < w; x++) {
      grid[x] = [];
      for (let y = 0, h = gridDim[1]; y < h; y++) {
        let c = grid[x][y] = 1;
        // ctx.fillStyle = makeGrey(c);
        // ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize);
        // ctx.strokeRect(x*gridSize, y*gridSize, gridSize, gridSize);
      }
    }

    let aStarCTX = createCanvas('a-star');
    aStarCTX.fillStyle = 'red';

    let dist = function (a, b) {
      return Math.sqrt(Math.pow(b.y - a.y, 2) + Math.pow(b.x - a.x, 2));
    };

    let keyPromise = function () {
      return new Promise((resolve) => {
        $(document).one('keypress', resolve);
      });
    };
    const aStarLIMIT = 100;
    let aStarIsRunning = false;
    async function aStar(start, end) {
      aStarIsRunning = true;
      let iter = 0, open = [], closed = [], current;
      open.push(start);
      while (true) {
        open.sort((a, b) => {
          let gCostA = dist(a, start),
              gCostB = dist(b, start),
              hCostA = dist(a, end),
              hCostB = dist(b, end),
              fCostA = gCostA + hCostA,
              fCostB = gCostB + hCostB;
          if (fCostA < fCostB) {
            return -1;
          } else if (fCostA > fCostB) {
            return 1;
          }
          return 0;
        });
        current = open.shift();
        closed.push(current);

        if (current.x === end.x && current.y === end.y) return;

        for (let x = -1; x < 1; x++) {
          for (let y = -1; y < 1; y++) {
            if (x || y) {
              let new = {
                x: current.x + x,
                y: current.y + y
              };
              //
            }
          }
        }

        console.log(iter);
        if (iter > aStarLIMIT) break;
        iter++;
        await keyPromise();
      }
      aStarIsRunning = false;
    };



    let start = {}, end = {};
    start.x = Math.floor(Math.random() * gridDim[0]);
    start.y = Math.floor(Math.random() * gridDim[1]);
    end.x = Math.floor(Math.random() * gridDim[0]);
    end.y = Math.floor(Math.random() * gridDim[1]);

    $(document).bind('keypress', function (e) {
      switch (e.which) {
        case 32:
          if (aStarIsRunning) break;
          aStar(start, end);
          break;
      }
    });

    $(CANVAS).on('click', (e) => {
      let pos = $(CANVAS).position(),
          px = Math.floor(e.pageX - pos.top),
          py = Math.floor(e.pageY - pos.left),
          gx = Math.floor(px/gridSize),
          gy = Math.floor(py/gridSize);
      grid[gx][gy] = 1 - grid[gx][gy];
      console.log([px, py], [gx, gy], grid[gx][gy]);
    });

    const loop = setInterval(
      function () {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        for (let x = 0, w = gridDim[0]; x < w; x++) {
          for (let y = 0, h = gridDim[1]; y < h; y++) {
            let c = grid[x][y];
            ctx.fillStyle = makeGrey(c);
            ctx.fillRect(x*gridSize, y*gridSize, gridSize, gridSize);
            ctx.strokeRect(x*gridSize, y*gridSize, gridSize, gridSize);
          }
        }

        CTX.drawImage(ctx.canvas, 0, 0);
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

        CTX.drawImage(aStarCTX.canvas, 0, 0);
      }, 1000/30);
  });
})();
