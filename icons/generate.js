const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

[16, 32, 48, 128].forEach(size => {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  const out = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`Generated ${out}`);
});
