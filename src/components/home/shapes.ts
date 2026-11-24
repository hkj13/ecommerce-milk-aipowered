/**
 * Shapes the milk particles settle into, one per chapter of the story.
 * Each is drawn in a 400 x 400 box on an offscreen canvas; the particle
 * field samples points from the filled pixels.
 */

export type ShapeId = "drop" | "cow" | "can" | "chill" | "flask" | "bottle" | "route" | "glass";

type Draw = (c: CanvasRenderingContext2D, font: string) => void;

const drop: Draw = (c) => {
  c.beginPath();
  c.moveTo(200, 30);
  c.bezierCurveTo(200, 30, 82, 176, 82, 258);
  c.arc(200, 258, 118, Math.PI, 0, true);
  c.bezierCurveTo(318, 176, 200, 30, 200, 30);
  c.fill();
};

const cow: Draw = (c) => {
  // A Gir cow in profile: hump, long drooping ears, curved horns, dewlap.
  c.save();
  c.translate(18, 70);
  c.scale(1.85, 1.85);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
  };
  const el = (x: number, y: number, rx: number, ry: number, rot = 0) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    c.fill();
  };
  rr(48, 38, 108, 50, 24); // body
  el(70, 38, 16, 10); // hump
  el(150, 60, 14, 22); // rump
  // neck
  c.beginPath();
  c.moveTo(62, 44);
  c.lineTo(34, 36);
  c.lineTo(24, 58);
  c.lineTo(56, 80);
  c.closePath();
  c.fill();
  el(26, 50, 12, 16, -0.35); // head
  rr(12, 58, 18, 15, 7); // muzzle
  el(36, 58, 4.5, 12, -0.45); // drooping ear
  // dewlap
  c.beginPath();
  c.moveTo(34, 66);
  c.quadraticCurveTo(44, 96, 60, 84);
  c.lineTo(60, 70);
  c.closePath();
  c.fill();
  // horns
  c.lineWidth = 4.5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(28, 38);
  c.quadraticCurveTo(30, 24, 42, 22);
  c.stroke();
  // legs
  rr(56, 80, 10, 40, 3);
  rr(70, 80, 10, 37, 3);
  rr(132, 78, 10, 42, 3);
  rr(146, 76, 10, 40, 3);
  // udder
  el(124, 90, 11, 7);
  // tail
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(163, 48);
  c.quadraticCurveTo(172, 72, 166, 104);
  c.stroke();
  el(166, 108, 3.5, 7);
  c.restore();
};

const can: Draw = (c) => {
  // The aluminium milk can of every Indian dairy, with drops above.
  c.beginPath();
  c.moveTo(150, 150);
  c.lineTo(250, 150);
  c.lineTo(250, 178);
  c.quadraticCurveTo(300, 196, 300, 240);
  c.lineTo(300, 352);
  c.quadraticCurveTo(300, 370, 282, 370);
  c.lineTo(118, 370);
  c.quadraticCurveTo(100, 370, 100, 352);
  c.lineTo(100, 240);
  c.quadraticCurveTo(100, 196, 150, 178);
  c.closePath();
  c.fill();
  c.beginPath();
  c.roundRect(138, 124, 124, 28, 10); // lid
  c.fill();
  c.beginPath();
  c.roundRect(186, 104, 28, 24, 6); // knob
  c.fill();
  // handles
  c.lineWidth = 9;
  c.beginPath();
  c.arc(92, 236, 22, Math.PI * 0.5, Math.PI * 1.5);
  c.stroke();
  c.beginPath();
  c.arc(308, 236, 22, Math.PI * 1.5, Math.PI * 0.5);
  c.stroke();
  // falling drops
  [
    [200, 52, 14],
    [158, 78, 9],
    [242, 70, 10],
  ].forEach(([x, y, r]) => {
    c.beginPath();
    c.moveTo(x, y - r * 1.8);
    c.quadraticCurveTo(x + r, y - r * 0.2, x + r, y + r * 0.2);
    c.arc(x, y + r * 0.2, r, 0, Math.PI);
    c.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.8);
    c.fill();
  });
};

const chill: Draw = (c, font) => {
  c.font = `500 190px ${font}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("4°C", 200, 214);
  // a small snowflake above
  c.lineWidth = 7;
  c.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    c.beginPath();
    c.moveTo(200, 70);
    c.lineTo(200 + Math.cos(a) * 34, 70 + Math.sin(a) * 34);
    c.stroke();
  }
};

const flask: Draw = (c) => {
  c.beginPath();
  c.moveTo(168, 60);
  c.lineTo(232, 60);
  c.lineTo(232, 74);
  c.lineTo(222, 74);
  c.lineTo(222, 160);
  c.lineTo(318, 336);
  c.quadraticCurveTo(326, 360, 300, 360);
  c.lineTo(100, 360);
  c.quadraticCurveTo(74, 360, 82, 336);
  c.lineTo(178, 160);
  c.lineTo(178, 74);
  c.lineTo(168, 74);
  c.closePath();
  c.fill();
  // a tick beside it
  c.lineWidth = 16;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(300, 108);
  c.lineTo(324, 132);
  c.lineTo(366, 82);
  c.stroke();
};

const bottle: Draw = (c) => {
  c.beginPath();
  c.moveTo(172, 44);
  c.lineTo(228, 44);
  c.lineTo(228, 112);
  c.quadraticCurveTo(232, 140, 262, 170);
  c.quadraticCurveTo(282, 192, 282, 226);
  c.lineTo(282, 350);
  c.quadraticCurveTo(282, 378, 254, 378);
  c.lineTo(146, 378);
  c.quadraticCurveTo(118, 378, 118, 350);
  c.lineTo(118, 226);
  c.quadraticCurveTo(118, 192, 138, 170);
  c.quadraticCurveTo(168, 140, 172, 112);
  c.closePath();
  c.fill();
  c.beginPath();
  c.roundRect(164, 26, 72, 24, 8); // cap
  c.fill();
};

const route: Draw = (c) => {
  // a winding route through four stops to a pin
  c.lineWidth = 15;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(40, 360);
  c.bezierCurveTo(140, 360, 70, 260, 170, 250);
  c.bezierCurveTo(270, 240, 220, 160, 290, 150);
  c.stroke();
  [
    [40, 360],
    [118, 300],
    [170, 250],
    [242, 196],
  ].forEach(([x, y]) => {
    c.beginPath();
    c.arc(x, y, 17, 0, Math.PI * 2);
    c.fill();
  });
  // pin
  c.beginPath();
  c.arc(300, 92, 46, Math.PI * 0.82, Math.PI * 0.18);
  c.lineTo(300, 170);
  c.closePath();
  c.fill();
};

const glass: Draw = (c) => {
  c.beginPath();
  c.moveTo(126, 120);
  c.lineTo(274, 120);
  c.lineTo(258, 370);
  c.quadraticCurveTo(256, 384, 242, 384);
  c.lineTo(158, 384);
  c.quadraticCurveTo(144, 384, 142, 370);
  c.closePath();
  c.fill();
  // splash crown
  c.beginPath();
  c.moveTo(122, 120);
  c.quadraticCurveTo(130, 70, 150, 96);
  c.quadraticCurveTo(160, 40, 182, 90);
  c.quadraticCurveTo(200, 20, 218, 90);
  c.quadraticCurveTo(240, 40, 250, 96);
  c.quadraticCurveTo(270, 70, 278, 120);
  c.closePath();
  c.fill();
  [
    [140, 46, 8],
    [262, 38, 9],
    [200, 12, 7],
  ].forEach(([x, y, r]) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  });
};

export const SHAPES: Record<ShapeId, Draw> = { drop, cow, can, chill, flask, bottle, route, glass };

/** Sample n points (in a 0..1 square) from a shape. */
export function sampleShape(id: ShapeId, n: number, font: string, seed = 1): [number, number][] {
  const S = 400;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#000";
  c.strokeStyle = "#000";
  SHAPES[id](c, font);
  const data = c.getImageData(0, 0, S, S).data;
  const inside: number[] = [];
  const step = 3;
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      if (data[(y * S + x) * 4 + 3] > 128) inside.push(y * S + x);
    }
  }
  let a = seed * 9973;
  const rand = () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const idx = inside[Math.floor(rand() * inside.length)] ?? 0;
    const x = (idx % S) + (rand() - 0.5) * step;
    const y = Math.floor(idx / S) + (rand() - 0.5) * step;
    pts.push([x / S, y / S]);
  }
  return pts;
}
