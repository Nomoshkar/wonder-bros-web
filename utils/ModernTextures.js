/**
 * Original procedural Canvas2D artwork with a polished, toy-like finish.
 * The gameplay grid stays compact while the art uses smooth paths, dimensional
 * shading, soft contact shadows, and the signature silhouettes of the cast.
 * No downloaded artwork or Phaser drawing APIs are used.
 */

import { CHARACTER_ORDER, CHARACTER_STATS, TILE } from './Constants.js';

const HERO_W = 64;
const HERO_H = 72;
const ENEMY_SIZE = 48;
const INK = '#2a1d3d';
const DEEP_INK = '#191529';
const CREAM = '#fff8e8';
const SKIN = '#ffd3a2';
const SKIN_SHADE = '#e9a477';

function makeCanvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const ctx = element.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { element, ctx };
}

function rgba(hex, alpha) {
  const value = hex.replace('#', '');
  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function radial(ctx, x, y, radius, stops) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function path(ctx, draw, fill, stroke = INK, width = 1.05) {
  ctx.beginPath();
  draw(ctx);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function polygon(ctx, points, fill, stroke = INK, width = 1.05) {
  path(ctx, p => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
    p.closePath();
  }, fill, stroke, width);
}

function roundPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke = INK, lineWidth = 1.05) {
  path(ctx, p => roundPath(p, x, y, width, height, radius), fill, stroke, lineWidth);
}

function oval(ctx, x, y, rx, ry, fill, stroke = INK, rotation = 0, width = 1.05) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function circle(ctx, x, y, radius, fill, stroke = INK, width = 1.05) {
  oval(ctx, x, y, radius, radius, fill, stroke, 0, width);
}

function strokePath(ctx, draw, color, width) {
  ctx.beginPath();
  draw(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  strokePath(ctx, p => {
    p.moveTo(x1, y1);
    p.lineTo(x2, y2);
  }, color, width);
}

function limb(ctx, x1, y1, x2, y2, width, color, shade = null) {
  const draw = p => {
    p.moveTo(x1, y1);
    p.lineTo(x2, y2);
  };
  strokePath(ctx, draw, INK, width + 1.7);
  const fill = shade || linear(ctx, x1, y1, x2, y2, [
    [0, color], [0.42, color], [1, shade || color]
  ]);
  strokePath(ctx, draw, fill, width);
  ctx.save();
  ctx.globalAlpha = 0.28;
  strokePath(ctx, draw, '#ffffff', Math.max(0.65, width * 0.17));
  ctx.restore();
}

function softShadow(ctx, x, y, rx, ry, opacity = 0.26) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
  gradient.addColorStop(0, `rgba(31, 20, 48, ${opacity})`);
  gradient.addColorStop(0.55, `rgba(31, 20, 48, ${opacity * 0.55})`);
  gradient.addColorStop(1, 'rgba(31, 20, 48, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function glow(ctx, x, y, radius, color, opacity = 0.5) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = radial(ctx, x, y, radius, [
    [0, rgba(color, 0.9)], [0.35, rgba(color, 0.45)], [1, rgba(color, 0)]
  ]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function sphere(ctx, x, y, rx, ry, light, mid, dark, stroke = INK, width = 1.05) {
  oval(ctx, x, y, rx, ry, radial(ctx, x - rx * 0.34, y - ry * 0.4, Math.max(rx, ry) * 1.15, [
    [0, light], [0.4, mid], [1, dark]
  ]), stroke, 0, width);
}

function shine(ctx, x, y, rx, ry, rotation = -0.35, opacity = 0.7) {
  ctx.save();
  ctx.globalAlpha = opacity;
  oval(ctx, x, y, rx, ry, '#ffffff', null, rotation);
  ctx.restore();
}

function eye(ctx, x, y, rx, ry, iris, gazeX = 0.6, gazeY = 0.2, lashes = false) {
  oval(ctx, x, y, rx, ry, linear(ctx, x - rx, y - ry, x + rx, y + ry, [
    [0, '#ffffff'], [0.7, '#fffdf6'], [1, '#dfe7f2']
  ]), INK, 0, 0.85);
  oval(ctx, x + gazeX, y + gazeY, rx * 0.49, ry * 0.62, iris, DEEP_INK, 0, 0.6);
  oval(ctx, x + gazeX, y + gazeY, rx * 0.25, ry * 0.37, DEEP_INK, null);
  circle(ctx, x + gazeX - rx * 0.13, y + gazeY - ry * 0.2, Math.max(0.55, rx * 0.16), '#ffffff', null);
  if (lashes) {
    strokePath(ctx, p => {
      p.moveTo(x - rx * 0.76, y - ry * 0.68);
      p.lineTo(x - rx * 1.03, y - ry * 0.96);
      p.moveTo(x - rx * 0.25, y - ry * 0.96);
      p.lineTo(x - rx * 0.3, y - ry * 1.2);
    }, INK, 0.8);
  }
}

function brow(ctx, x1, y1, x2, y2, color = INK, width = 1.15, tilt = 0) {
  strokePath(ctx, p => {
    p.moveTo(x1, y1);
    p.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + tilt, x2, y2);
  }, color, width);
}

function smile(ctx, x, y, width = 5, color = '#9c4d48') {
  strokePath(ctx, p => {
    p.moveTo(x - width, y);
    p.quadraticCurveTo(x, y + width * 0.65, x + width, y);
  }, color, 1);
}

function starPath(ctx, x, y, outer, inner, points = 5, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = rotation + i * Math.PI / points;
    const radius = i % 2 === 0 ? outer : inner;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star(ctx, x, y, outer, inner, fill, stroke = INK, points = 5, rotation = -Math.PI / 2) {
  path(ctx, p => starPath(p, x, y, outer, inner, points, rotation), fill, stroke, 0.9);
}

function flower(ctx, x, y, radius, petalColor, centerColor = '#ffd453', rotation = 0) {
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i * Math.PI * 2 / 5;
    oval(ctx, x + Math.cos(angle) * radius * 0.62, y + Math.sin(angle) * radius * 0.62,
      radius * 0.55, radius * 0.38, petalColor, null, angle);
  }
  circle(ctx, x, y, radius * 0.34, centerColor, null);
}

function crown(ctx, x, y, scale = 1, jewel = '#ef557f') {
  const gradient = linear(ctx, x, y - 7 * scale, x, y + 4 * scale, [
    [0, '#fff2a0'], [0.45, '#ffd34f'], [1, '#d99724']
  ]);
  path(ctx, p => {
    p.moveTo(x - 8 * scale, y + 3 * scale);
    p.lineTo(x - 8 * scale, y - 2 * scale);
    p.lineTo(x - 4 * scale, y + 0.2 * scale);
    p.lineTo(x, y - 7 * scale);
    p.lineTo(x + 4 * scale, y + 0.2 * scale);
    p.lineTo(x + 8 * scale, y - 2 * scale);
    p.lineTo(x + 8 * scale, y + 3 * scale);
    p.closePath();
  }, gradient, INK, 0.85);
  circle(ctx, x, y + 0.5 * scale, 1.25 * scale, jewel, INK, 0.5);
  shine(ctx, x - 4 * scale, y - 1.5 * scale, 2.2 * scale, 0.65 * scale, -0.15, 0.8);
}

function glove(ctx, x, y, scale = 1, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * scale, scale);
  sphere(ctx, 0, 0, 3.7, 3.3, '#ffffff', '#f7f4e9', '#cdd5e2', INK, 0.85);
  oval(ctx, -2.3, -1.9, 1.45, 1.85, '#fffdf6', INK, -0.45, 0.6);
  oval(ctx, 0, -2.35, 1.35, 1.75, '#fffdf6', INK, -0.1, 0.6);
  oval(ctx, 2.2, -1.8, 1.3, 1.7, '#fffdf6', INK, 0.35, 0.6);
  shine(ctx, -0.8, -1.2, 1.25, 0.65, -0.4, 0.75);
  ctx.restore();
}

function shoe(ctx, x, y, color, scale = 1, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * scale, scale);
  oval(ctx, 1, 1.8, 8.1, 2.15, '#39243a', INK, -0.03, 0.8);
  sphere(ctx, 0.9, -0.2, 8, 4.1, '#b98255', color, '#69402f', INK, 0.95);
  path(ctx, p => {
    p.moveTo(-4.2, -2.1);
    p.quadraticCurveTo(1.5, -4.6, 6.3, -1.8);
  }, null, rgba('#ffffff', 0.48), 1.2);
  line(ctx, 2.7, -2.8, 4.1, -0.6, '#70442f', 0.75);
  ctx.restore();
}

function heroPose(frame) {
  if (frame === 5) {
    return {
      bob: -1, lean: 0, jump: true,
      feet: [[18, 59], [47, 55]], knees: [[25, 51], [40, 49]],
      hands: [[17, 31], [47, 31]], elbows: [[19, 38], [45, 38]]
    };
  }
  if (frame === 0) {
    return {
      bob: 0, lean: 0, jump: false,
      feet: [[26, 64], [38, 64]], knees: [[27, 54], [37, 54]],
      hands: [[19, 52], [45, 52]], elbows: [[20, 44], [44, 44]]
    };
  }
  const poses = [
    { feet: [[23, 64], [42, 60]], knees: [[24, 53], [39, 53]], hands: [[17, 46], [46, 42]], elbows: [[20, 40], [43, 39]], bob: -1, lean: 0.035 },
    { feet: [[29, 63], [35, 64]], knees: [[29, 54], [35, 54]], hands: [[21, 51], [43, 48]], elbows: [[22, 44], [42, 43]], bob: -2, lean: 0.015 },
    { feet: [[42, 60], [23, 64]], knees: [[39, 53], [24, 53]], hands: [[46, 42], [17, 46]], elbows: [[43, 39], [20, 40]], bob: -1, lean: 0.035 },
    { feet: [[35, 64], [29, 63]], knees: [[35, 54], [29, 54]], hands: [[43, 48], [21, 51]], elbows: [[42, 43], [22, 44]], bob: -2, lean: 0.015 }
  ];
  return { ...poses[frame - 1], jump: false };
}

const HUMAN_STYLES = {
  mario: {
    shirt: '#ef4138', shirtDark: '#b9232c', overall: '#367bd3', overallDark: '#22549c',
    cap: '#ed4037', capDark: '#b9252c', hair: '#512d24', shoe: '#9b5934', logo: 'M',
    iris: '#3979bc', width: 1, height: 1, nose: [4.1, 3.35], shoeScale: 1
  },
  luigi: {
    shirt: '#39b94d', shirtDark: '#21863c', overall: '#397bd1', overallDark: '#245294',
    cap: '#37b64a', capDark: '#21853a', hair: '#492b23', shoe: '#89502f', logo: 'L',
    iris: '#398d4b', width: 0.92, height: 1.055, nose: [4.5, 3.8], shoeScale: 1.02
  },
  wario: {
    shirt: '#f5ca38', shirtDark: '#c69420', overall: '#7650ad', overallDark: '#4c3281',
    cap: '#f2c735', capDark: '#bf9020', hair: '#603923', shoe: '#b26b34', logo: 'W',
    iris: '#55405f', width: 1.12, height: 0.97, nose: [5.15, 4.1], shoeScale: 1.12
  },
  waluigi: {
    shirt: '#7851b5', shirtDark: '#503581', overall: '#35284f', overallDark: '#241b38',
    cap: '#7650b2', capDark: '#4e3483', hair: '#4a2b26', shoe: '#b16a37', logo: 'Γ',
    iris: '#4c78b4', width: 0.88, height: 1.06, nose: [5.8, 3.35], shoeScale: 1.05
  }
};

function drawMustache(ctx, style, color) {
  if (style === 'wario') {
    path(ctx, p => {
      p.moveTo(31, 29.5);
      p.lineTo(25, 27.7);
      p.lineTo(23.5, 30.2);
      p.lineTo(20, 28.2);
      p.bezierCurveTo(18, 33, 24, 35.5, 29, 33);
      p.lineTo(32, 31.7);
      p.lineTo(35, 33);
      p.bezierCurveTo(40, 35.5, 46, 33, 44, 28.2);
      p.lineTo(41, 30.2);
      p.lineTo(39.5, 27.7);
      p.closePath();
    }, color, null);
  } else if (style === 'waluigi') {
    path(ctx, p => {
      p.moveTo(31, 30);
      p.lineTo(26, 29);
      p.lineTo(24, 31);
      p.lineTo(20.5, 29.7);
      p.quadraticCurveTo(22, 35, 29, 33);
      p.lineTo(32, 31.5);
      p.lineTo(35, 33);
      p.quadraticCurveTo(42, 35, 43.5, 29.7);
      p.lineTo(40, 31);
      p.lineTo(38, 29);
      p.closePath();
    }, color, null);
  } else {
    path(ctx, p => {
      p.moveTo(32, 29.7);
      p.bezierCurveTo(28, 27.2, 23.2, 28.2, 21.7, 31.2);
      p.bezierCurveTo(25.5, 33.8, 29, 33.1, 32, 31.7);
      p.bezierCurveTo(35, 33.1, 39, 33.8, 43, 31);
      p.bezierCurveTo(41.6, 28, 36.5, 27.2, 32, 29.7);
      p.closePath();
    }, color, null);
  }
}

function drawHuman(ctx, id, frame) {
  const style = HUMAN_STYLES[id];
  const pose = heroPose(frame);
  const back = 1;
  const front = 0;
  softShadow(ctx, 32, 67, 20, 3.4, 0.25);
  ctx.save();
  ctx.translate(32, 66);
  ctx.scale(style.width, style.height);
  ctx.translate(-32, -66);
  ctx.translate(0, pose.bob);
  ctx.translate(32, 47);
  ctx.rotate(pose.lean);
  ctx.translate(-32, -47);

  // Alternating overall legs and oversized rounded shoes.
  for (const index of [back, front]) {
    const hip = index === 0 ? [28, 46] : [36, 46];
    const knee = pose.knees[index];
    const foot = pose.feet[index];
    limb(ctx, hip[0], hip[1], knee[0], knee[1], 7.2,
      index === back ? style.overallDark : style.overall);
    limb(ctx, knee[0], knee[1] + 1, foot[0], foot[1] - 2, 6.4,
      index === back ? style.overallDark : style.overall);
    shoe(ctx, foot[0], foot[1] - 0.5, style.shoe, style.shoeScale, 1);
  }

  // Sleeved arms swing opposite the legs; gloves stay large and readable.
  for (const index of [back, front]) {
    const shoulder = index === 0 ? [24, 37] : [40, 37];
    const elbow = pose.elbows[index];
    const hand = pose.hands[index];
    limb(ctx, shoulder[0], shoulder[1], elbow[0], elbow[1], 7.8,
      index === back ? style.shirtDark : style.shirt);
    limb(ctx, elbow[0], elbow[1], hand[0], hand[1], 6.8,
      index === back ? style.shirtDark : style.shirt);
    glove(ctx, hand[0], hand[1] + 0.5, 1, index === back ? -1 : 1);
  }

  roundedRect(ctx, 21.5, 34, 21, 17, 7, linear(ctx, 21, 34, 43, 51, [
    [0, style.shirt], [0.55, style.shirt], [1, style.shirtDark]
  ]), INK, 1.1);
  roundedRect(ctx, 24.5, 38, 15, 13.5, 4.3, linear(ctx, 25, 38, 39, 52, [
    [0, '#65a5eb'], [0.3, style.overall], [1, style.overallDark]
  ]), INK, 0.9);
  limb(ctx, 26, 35.5, 27.4, 41.5, 2.7, style.overallDark);
  limb(ctx, 38, 35.5, 36.6, 41.5, 2.7, style.overallDark);
  circle(ctx, 27.2, 41.4, 1.45, '#ffda48', INK, 0.55);
  circle(ctx, 36.8, 41.4, 1.45, '#ffda48', INK, 0.55);
  strokePath(ctx, p => {
    p.moveTo(29, 47.5);
    p.quadraticCurveTo(32, 49, 35, 47.5);
    p.moveTo(24.5, 45);
    p.quadraticCurveTo(26, 47, 27.5, 46);
  }, rgba(style.overallDark, 0.65), 0.8);
  shine(ctx, 27.5, 40.1, 3.2, 0.75, -0.15, 0.3);

  oval(ctx, 32, 35, 4.1, 3, SKIN_SHADE, INK, 0, 0.8);
  oval(ctx, 21.6, 24.5, 2.8, 3.7, SKIN, INK, 0, 0.9);
  oval(ctx, 42.4, 24.5, 2.8, 3.7, SKIN, INK, 0, 0.9);
  sphere(ctx, 32, 23.4, 10.4, 11.2, '#ffe6c2', SKIN, SKIN_SHADE, INK, 1.1);
  oval(ctx, 24, 18.4, 3.7, 5.5, style.hair, null, -0.18);
  oval(ctx, 40, 18.2, 3.5, 5.2, style.hair, null, 0.18);
  path(ctx, p => {
    p.moveTo(23, 18);
    p.quadraticCurveTo(25, 11, 33, 12.5);
    p.quadraticCurveTo(39, 12, 42, 18);
    p.quadraticCurveTo(36, 16, 32, 17.5);
    p.quadraticCurveTo(28, 15.5, 23, 18);
  }, style.hair, null);

  const angry = id === 'wario' || id === 'waluigi';
  eye(ctx, 28.7, 23, 3.05, 4.45, style.iris, 0.55, 0.25);
  eye(ctx, 35.7, 22.8, 3.05, 4.5, style.iris, 0.65, 0.2);
  if (angry) {
    brow(ctx, 25.4, 18.3, 31.5, id === 'wario' ? 20 : 19.3, style.hair, 1.3, -0.8);
    brow(ctx, 32.5, id === 'wario' ? 20 : 19.3, 38.6, 18.3, style.hair, 1.3, -0.8);
  } else {
    brow(ctx, 25.8, 18.2, 31.2, 18.7, style.hair, 1.05, 0.1);
    brow(ctx, 32.8, 18.7, 38.2, 18.2, style.hair, 1.05, 0.1);
  }
  sphere(ctx, 38.6, 26.7, style.nose[0], style.nose[1], '#ffe1b7', '#f4b384', '#d88f68', INK, 0.85);
  shine(ctx, 37.3, 25.4, 1.25, 0.7, -0.4, 0.75);
  drawMustache(ctx, id, style.hair);
  smile(ctx, 33.6, 34.2, id === 'waluigi' ? 3.3 : 4, '#a65350');
  ctx.save();
  ctx.globalAlpha = 0.25;
  oval(ctx, 25.3, 28.1, 2.1, 1.1, '#ec7f80', null);
  ctx.restore();

  // Soft cap crown, projecting brim, and a clean emblem.
  path(ctx, p => {
    p.moveTo(22.1, 16.7);
    p.bezierCurveTo(22.5, 7.1, 28.1, 3.3, 33.2, 3.6);
    p.bezierCurveTo(39.2, 3.2, 43.6, 8.2, 42.8, 16.8);
    p.closePath();
  }, linear(ctx, 26, 4, 40, 18, [
    [0, id === 'mario' ? '#ff7561' : style.cap], [0.36, style.cap], [1, style.capDark]
  ]), INK, 1.05);
  path(ctx, p => {
    p.moveTo(20.3, 15.4);
    p.bezierCurveTo(27.5, 13.5, 37.4, 13.9, 44.9, 16.4);
    p.bezierCurveTo(45.8, 18.2, 43.8, 19.7, 40.5, 19.2);
    p.bezierCurveTo(32.8, 18.1, 27.1, 18.2, 21.7, 19.3);
    p.bezierCurveTo(19.4, 19, 18.9, 17.1, 20.3, 15.4);
    p.closePath();
  }, linear(ctx, 20, 15, 44, 20, [[0, style.cap], [1, style.capDark]]), INK, 0.95);
  oval(ctx, 32.1, 10.3, 4.25, 3.8, '#fff9e9', INK, -0.04, 0.75);
  if (style.logo === 'M') {
    strokePath(ctx, p => {
      p.moveTo(29.9, 12.1);
      p.lineTo(29.9, 8.7);
      p.lineTo(32.1, 10.6);
      p.lineTo(34.3, 8.7);
      p.lineTo(34.3, 12.1);
    }, style.capDark, 1.15);
  } else if (style.logo === 'L') {
    strokePath(ctx, p => {
      p.moveTo(30.5, 8.5);
      p.lineTo(30.5, 12.2);
      p.lineTo(34.1, 12.2);
    }, style.capDark, 1.15);
  } else if (style.logo === 'W') {
    strokePath(ctx, p => {
      p.moveTo(29.4, 8.5);
      p.lineTo(30.8, 12.2);
      p.lineTo(32.1, 9.9);
      p.lineTo(33.5, 12.2);
      p.lineTo(34.8, 8.5);
    }, style.capDark, 1.1);
  } else {
    strokePath(ctx, p => {
      p.moveTo(30.6, 8.5);
      p.lineTo(34.3, 8.5);
      p.lineTo(30.6, 12.1);
      p.lineTo(34.1, 12.1);
    }, style.capDark, 1.15);
  }
  shine(ctx, 28.2, 6.5, 3.6, 1, -0.35, 0.45);
  ctx.restore();
}

const PRINCESS_STYLES = {
  peach: {
    dress: '#f184b3', dressDark: '#ce4f8e', dressLight: '#ffc3d8', hair: '#f6d46c', hairDark: '#d3a941',
    iris: '#4386c5', gem: '#64c8e7', shoe: '#e75f98', height: 1
  },
  daisy: {
    dress: '#f4ad38', dressDark: '#d67b25', dressLight: '#ffdc74', hair: '#ad6034', hairDark: '#793e2a',
    iris: '#408d59', gem: '#3bb5ad', shoe: '#e9879e', height: 0.99
  },
  rosalina: {
    dress: '#67cbd4', dressDark: '#348fa7', dressLight: '#b7f0ed', hair: '#eee8c8', hairDark: '#c8bfa3',
    iris: '#5d91ba', gem: '#ffda58', shoe: '#77d7df', height: 1.04
  }
};

function drawPrincess(ctx, id, frame) {
  const style = PRINCESS_STYLES[id];
  const pose = heroPose(frame);
  const sway = frame === 1 ? -1.8 : frame === 3 ? 1.8 : frame === 5 ? -0.7 : 0;
  softShadow(ctx, 32, 67, 21, 3.2, 0.23);
  ctx.save();
  ctx.translate(32, 66);
  ctx.scale(1, style.height);
  ctx.translate(-32, -66);
  ctx.translate(0, pose.bob);

  // Flowing back hair gives each princess a distinct, canonical silhouette.
  if (id === 'rosalina') {
    path(ctx, p => {
      p.moveTo(23, 12);
      p.bezierCurveTo(16, 17, 18, 35, 15, 43);
      p.bezierCurveTo(23, 47, 27, 39, 31, 39);
      p.bezierCurveTo(37, 46, 45, 47, 49, 40);
      p.bezierCurveTo(45, 28, 48, 16, 41, 11);
      p.closePath();
    }, linear(ctx, 22, 12, 42, 44, [[0, style.hair], [1, style.hairDark]]), INK, 1);
    strokePath(ctx, p => {
      p.moveTo(20, 20);
      p.bezierCurveTo(19, 30, 19, 36, 18, 40);
      p.moveTo(43, 19);
      p.bezierCurveTo(45, 29, 43, 35, 44, 40);
    }, rgba('#ffffff', 0.55), 1.1);
  } else if (id === 'peach') {
    path(ctx, p => {
      p.moveTo(23, 13);
      p.bezierCurveTo(18, 18, 19, 31, 17, 38);
      p.bezierCurveTo(22, 41, 25, 36, 26, 32);
      p.lineTo(38, 32);
      p.bezierCurveTo(39, 37, 43, 41, 47, 37);
      p.bezierCurveTo(45, 27, 47, 17, 41, 12);
      p.closePath();
    }, linear(ctx, 22, 13, 42, 39, [[0, '#ffe594'], [0.55, style.hair], [1, style.hairDark]]), INK, 1);
  } else {
    sphere(ctx, 32, 20, 12.5, 12, '#d98c50', style.hair, style.hairDark, INK, 1);
  }

  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    shoe(ctx, foot[0], Math.min(65, foot[1] + 0.5), style.shoe, 0.78, i === 0 ? -1 : 1);
  }

  for (const index of [1, 0]) {
    const shoulder = index === 0 ? [25, 35] : [39, 35];
    const elbow = pose.elbows[index];
    const hand = pose.hands[index];
    limb(ctx, shoulder[0], shoulder[1], elbow[0], elbow[1], 5.2, style.dressDark);
    limb(ctx, elbow[0], elbow[1], hand[0], hand[1], 4.6, SKIN);
    glove(ctx, hand[0], hand[1], 0.83, index === 0 ? -1 : 1);
  }

  // Full, softly flared skirt with shaded folds and a scalloped hem.
  path(ctx, p => {
    p.moveTo(26, 39);
    p.bezierCurveTo(24, 47, 19 + sway, 57, 19.5 + sway, 62.8);
    p.bezierCurveTo(24, 66.2, 28, 65.4, 32, 66);
    p.bezierCurveTo(37, 65.2, 42, 66.2, 45.5 + sway, 62.5);
    p.bezierCurveTo(45 + sway, 55, 41, 46, 38, 39);
    p.closePath();
  }, linear(ctx, 24, 39, 39, 66, [
    [0, style.dressLight], [0.32, style.dress], [0.78, style.dress], [1, style.dressDark]
  ]), INK, 1.1);
  path(ctx, p => {
    p.moveTo(37.5, 41);
    p.bezierCurveTo(40, 49, 43 + sway, 59, 43.5 + sway, 63.4);
    p.bezierCurveTo(39, 65.5, 36, 64.3, 32.5, 65.2);
    p.bezierCurveTo(36, 56, 34, 48, 32.5, 40);
    p.closePath();
  }, rgba(style.dressDark, 0.36), null);
  strokePath(ctx, p => {
    p.moveTo(28, 43);
    p.quadraticCurveTo(25, 54, 25 + sway, 62);
    p.moveTo(35.5, 43);
    p.quadraticCurveTo(38, 54, 38 + sway, 62.5);
    p.moveTo(31.8, 44);
    p.quadraticCurveTo(30.5, 54, 31, 64);
  }, rgba(style.dressDark, 0.42), 0.9);
  strokePath(ctx, p => {
    p.moveTo(21.8 + sway, 62.4);
    p.quadraticCurveTo(26, 65.5, 31.5, 64.6);
    p.quadraticCurveTo(37, 65.8, 43 + sway, 62.4);
  }, rgba('#ffffff', 0.6), 1.1);

  roundedRect(ctx, 25, 32.5, 14, 10, 4, linear(ctx, 25, 33, 39, 42, [
    [0, style.dressLight], [0.4, style.dress], [1, style.dressDark]
  ]), INK, 0.9);
  sphere(ctx, 20.7, 35.2, 4.1, 3.8, style.dressLight, style.dress, style.dressDark, INK, 0.85);
  sphere(ctx, 43.3, 35.2, 4.1, 3.8, style.dressLight, style.dress, style.dressDark, INK, 0.85);
  strokePath(ctx, p => {
    p.moveTo(27, 34);
    p.lineTo(29, 40.5);
    p.moveTo(37, 34);
    p.lineTo(35, 40.5);
  }, rgba('#ffffff', 0.62), 1.1);
  circle(ctx, 32, 36.2, 2.15, style.gem, INK, 0.65);
  shine(ctx, 31.4, 35.6, 0.7, 0.5, -0.3, 0.9);
  oval(ctx, 32, 31.8, 3.5, 2.5, SKIN, INK, 0, 0.75);

  // Face and front curls.
  sphere(ctx, 32, 23, 9.5, 10.1, '#ffe9c9', SKIN, SKIN_SHADE, INK, 1);
  if (id === 'peach') {
    sphere(ctx, 22.2, 27.5, 3.4, 6.1, '#ffe594', style.hair, style.hairDark, INK, 0.75);
    sphere(ctx, 41.8, 27.5, 3.4, 6.1, '#ffe594', style.hair, style.hairDark, INK, 0.75);
  } else if (id === 'daisy') {
    path(ctx, p => {
      p.moveTo(23, 18);
      p.bezierCurveTo(27, 12, 38, 12, 41, 19);
      p.quadraticCurveTo(37, 17, 34.5, 20);
      p.quadraticCurveTo(30, 16, 23, 21);
      p.closePath();
    }, style.hair, null);
  } else {
    path(ctx, p => {
      p.moveTo(23, 19);
      p.bezierCurveTo(28, 11, 39, 12, 42, 20);
      p.quadraticCurveTo(37, 17, 33, 20);
      p.quadraticCurveTo(29, 16.5, 23, 22);
      p.closePath();
    }, linear(ctx, 25, 14, 40, 21, [[0, '#fffdf0'], [1, style.hair]]), null);
  }
  eye(ctx, 28.6, 23, 2.75, 3.9, style.iris, 0.45, 0.2, true);
  eye(ctx, 35.6, 23, 2.75, 3.9, style.iris, 0.55, 0.2, true);
  brow(ctx, 25.8, 18.5, 31.2, 18.9, style.hairDark, 0.8, 0);
  brow(ctx, 32.8, 18.9, 38.3, 18.5, style.hairDark, 0.8, 0);
  sphere(ctx, 33.6, 26.1, 1.7, 1.45, '#ffe5bf', '#f2b98d', '#dfa078', null);
  path(ctx, p => {
    p.moveTo(30.8, 28.8);
    p.quadraticCurveTo(32.7, 30.3, 34.8, 28.7);
    p.quadraticCurveTo(32.8, 31.3, 30.8, 28.8);
  }, '#db6482', null);
  ctx.save();
  ctx.globalAlpha = 0.24;
  oval(ctx, 25.8, 27.1, 2, 1, '#ed7f96', null);
  oval(ctx, 38.1, 27.1, 2, 1, '#ed7f96', null);
  ctx.restore();

  if (id === 'peach') {
    crown(ctx, 32, 9.1, 0.88, '#ef5b91');
    circle(ctx, 21.6, 26.4, 1.55, '#61c8e9', INK, 0.5);
    circle(ctx, 42.4, 26.4, 1.55, '#61c8e9', INK, 0.5);
  } else if (id === 'daisy') {
    flower(ctx, 25.5, 12.2, 3.3, '#fffdf0', '#f5b333', -0.2);
    flower(ctx, 32, 10.4, 3.6, '#fffdf0', '#f5b333', 0.2);
    flower(ctx, 38.5, 12.2, 3.3, '#fffdf0', '#f5b333', -0.2);
  } else {
    crown(ctx, 32, 10.2, 0.8, '#67cbd4');
    circle(ctx, 32, 36.2, 1.1, '#fff1a0', null);
    const hand = pose.hands[1];
    line(ctx, hand[0], hand[1] + 2, hand[0] + 1, hand[1] - 8, '#d8b65d', 1.4);
    glow(ctx, hand[0] + 1, hand[1] - 9, 5, '#ffe678', 0.38);
    star(ctx, hand[0] + 1, hand[1] - 9, 4.2, 1.9, '#ffe477', INK, 5, -Math.PI / 2);
  }
  ctx.restore();
}

function drawToad(ctx, id, frame) {
  const pink = id === 'toadette';
  const cap = pink ? '#ef77b8' : '#ec4a40';
  const capDark = pink ? '#c6488d' : '#b92c32';
  const accent = pink ? '#ee72b5' : '#3d80cf';
  const pose = heroPose(frame);
  softShadow(ctx, 32, 67, 18, 3, 0.22);
  ctx.save();
  ctx.translate(0, pose.bob);

  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    limb(ctx, i === 0 ? 27 : 37, 50, foot[0], foot[1] - 2, 5.3, SKIN_SHADE);
    shoe(ctx, foot[0], foot[1] - 0.5, '#805037', 0.68, i === 0 ? -1 : 1);
  }
  for (const index of [1, 0]) {
    const shoulder = index === 0 ? [25, 37] : [39, 37];
    const hand = pose.hands[index];
    limb(ctx, shoulder[0], shoulder[1], hand[0], hand[1], 4.8, SKIN);
    glove(ctx, hand[0], hand[1], 0.67, index === 0 ? -1 : 1);
  }

  if (pink) {
    path(ctx, p => {
      p.moveTo(26, 39);
      p.quadraticCurveTo(21, 51, 20, 60);
      p.quadraticCurveTo(32, 65, 44, 60);
      p.quadraticCurveTo(43, 50, 38, 39);
      p.closePath();
    }, linear(ctx, 24, 39, 39, 63, [[0, '#ffc0dc'], [0.45, '#ef79b9'], [1, capDark]]), INK, 1);
    strokePath(ctx, p => {
      p.moveTo(27, 44);
      p.quadraticCurveTo(25, 53, 25, 59);
      p.moveTo(37, 44);
      p.quadraticCurveTo(39, 53, 39, 59);
    }, rgba('#ffffff', 0.48), 1);
    for (const [x, y] of [[27, 48], [36, 52], [29, 57]]) circle(ctx, x, y, 1, '#fff2a7', null);
  } else {
    roundedRect(ctx, 24, 37, 16, 16, 5.5, linear(ctx, 24, 37, 40, 53, [
      [0, '#fffdf3'], [1, '#dfe5e9']
    ]), INK, 0.9);
    roundedRect(ctx, 24.5, 39, 4, 13.5, 2, accent, null);
    roundedRect(ctx, 35.5, 39, 4, 13.5, 2, accent, null);
    circle(ctx, 28.5, 42, 1.15, '#ffda4c', null);
    circle(ctx, 35.5, 42, 1.15, '#ffda4c', null);
  }

  sphere(ctx, 32, 24.5, 9.2, 8.6, '#ffe8c7', SKIN, SKIN_SHADE, INK, 1);
  eye(ctx, 28.7, 23.4, 2.45, 3.6, '#342d43', 0.55, 0.25);
  eye(ctx, 35.4, 23.4, 2.45, 3.6, '#342d43', 0.55, 0.25);
  sphere(ctx, 34.2, 26.7, 2.25, 1.75, '#ffe3bd', '#f1b386', '#d99670', null);
  smile(ctx, 31.5, 29.1, 3.5, '#a4534e');
  ctx.save();
  ctx.globalAlpha = 0.28;
  oval(ctx, 25.8, 27.3, 1.9, 0.9, '#ef8290', null);
  oval(ctx, 38.2, 27.3, 1.9, 0.9, '#ef8290', null);
  ctx.restore();

  if (pink) {
    sphere(ctx, 11.5, 21, 5.8, 6.4, '#ffacd3', cap, capDark, INK, 0.9);
    sphere(ctx, 52.5, 21, 5.8, 6.4, '#ffacd3', cap, capDark, INK, 0.9);
    flower(ctx, 12, 15.4, 2.5, '#fff2a0', '#f5a83b', 0.2);
    flower(ctx, 52, 15.4, 2.5, '#fff2a0', '#f5a83b', -0.2);
  }

  path(ctx, p => {
    p.moveTo(13.4, 18.3);
    p.bezierCurveTo(13.8, 5.7, 21.5, 2.4, 32.1, 2.8);
    p.bezierCurveTo(43.4, 2.3, 50.6, 7.2, 50.7, 18.4);
    p.bezierCurveTo(45, 21.3, 38, 21.5, 32, 20.7);
    p.bezierCurveTo(25.2, 21.7, 19, 21.2, 13.4, 18.3);
    p.closePath();
  }, radial(ctx, 27, 7, 27, [
    [0, pink ? '#ffb3d9' : '#ff8974'], [0.42, cap], [1, capDark]
  ]), INK, 1.15);
  path(ctx, p => {
    p.moveTo(14.2, 17.3);
    p.quadraticCurveTo(32, 22.8, 49.9, 17.3);
    p.lineTo(48.8, 20.5);
    p.quadraticCurveTo(32, 24.2, 15.2, 20.5);
    p.closePath();
  }, capDark, INK, 0.75);
  const spots = pink
    ? [[23, 8, 4.4, 3.4, -0.25], [38, 7.5, 4.2, 3.5, 0.2], [31.8, 14.8, 3.2, 2.5, 0], [17, 16, 2.4, 1.8, -0.3], [46.5, 15.8, 2.4, 1.8, 0.3]]
    : [[22.5, 8.2, 4.4, 3.5, -0.25], [38.2, 7.8, 4.3, 3.6, 0.2], [32, 15, 3.3, 2.6, 0], [17.2, 16.1, 2.5, 1.9, -0.3], [46.5, 16, 2.5, 1.9, 0.3]];
  for (const [x, y, rx, ry, rotation] of spots) {
    oval(ctx, x, y, rx, ry, '#fffdf3', null, rotation);
    shine(ctx, x - rx * 0.25, y - ry * 0.3, rx * 0.42, ry * 0.22, rotation, 0.65);
  }
  shine(ctx, 25, 5.6, 5.5, 1.1, -0.35, 0.38);
  ctx.restore();
}

function drawYoshi(ctx, frame) {
  const pose = heroPose(frame);
  softShadow(ctx, 31, 67, 21, 3.4, 0.24);
  ctx.save();
  ctx.translate(0, pose.bob);

  // Tail and red shell sit behind the rounded dinosaur body.
  path(ctx, p => {
    p.moveTo(20, 39);
    p.bezierCurveTo(11, 36, 7, 40, 8.5, 46);
    p.bezierCurveTo(13, 49, 18, 45, 23, 44);
    p.closePath();
  }, linear(ctx, 9, 39, 22, 47, [[0, '#77d657'], [1, '#329345']]), INK, 1);
  oval(ctx, 23.5, 37.5, 11.3, 12.2, '#f6efcf', INK, -0.12, 1.1);
  oval(ctx, 23, 36.5, 9.8, 10.6, radial(ctx, 20, 31, 17, [
    [0, '#ff8060'], [0.5, '#e54b3e'], [1, '#ac3037']
  ]), INK, 0, 0.9);
  for (const [x, y] of [[18, 32], [24, 30], [28.5, 35], [20, 39], [26, 41]]) {
    circle(ctx, x, y, 1.55, '#fff4d8', null);
  }

  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    limb(ctx, i === 0 ? 27 : 36, 48, foot[0], foot[1] - 3, 7, '#42ad49');
    shoe(ctx, foot[0], foot[1] - 0.3, '#ef8a32', 0.94, i === 0 ? -1 : 1);
  }
  for (const index of [1, 0]) {
    const hand = pose.hands[index];
    limb(ctx, index === 0 ? 30 : 38, 38, hand[0], hand[1], 5.1, '#45b54a');
    glove(ctx, hand[0], hand[1], 0.7, index === 0 ? -1 : 1);
  }
  sphere(ctx, 31, 40, 12.3, 12.5, '#8be064', '#50bd4b', '#2c8c41', INK, 1.1);
  oval(ctx, 33, 44, 7.6, 8.2, linear(ctx, 29, 38, 38, 51, [
    [0, '#fffce9'], [1, '#e5e5c8']
  ]), INK, 0, 0.75);
  strokePath(ctx, p => {
    p.moveTo(29.4, 48);
    p.quadraticCurveTo(33, 50, 36.5, 48);
  }, '#d4cfae', 0.7);

  // Long neck, oversized snout, and tall white eyes are Yoshi's key reads.
  path(ctx, p => {
    p.moveTo(29, 37);
    p.bezierCurveTo(28, 27, 29, 18, 34, 15);
    p.bezierCurveTo(40, 12, 45, 18, 44, 27);
    p.lineTo(40, 40);
    p.closePath();
  }, linear(ctx, 31, 16, 41, 39, [[0, '#82dc5b'], [0.5, '#4dbb49'], [1, '#2b9140']]), INK, 1);
  sphere(ctx, 37.3, 19.3, 10.4, 8.7, '#91e16a', '#53bf4d', '#2e9341', INK, 1.05);
  sphere(ctx, 42.5, 24, 9.7, 6.7, '#a0e874', '#61c953', '#369342', INK, 1);
  oval(ctx, 33.7, 11.3, 3.8, 5.9, '#fffef3', INK, -0.12, 0.9);
  oval(ctx, 41.8, 10.8, 3.8, 6.1, '#fffef3', INK, 0.1, 0.9);
  oval(ctx, 34.6, 11.5, 1.65, 2.8, '#343044', null);
  oval(ctx, 42.6, 11, 1.65, 2.8, '#343044', null);
  circle(ctx, 34.1, 10.5, 0.55, '#ffffff', null);
  circle(ctx, 42.1, 10, 0.55, '#ffffff', null);
  circle(ctx, 45.2, 21.8, 0.9, '#27783a', null);
  circle(ctx, 49.2, 22.5, 0.8, '#27783a', null);
  smile(ctx, 44.5, 27.2, 4.1, '#286f38');
  shine(ctx, 38.2, 15.7, 3.4, 0.85, -0.25, 0.45);
  ctx.restore();
}

function drawGoombella(ctx, frame) {
  const pose = heroPose(frame);
  softShadow(ctx, 32, 67, 19, 3, 0.23);
  ctx.save();
  ctx.translate(0, pose.bob);
  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    shoe(ctx, foot[0], foot[1] - 0.5, '#9b6037', 0.76, i === 0 ? -1 : 1);
  }
  for (const index of [1, 0]) {
    const hand = pose.hands[index];
    limb(ctx, index === 0 ? 24 : 40, 39, hand[0], hand[1], 4.8, '#b77748');
    glove(ctx, hand[0], hand[1], 0.72, index === 0 ? -1 : 1);
  }
  path(ctx, p => {
    p.moveTo(26, 38);
    p.quadraticCurveTo(22, 49, 20.5, 59);
    p.quadraticCurveTo(32, 64, 43.5, 59);
    p.quadraticCurveTo(42, 49, 38, 38);
    p.closePath();
  }, linear(ctx, 25, 38, 40, 63, [[0, '#ffb0cf'], [0.45, '#eb7ba8'], [1, '#bf4d83']]), INK, 1);
  strokePath(ctx, p => {
    p.moveTo(27, 43);
    p.quadraticCurveTo(25, 51, 25, 58);
    p.moveTo(37, 43);
    p.quadraticCurveTo(39, 51, 39, 58);
  }, rgba('#ffffff', 0.48), 1);
  circle(ctx, 32, 42, 1.6, '#ffd65a', null);

  // Blonde pigtails and the pink side bow.
  sphere(ctx, 13.5, 20.5, 6.2, 7.3, '#fff19a', '#f1cd5b', '#c99c36', INK, 0.9);
  sphere(ctx, 50.5, 20.5, 6.2, 7.3, '#fff19a', '#f1cd5b', '#c99c36', INK, 0.9);
  line(ctx, 17.5, 18, 20, 20, '#e5a93d', 2);
  line(ctx, 46.5, 18, 44, 20, '#e5a93d', 2);

  sphere(ctx, 32, 23.5, 12.2, 11, '#ffdfad', '#f2c58e', '#d49a65', INK, 1.05);
  path(ctx, p => {
    p.moveTo(17.7, 22.8);
    p.bezierCurveTo(17.2, 8.2, 24, 4.8, 32.1, 5.2);
    p.bezierCurveTo(41, 4.5, 47.3, 9.8, 46.4, 23.4);
    p.bezierCurveTo(40, 26.5, 37, 23.5, 32, 24.4);
    p.bezierCurveTo(26.5, 23.2, 22, 26.3, 17.7, 22.8);
    p.closePath();
  }, radial(ctx, 27, 9, 24, [[0, '#d69a5b'], [0.55, '#a9633c'], [1, '#78412f']]), INK, 1.1);
  path(ctx, p => {
    p.moveTo(18.4, 21.6);
    p.quadraticCurveTo(32, 27.2, 45.7, 21.4);
    p.lineTo(44.5, 24.1);
    p.quadraticCurveTo(32, 29.3, 19.5, 24.2);
    p.closePath();
  }, '#7f4631', INK, 0.7);
  eye(ctx, 28.3, 23.6, 2.85, 3.7, '#654332', 0.5, 0.3);
  eye(ctx, 36, 23.6, 2.85, 3.7, '#654332', 0.5, 0.3);
  brow(ctx, 25.5, 19.6, 31, 20.2, '#623725', 1, -0.3);
  brow(ctx, 33, 20.2, 38.6, 19.6, '#623725', 1, -0.3);
  sphere(ctx, 33.4, 27.2, 2.2, 1.65, '#ffe0b0', '#efba84', '#d79b6c', null);
  path(ctx, p => {
    p.moveTo(27.4, 29.2);
    p.quadraticCurveTo(32, 33.5, 37, 29.1);
    p.quadraticCurveTo(32, 31.4, 27.4, 29.2);
  }, '#713b35', null);
  roundedRect(ctx, 29.6, 29.4, 2.4, 3.2, 0.7, '#fffced', INK, 0.45);
  roundedRect(ctx, 32.3, 29.4, 2.4, 3.2, 0.7, '#fffced', INK, 0.45);
  path(ctx, p => {
    p.moveTo(44.8, 8.8);
    p.bezierCurveTo(49, 4.4, 53.5, 7.6, 50.3, 12.3);
    p.bezierCurveTo(54, 15.7, 48.7, 19, 45.1, 14.4);
    p.bezierCurveTo(41.2, 16.9, 39.6, 10.3, 44.8, 8.8);
    p.closePath();
  }, linear(ctx, 43, 7, 51, 17, [[0, '#ffafd0'], [1, '#dc5b98']]), INK, 0.8);
  circle(ctx, 46.4, 12.1, 1.7, '#ffd85f', INK, 0.45);
  ctx.restore();
}

function shellSpike(ctx, x, y, flip = 1) {
  polygon(ctx, [[x - 3.5 * flip, y + 3], [x - 1 * flip, y - 4], [x + 3.6 * flip, y + 2.5]],
    linear(ctx, x, y - 4, x, y + 3, [[0, '#fffef1'], [1, '#c9d6d5']]), INK, 0.8);
}

function drawBowserJr(ctx, frame) {
  const pose = heroPose(frame);
  softShadow(ctx, 32, 67, 21, 3.2, 0.25);
  ctx.save();
  ctx.translate(0, pose.bob);
  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    limb(ctx, i === 0 ? 27 : 37, 49, foot[0], foot[1] - 3, 6.2, '#dc852d');
    shoe(ctx, foot[0], foot[1] - 0.5, '#ee9636', 0.78, i === 0 ? -1 : 1);
  }

  oval(ctx, 31, 40, 14.3, 14.7, '#f4e9c7', INK, -0.08, 1.1);
  sphere(ctx, 30, 38.5, 12.8, 13.4, '#8bd05c', '#47a644', '#25753b', INK, 1.05);
  for (const [x, y, flip] of [[20, 28, -1], [29, 24, 1], [39, 27, 1], [18, 38, -1], [43, 39, 1]]) {
    shellSpike(ctx, x, y, flip);
  }
  strokePath(ctx, p => {
    p.moveTo(21, 34);
    p.quadraticCurveTo(31, 29, 40, 35);
    p.moveTo(20, 41);
    p.quadraticCurveTo(31, 48, 42, 41);
  }, rgba('#1f6c38', 0.6), 1.1);

  for (const index of [1, 0]) {
    const hand = pose.hands[index];
    limb(ctx, index === 0 ? 25 : 39, 39, hand[0], hand[1], 5.3, '#ed9636');
    circle(ctx, hand[0], hand[1], 3.1, '#f5aa48', INK, 0.8);
  }
  sphere(ctx, 32, 43, 9.5, 11.2, '#ffc66d', '#f3a343', '#d77d2d', INK, 1);
  oval(ctx, 32, 48, 6.4, 5.8, '#ffe9b2', INK, 0, 0.7);

  sphere(ctx, 32, 23, 13.2, 11.5, '#ffc36b', '#f2a044', '#d77b2e', INK, 1.1);
  sphere(ctx, 39, 27, 9.2, 6.2, '#ffd17c', '#f5aa4c', '#da812f', INK, 0.95);
  polygon(ctx, [[20, 15], [16.5, 5.5], [26, 12]], '#fff5d9', INK, 0.85);
  polygon(ctx, [[43, 14], [47, 5.5], [38.5, 11]], '#fff5d9', INK, 0.85);
  path(ctx, p => {
    p.moveTo(26, 13);
    p.quadraticCurveTo(27, 4, 31.5, 3.3);
    p.quadraticCurveTo(31.3, 8, 35, 7);
    p.quadraticCurveTo(36.5, 3.5, 39, 5);
    p.quadraticCurveTo(38, 11, 41, 15);
    p.closePath();
  }, linear(ctx, 29, 4, 39, 16, [[0, '#ff7660'], [1, '#bd3034']]), INK, 0.85);
  eye(ctx, 28.4, 21.8, 3, 4.1, '#4b7f43', 0.65, 0.2);
  eye(ctx, 36.1, 21.4, 3, 4.1, '#4b7f43', 0.65, 0.2);
  brow(ctx, 25, 17.1, 31, 18.5, '#773c27', 1.3, -0.4);
  brow(ctx, 33, 18.3, 39, 16.8, '#773c27', 1.3, -0.4);
  circle(ctx, 41.5, 24.8, 0.8, '#a95c2d', null);
  circle(ctx, 45.3, 25.2, 0.8, '#a95c2d', null);
  smile(ctx, 40, 29, 3.5, '#9c4d2e');

  path(ctx, p => {
    p.moveTo(24, 32);
    p.quadraticCurveTo(32, 35.5, 40, 32);
    p.lineTo(41, 38);
    p.quadraticCurveTo(32, 41, 23, 38);
    p.closePath();
  }, '#318a70', INK, 0.8);
  polygon(ctx, [[27, 35], [30, 37.5], [33, 35.2], [35.5, 37.5], [38, 35]], '#fff8dc', null);
  ctx.restore();
}

function drawHero(ctx, id, frame) {
  if (['peach', 'daisy', 'rosalina'].includes(id)) drawPrincess(ctx, id, frame);
  else if (id === 'toad' || id === 'toadette') drawToad(ctx, id, frame);
  else if (id === 'yoshi') drawYoshi(ctx, frame);
  else if (id === 'goombella') drawGoombella(ctx, frame);
  else if (id === 'bowserjr') drawBowserJr(ctx, frame);
  else drawHuman(ctx, id, frame);
}

function enemyFeet(ctx, frame, color, scale = 1) {
  const positions = frame === 0 ? [[15, 42], [32, 42]] : [[12.5, 42], [35, 40.5]];
  for (let i = 0; i < 2; i++) {
    oval(ctx, positions[i][0], positions[i][1], 6.2 * scale, 3.1 * scale,
      linear(ctx, positions[i][0], positions[i][1] - 3, positions[i][0], positions[i][1] + 3,
        [[0, color], [1, '#9b633c']]), INK, i === 0 ? -0.06 : 0.06, 0.9);
  }
}

function drawKoopa(ctx, frame, yOffset = 0) {
  ctx.save();
  ctx.translate(0, yOffset);
  softShadow(ctx, 23, 45, 18, 2.7, 0.24);
  enemyFeet(ctx, frame, '#f3c651');
  oval(ctx, 20, 29, 15.3, 14.2, '#f6e6ad', INK, -0.08, 1.1);
  path(ctx, p => {
    p.moveTo(7, 30);
    p.bezierCurveTo(6.8, 15.5, 14.5, 10, 21.5, 10.5);
    p.bezierCurveTo(30.5, 9.5, 35.5, 17.8, 34.3, 31);
    p.quadraticCurveTo(21, 38.5, 7, 30);
    p.closePath();
  }, radial(ctx, 17, 16, 23, [[0, '#9ee56c'], [0.42, '#46b955'], [1, '#217a40']]), INK, 1.05);
  path(ctx, p => {
    p.moveTo(21.5, 11);
    p.lineTo(26.5, 18);
    p.lineTo(22, 25);
    p.lineTo(22.5, 33);
    p.moveTo(10, 22);
    p.lineTo(17, 18);
    p.lineTo(22, 25);
    p.lineTo(30, 23);
    p.lineTo(34, 30);
    p.moveTo(9, 30);
    p.lineTo(15, 26);
  }, null, '#1d713c', 1);
  shine(ctx, 14, 15.5, 5.2, 1.3, -0.45, 0.42);
  sphere(ctx, 31.5, 20.3, 8.7, 8.8, '#fff08a', '#f2cd54', '#d39b35', INK, 1);
  sphere(ctx, 37.4, 23.3, 6.3, 4.5, '#ffe993', '#f3ca55', '#d69e33', INK, 0.85);
  eye(ctx, 31.3, 18.2, 2.7, 3.6, '#39434a', 0.5, 0.3);
  eye(ctx, 36.7, 18, 2.6, 3.5, '#39434a', 0.5, 0.3);
  brow(ctx, 28.8, 14.7, 33.3, 15.2, '#80552e', 0.9, -0.2);
  circle(ctx, 41.7, 21.8, 0.65, '#9a652f', null);
  smile(ctx, 38.7, 25.2, 2.4, '#996136');
  ctx.restore();
}

function drawEnemy(ctx, kind, frame) {
  if (kind === 'goomba') {
    softShadow(ctx, 24, 45, 18, 2.8, 0.24);
    sphere(ctx, 24, 28, 11.8, 11.8, '#f5d4a0', '#dfb77f', '#bd875a', INK, 1.05);
    enemyFeet(ctx, frame, '#b87945');
    path(ctx, p => {
      p.moveTo(7.5, 25.5);
      p.bezierCurveTo(7, 10.2, 14.7, 5.2, 24, 5.5);
      p.bezierCurveTo(33.5, 4.7, 41.3, 11.5, 40.5, 25.8);
      p.bezierCurveTo(35, 29.5, 29.5, 26.5, 24, 27.4);
      p.bezierCurveTo(18.5, 26.4, 12.8, 29.6, 7.5, 25.5);
      p.closePath();
    }, radial(ctx, 19, 11, 22, [[0, '#d39458'], [0.48, '#a9633b'], [1, '#75412f']]), INK, 1.1);
    path(ctx, p => {
      p.moveTo(8, 24);
      p.quadraticCurveTo(24, 30.5, 40.2, 24);
      p.lineTo(39, 28);
      p.quadraticCurveTo(24, 33, 9.2, 28);
      p.closePath();
    }, '#77432f', INK, 0.7);
    eye(ctx, 19.4, 23.8, 3, 4, '#fffdf2', 0.6, 0.25);
    eye(ctx, 28.6, 23.8, 3, 4, '#fffdf2', 0.6, 0.25);
    oval(ctx, 20.1, 24.1, 1.4, 2.3, '#3b2a2c', null);
    oval(ctx, 29.3, 24.1, 1.4, 2.3, '#3b2a2c', null);
    brow(ctx, 16.2, 19.7, 22.2, 21.3, '#542e28', 1.35, -0.5);
    brow(ctx, 25.8, 21.3, 31.8, 19.7, '#542e28', 1.35, -0.5);
    path(ctx, p => {
      p.moveTo(18.5, 29.5);
      p.quadraticCurveTo(24, 33, 29.5, 29.5);
    }, null, '#5c302b', 1.2);
    polygon(ctx, [[19, 30], [21.2, 30], [20.2, 33]], '#fff9e7', null);
    polygon(ctx, [[27, 30], [29.2, 30], [28.1, 33]], '#fff9e7', null);
    shine(ctx, 16.5, 12.5, 4.8, 1.1, -0.45, 0.3);
  } else if (kind === 'koopa') {
    drawKoopa(ctx, frame);
  } else if (kind === 'paratroopa') {
    const lift = frame === 0 ? 0 : -2;
    ctx.save();
    ctx.translate(0, lift);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(21, 24);
      ctx.scale(side, 1);
      path(ctx, p => {
        p.moveTo(0, 0);
        p.bezierCurveTo(-5, -15, -19, -18, -21, -8);
        p.quadraticCurveTo(-13, -5, -17, 2);
        p.quadraticCurveTo(-7, 4, 0, 8);
        p.closePath();
      }, linear(ctx, -20, -15, 0, 8, [[0, '#ffffff'], [0.65, '#f4f7ef'], [1, '#b8d7d4']]), INK, 1);
      strokePath(ctx, p => {
        p.moveTo(-17, -9);
        p.quadraticCurveTo(-8, -5, -2, 4);
        p.moveTo(-13, -12);
        p.lineTo(-10, 0);
      }, '#9fbdbb', 0.75);
      ctx.restore();
    }
    drawKoopa(ctx, frame);
    ctx.restore();
  } else if (kind === 'shell') {
    softShadow(ctx, 24, 44, 20, 3, 0.24);
    oval(ctx, 24, 32.5, 19, 8, '#f2e6bf', INK, 0, 1.05);
    path(ctx, p => {
      p.moveTo(5, 31);
      p.bezierCurveTo(5, 15, 13, 7.5, 24, 7.8);
      p.bezierCurveTo(35, 7.3, 43, 16, 43, 31.5);
      p.quadraticCurveTo(24, 41, 5, 31);
      p.closePath();
    }, radial(ctx, 18, 13, 26, [[0, '#a4e875'], [0.45, '#49b956'], [1, '#207740']]), INK, 1.1);
    path(ctx, p => {
      p.moveTo(24, 9);
      p.lineTo(29, 17);
      p.lineTo(24, 25);
      p.lineTo(24, 34);
      p.moveTo(9, 22);
      p.lineTo(17, 18);
      p.lineTo(24, 25);
      p.lineTo(33, 20);
      p.lineTo(40, 27);
      p.moveTo(7, 31);
      p.lineTo(15, 27);
    }, null, '#1f713c', 1.2);
    oval(ctx, 24, 34, 12.2, 4.7, frame === 0 ? '#d84a43' : '#b63b3c', INK, 0, 0.8);
    shine(ctx, 14, 14.5, 5.5, 1.4, -0.5, 0.42);
  } else if (kind === 'spiny') {
    softShadow(ctx, 24, 45, 19, 2.8, 0.24);
    polygon(ctx, [[11, 31], [3, 37], [12, 36]], '#e9d2a0', INK, 0.8);
    for (const [x, y, flip] of [[11, 20, -1], [17, 14, -1], [25, 11, 1], [32, 14, 1], [38, 21, 1]]) {
      shellSpike(ctx, x, y, flip);
    }
    sphere(ctx, 24, 28, 15.5, 12.5, '#ff8870', '#e55045', '#ac3039', INK, 1.1);
    enemyFeet(ctx, frame, '#f1cc75');
    sphere(ctx, 24, 33, 9, 7.3, '#fff0b0', '#e8c873', '#c29c50', INK, 0.85);
    eye(ctx, 20.2, 31.7, 2.6, 3.4, '#fffdf2', 0.5, 0.2);
    eye(ctx, 27.8, 31.7, 2.6, 3.4, '#fffdf2', 0.5, 0.2);
    oval(ctx, 21, 32, 1.15, 2, '#382b35', null);
    oval(ctx, 28.6, 32, 1.15, 2, '#382b35', null);
    brow(ctx, 17.4, 28.2, 22.5, 29.4, '#71392f', 1.1, -0.4);
    brow(ctx, 25.5, 29.4, 30.6, 28.2, '#71392f', 1.1, -0.4);
    smile(ctx, 24, 36, 2.5, '#9b6543');
  } else if (kind === 'beetle') {
    softShadow(ctx, 24, 45, 18, 2.6, 0.23);
    enemyFeet(ctx, frame, '#edc45b');
    sphere(ctx, 23, 26, 16.8, 13.2, '#91a9f5', '#536dcc', '#2d3d88', INK, 1.1);
    line(ctx, 23, 13.5, 23, 38.5, '#263879', 1.15);
    strokePath(ctx, p => {
      p.moveTo(9, 21);
      p.quadraticCurveTo(16, 18, 23, 23);
      p.moveTo(23, 23);
      p.quadraticCurveTo(30, 18, 38, 22);
      p.moveTo(9, 30);
      p.quadraticCurveTo(16, 27, 23, 31);
      p.moveTo(23, 31);
      p.quadraticCurveTo(30, 27, 38, 30);
    }, '#344c9b', 0.9);
    sphere(ctx, 34, 28.5, 7.5, 6.3, '#778fe0', '#425db2', '#293b80', INK, 0.9);
    polygon(ctx, [[32, 23], [36, 14], [36.5, 25]], '#e8d392', INK, 0.8);
    eye(ctx, 33, 27, 2.2, 2.8, '#fffdf2', 0.4, 0.2);
    eye(ctx, 37.3, 27.5, 1.9, 2.4, '#fffdf2', 0.4, 0.2);
    shine(ctx, 15, 18.5, 5.2, 1.3, -0.4, 0.42);
  } else if (kind === 'piranha') {
    softShadow(ctx, 24, 45, 15, 2.2, 0.2);
    path(ctx, p => {
      p.moveTo(21, 20);
      p.bezierCurveTo(20, 29, 22, 37, 22, 45);
      p.lineTo(27, 45);
      p.bezierCurveTo(28, 35, 26, 27, 27, 20);
      p.closePath();
    }, linear(ctx, 20, 20, 28, 45, [[0, '#8dd95e'], [1, '#2e8c43']]), INK, 1);
    path(ctx, p => {
      p.moveTo(23, 36);
      p.bezierCurveTo(12, 34, 9, 40, 10, 44);
      p.quadraticCurveTo(19, 43, 24, 40);
      p.closePath();
      p.moveTo(25, 32);
      p.bezierCurveTo(34, 29, 39, 34, 38, 39);
      p.quadraticCurveTo(30, 38, 25, 36);
      p.closePath();
    }, linear(ctx, 12, 30, 37, 44, [[0, '#86dc61'], [1, '#2b9345']]), INK, 0.9);
    const headY = frame === 0 ? 18 : 20;
    sphere(ctx, 24, headY, 15.5, 12.3, '#ff8b73', '#e94d45', '#b82f3c', INK, 1.1);
    for (const [x, y, r] of [[14, 12, 3.2], [29, 9.5, 3.5], [35, 16, 2.8], [22, 7.5, 2.4]]) {
      circle(ctx, x, y, r, '#fff4da', null);
    }
    const mouthH = frame === 0 ? 6.4 : 4.4;
    oval(ctx, 24, headY + 5, 10.8, mouthH, '#6d2536', INK, 0, 0.9);
    oval(ctx, 24, headY + 6.5, 7.3, 2.7, '#d86a68', null);
    for (const x of [17, 21, 27, 31]) {
      polygon(ctx, [[x, headY + 1], [x + 2.2, headY + 1], [x + 1.1, headY + 4.4]], '#fffced', null);
    }
    for (const x of [19, 25, 30]) {
      polygon(ctx, [[x, headY + 9.2], [x + 2.2, headY + 9.2], [x + 1.1, headY + 6.4]], '#fffced', null);
    }
    shine(ctx, 17, 10, 4.8, 1.1, -0.45, 0.38);
  } else if (kind === 'boo') {
    glow(ctx, 24, 22, 21, '#dcefff', 0.25);
    path(ctx, p => {
      p.moveTo(8, 23);
      p.bezierCurveTo(7, 7, 16, 3, 24, 4);
      p.bezierCurveTo(35, 2, 42, 10, 40, 24);
      p.lineTo(39, 33);
      p.quadraticCurveTo(34, 29, 31, 35);
      p.quadraticCurveTo(26, 30, 22, 36);
      p.quadraticCurveTo(17, 30, 13, 34);
      p.quadraticCurveTo(10, 30, 8, 33);
      p.closePath();
    }, radial(ctx, 19, 13, 23, [[0, '#ffffff'], [0.58, '#f5f8f5'], [1, '#c6dbe5']]), INK, 1.05);
    oval(ctx, 9, 25, 5, 3.2, '#f6fbf8', INK, -0.45, 0.8);
    oval(ctx, 39, 25, 5, 3.2, '#f6fbf8', INK, 0.45, 0.8);
    eye(ctx, 19, 18, 3.6, 5.1, '#34334c', 0.5, 0.4);
    eye(ctx, 29, 18, 3.6, 5.1, '#34334c', 0.5, 0.4);
    path(ctx, p => {
      p.moveTo(18.5, 27);
      p.quadraticCurveTo(24, frame === 0 ? 31 : 28, 29.5, 27);
      p.quadraticCurveTo(26, 34, 21.5, 30.5);
      p.closePath();
    }, '#4a3049', null);
    oval(ctx, 24.5, 29.5, 3, 1.6, '#ef8eae', null, 0.1);
    ctx.save();
    ctx.globalAlpha = 0.35;
    oval(ctx, 13.5, 24, 2.5, 1.2, '#f3a6c0', null);
    oval(ctx, 34.5, 24, 2.5, 1.2, '#f3a6c0', null);
    ctx.restore();
    shine(ctx, 16, 10, 4.5, 1.2, -0.5, 0.7);
  } else if (kind === 'hammerbro') {
    softShadow(ctx, 24, 45, 19, 2.8, 0.24);
    enemyFeet(ctx, frame, '#e8c25a');
    oval(ctx, 23, 31, 14, 12.5, '#f2e3b1', INK, 0, 1);
    sphere(ctx, 21, 29, 12.5, 12, '#8bd267', '#47a64c', '#26743e', INK, 1);
    sphere(ctx, 26, 29, 9.5, 11.8, '#ffe0a0', '#e8b878', '#c68d59', INK, 0.9);
    const hammerY = frame === 0 ? 10 : 12;
    limb(ctx, 11, 33, 9, hammerY + 7, 3.1, '#a66a3d');
    roundedRect(ctx, 1.5, hammerY, 17, 8.5, 3.5, linear(ctx, 2, hammerY, 17, hammerY + 9,
      [[0, '#eef3f5'], [0.35, '#aebbc6'], [1, '#65758a']]), INK, 0.95);
    shine(ctx, 6, hammerY + 2, 3.5, 0.8, -0.1, 0.65);
    limb(ctx, 30, 34, 38, 28, 5.5, '#e7b576');
    circle(ctx, 38.5, 27.5, 3.3, '#f0c485', INK, 0.8);
    sphere(ctx, 26, 19, 9, 8.3, '#ffe1a7', '#eab67b', '#c58a57', INK, 0.95);
    eye(ctx, 23.5, 18.8, 2.5, 3.2, '#3b3945', 0.4, 0.2);
    eye(ctx, 29.5, 18.8, 2.5, 3.2, '#3b3945', 0.4, 0.2);
    brow(ctx, 20.8, 15.5, 25.3, 16.2, '#70472f', 1, -0.4);
    brow(ctx, 27.2, 16.2, 31.8, 15.3, '#70472f', 1, -0.4);
    path(ctx, p => {
      p.moveTo(17, 13);
      p.quadraticCurveTo(26, 3, 35, 13);
      p.lineTo(34, 15);
      p.quadraticCurveTo(26, 9, 18, 15);
      p.closePath();
    }, linear(ctx, 20, 6, 32, 15, [[0, '#f5f8f4'], [1, '#9eb5c5']]), INK, 0.9);
    roundedRect(ctx, 22, 9.5, 9, 3, 1.2, '#52b9cf', INK, 0.5);
    shine(ctx, 22, 7.5, 4, 0.8, -0.25, 0.55);
  } else if (kind === 'bobomb') {
    softShadow(ctx, 24, 45, 18, 2.8, 0.28);
    enemyFeet(ctx, frame, '#f4bf3e');
    sphere(ctx, 24, 27, 13.2, 13.6, '#65728c', '#30394f', '#171b2c', INK, 1.15);
    oval(ctx, 16.5, 17.5, 4.8, 2.3, '#8894a9', null, -0.5);
    eye(ctx, 20.4, 26, 3, 4.1, '#fffdf2', 0.6, 0.3);
    eye(ctx, 28, 26, 3, 4.1, '#fffdf2', 0.6, 0.3);
    oval(ctx, 21.2, 26.4, 1.3, 2.2, '#222436', null);
    oval(ctx, 28.8, 26.4, 1.3, 2.2, '#222436', null);
    brow(ctx, 17.3, 21.8, 23.1, 23.2, '#171827', 1.2, -0.5);
    brow(ctx, 25, 23.2, 30.8, 21.6, '#171827', 1.2, -0.5);
    strokePath(ctx, p => {
      p.moveTo(20, 32);
      p.quadraticCurveTo(24, 34, 28, 32);
    }, '#101522', 1.1);
    strokePath(ctx, p => {
      p.moveTo(31, 15);
      p.bezierCurveTo(34, 12, 31, 9, 34, 7);
    }, '#bd9d62', 2.1);
    circle(ctx, 35, 10, 3.8, null, '#d8b96e', 1.7);
    line(ctx, 35, 6.2, 35, 13.8, '#d8b96e', 1.5);
    glow(ctx, 34, 5, 7, '#ffbf3f', 0.55);
    star(ctx, 34, 5, 4.2, 1.7, frame === 0 ? '#fff2a0' : '#ff9e35', null, 4, 0);
    shine(ctx, 15.5, 18, 4.5, 1, -0.55, 0.42);
  } else if (kind === 'drybones') {
    softShadow(ctx, 24, 45, 17, 2.5, 0.22);
    enemyFeet(ctx, frame, '#eee5cf');
    limb(ctx, 21, 28, 17, 38, 3.4, '#eee5cf');
    limb(ctx, 27, 28, 31, 38, 3.4, '#eee5cf');
    line(ctx, 24, 23, 24, 35, '#d7cbb8', 4);
    for (let i = 0; i < 4; i++) {
      strokePath(ctx, p => {
        p.moveTo(18.5, 26 + i * 2.5);
        p.quadraticCurveTo(24, 29 + i * 2.5, 29.5, 26 + i * 2.5);
      }, i % 2 ? '#c7baa8' : '#fff6df', 1.8);
    }
    sphere(ctx, 24, 15, 9.2, 8.6, '#fffdf0', '#e9e0cb', '#c6bba7', INK, 1);
    oval(ctx, 19.8, 15, 3.2, 3.9, '#393344', null, -0.12);
    oval(ctx, 28.2, 15, 3.2, 3.9, '#393344', null, 0.12);
    circle(ctx, 24, 19, 1.2, '#8b7c72', null);
    for (const x of [19.5, 22, 25.5, 28.5]) line(ctx, x, 20.5, x + 0.2, 23, '#9d8d80', 0.7);
    shine(ctx, 19.5, 9.5, 3.3, 0.9, -0.35, 0.65);
  } else if (kind === 'cheep') {
    glow(ctx, 24, 25, 20, '#ff9e61', 0.15);
    const tailY = frame === 0 ? 22 : 26;
    polygon(ctx, [[11, 25], [2, tailY - 8], [4, tailY + 8]], '#d8443f', INK, 1);
    sphere(ctx, 25, 25, 14.5, 10.5, '#ffb06d', '#f06447', '#c43b3c', INK, 1.05);
    path(ctx, p => {
      p.moveTo(17, 28);
      p.bezierCurveTo(22, 36, 32, 36, 36, 27);
      p.quadraticCurveTo(27, 31, 17, 28);
    }, '#ffe4b0', null);
    polygon(ctx, [[24, 15], [29, 7], [31, 16]], '#e85343', INK, 0.8);
    polygon(ctx, [[22, 31], [28, 37], [30, 30]], '#d94340', INK, 0.75);
    eye(ctx, 32, 21.5, 3.8, 4.4, '#fffdf3', 0.6, 0.3);
    oval(ctx, 33, 21.8, 1.7, 2.5, '#33303e', null);
    circle(ctx, 32.4, 20.7, 0.6, '#ffffff', null);
    oval(ctx, 39, 27, 2.6, 1.6, '#d64b48', INK, 0.05, 0.65);
    shine(ctx, 20, 18.5, 4.8, 1.1, -0.4, 0.42);
  } else if (kind === 'blooper') {
    glow(ctx, 24, 17, 19, '#d7f5ff', 0.2);
    sphere(ctx, 24, 17, 14.2, 12.8, '#ffffff', '#edf3ef', '#bdd4db', INK, 1.1);
    const tentacles = [[15, 25, 11, 36], [20, 27, 19, 39], [27, 27, 29, 39], [32, 25, 37, 35]];
    for (let i = 0; i < tentacles.length; i++) {
      const [x1, y1, x2, y2] = tentacles[i];
      const bend = frame === 0 ? (i - 1.5) * 1.5 : -(i - 1.5) * 1.5;
      strokePath(ctx, p => {
        p.moveTo(x1, y1);
        p.quadraticCurveTo((x1 + x2) / 2 + bend, y2 + 2, x2, y2);
      }, INK, 5.2);
      strokePath(ctx, p => {
        p.moveTo(x1, y1);
        p.quadraticCurveTo((x1 + x2) / 2 + bend, y2 + 2, x2, y2);
      }, linear(ctx, x1, y1, x2, y2, [[0, '#f8fbf5'], [1, '#d8e5e4']]), 3.8);
      oval(ctx, x2, y2, 2.1, 1.45, '#d6a5bd', null, bend * 0.1);
    }
    oval(ctx, 19.5, 16.5, 2.2, 4.2, '#373346', null, -0.08);
    oval(ctx, 28.5, 16.5, 2.2, 4.2, '#373346', null, 0.08);
    oval(ctx, 24, 23, 3.4, 2, '#b7809a', null);
    ctx.save();
    ctx.globalAlpha = 0.35;
    oval(ctx, 14.5, 21, 2.4, 1.1, '#efa6bd', null);
    oval(ctx, 33.5, 21, 2.4, 1.1, '#efa6bd', null);
    ctx.restore();
    shine(ctx, 17, 9.5, 4.2, 1.1, -0.45, 0.7);
  } else if (kind === 'bowserjr') {
    ctx.save();
    ctx.translate(3, 8);
    ctx.scale(0.58, 0.58);
    drawBowserJr(ctx, frame === 0 ? 0 : 2);
    ctx.restore();
  }
}

function addTexture(scene, key, element, frameW, frameH, frames = 1) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.addCanvas(key, element);
  for (let i = 0; i < frames; i++) texture.add(String(i), 0, i * frameW, 0, frameW, frameH);
}

export function generateHeroTextures(scene) {
  const portraits = [];
  for (const id of CHARACTER_ORDER) {
    const { element, ctx } = makeCanvas(HERO_W * 6 * 2, HERO_H * 2);
    for (let frame = 0; frame < 6; frame++) {
      ctx.save();
      ctx.scale(2, 2);
      ctx.translate(frame * HERO_W, 0);
      drawHero(ctx, id, frame);
      ctx.restore();
    }
    addTexture(scene, `hero_${id}`, element, HERO_W * 2, HERO_H * 2, 6);
    if (!scene.anims.exists(`${id}_idle`)) {
      scene.anims.create({
        key: `${id}_idle`,
        frames: [{ key: `hero_${id}`, frame: '0' }],
        frameRate: 1
      });
      scene.anims.create({
        key: `${id}_run`,
        frames: [1, 2, 3, 4].map(frame => ({ key: `hero_${id}`, frame: String(frame) })),
        frameRate: 12,
        repeat: -1
      });
      scene.anims.create({
        key: `${id}_jump`,
        frames: [{ key: `hero_${id}`, frame: '5' }],
        frameRate: 1
      });
    }
    const portrait = makeCanvas(128, 144);
    portrait.ctx.drawImage(element, 0, 0, 128, 144, 0, 0, 128, 144);
    portraits.push({
      id,
      dataUrl: portrait.element.toDataURL('image/png'),
      color: CHARACTER_STATS[id].color
    });
  }
  return portraits;
}

const ENEMY_KINDS = [
  'goomba', 'koopa', 'paratroopa', 'shell', 'spiny', 'beetle', 'piranha',
  'boo', 'hammerbro', 'bobomb', 'drybones', 'cheep', 'blooper', 'bowserjr'
];

export function generateEnemyTextures(scene) {
  for (const kind of ENEMY_KINDS) {
    const { element, ctx } = makeCanvas(ENEMY_SIZE * 4, ENEMY_SIZE * 2);
    for (let frame = 0; frame < 2; frame++) {
      ctx.save();
      ctx.translate(frame * ENEMY_SIZE * 2, 0);
      ctx.scale(2, 2);
      drawEnemy(ctx, kind, frame);
      ctx.restore();
    }
    addTexture(scene, `enemy_${kind}`, element, ENEMY_SIZE * 2, ENEMY_SIZE * 2, 2);
    if (!scene.anims.exists(`enemy_${kind}`)) {
      scene.anims.create({
        key: `enemy_${kind}`,
        frames: [0, 1].map(frame => ({ key: `enemy_${kind}`, frame: String(frame) })),
        frameRate: ['boo', 'cheep', 'blooper'].includes(kind) ? 5 : 8,
        repeat: -1
      });
    }
  }
}

function drawCoin(ctx) {
  glow(ctx, 16, 16, 14, '#ffd044', 0.28);
  softShadow(ctx, 16, 29, 8, 1.6, 0.24);
  oval(ctx, 16, 15.8, 9.2, 12.6, '#b97a24', INK, 0, 1.15);
  oval(ctx, 16, 15.3, 7.8, 11.1, linear(ctx, 10, 5, 22, 26, [
    [0, '#fff3a0'], [0.28, '#ffdc4d'], [0.68, '#f5b62d'], [1, '#cd8420']
  ]), '#8e5a20', 0, 0.85);
  oval(ctx, 16, 15.2, 5.7, 8.9, null, '#e2a52d', 0, 1);
  roundedRect(ctx, 14.6, 8.4, 2.8, 13.7, 1.4, '#d79a27', '#a66c20', 0.65);
  roundedRect(ctx, 15.2, 8.9, 0.9, 11.8, 0.45, '#ffe983', null);
  shine(ctx, 11.8, 9.1, 1.3, 3.4, 0.2, 0.75);
}

function drawMushroom(ctx, oneUp) {
  const cap = oneUp ? '#48bd58' : '#ee4b42';
  const dark = oneUp ? '#258344' : '#b92c35';
  const light = oneUp ? '#a0e87c' : '#ff9980';
  softShadow(ctx, 16, 29, 10, 1.8, 0.22);
  sphere(ctx, 16, 20, 8.2, 8.8, '#fff4d8', '#f3d5a5', '#cfa67c', INK, 1);
  path(ctx, p => {
    p.moveTo(5.4, 16.3);
    p.bezierCurveTo(5, 5, 10.3, 1.9, 16.2, 2.1);
    p.bezierCurveTo(23.5, 1.4, 27.5, 6.5, 26.7, 16.5);
    p.quadraticCurveTo(16, 20.5, 5.4, 16.3);
    p.closePath();
  }, radial(ctx, 12, 6, 19, [[0, light], [0.42, cap], [1, dark]]), INK, 1.1);
  for (const [x, y, rx, ry] of [[10.5, 6.7, 3.4, 3], [21.3, 5.4, 3.6, 3.2], [16.4, 12, 2.8, 2.5], [7.2, 12.5, 2, 1.8], [24.4, 12.4, 2, 1.8]]) {
    oval(ctx, x, y, rx, ry, '#fffced', null);
  }
  eye(ctx, 13.1, 19, 1.65, 2.5, '#3a3040', 0.25, 0.2);
  eye(ctx, 19, 19, 1.65, 2.5, '#3a3040', 0.25, 0.2);
  smile(ctx, 16, 23, 2.1, '#9e654e');
  shine(ctx, 10.5, 4.8, 3.2, 0.85, -0.4, 0.45);
}

function drawFireFlower(ctx) {
  softShadow(ctx, 16, 29.5, 9, 1.6, 0.2);
  limb(ctx, 16, 14, 16, 28, 3.1, '#42a94c');
  path(ctx, p => {
    p.moveTo(15.5, 24);
    p.bezierCurveTo(8, 24, 6, 28, 7.5, 29.5);
    p.quadraticCurveTo(12.5, 29, 16, 26);
    p.moveTo(16.5, 22);
    p.bezierCurveTo(23, 21, 25.5, 25, 24.5, 27);
    p.quadraticCurveTo(20, 26, 16, 24);
  }, '#62c85a', INK, 0.8);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    oval(ctx, 16 + Math.cos(angle) * 6.2, 13 + Math.sin(angle) * 6.2, 5.1, 3.7,
      linear(ctx, 12, 7, 20, 18, [[0, '#ffb057'], [0.5, '#f16a35'], [1, '#c53c37']]), INK, angle, 0.7);
  }
  sphere(ctx, 16, 13, 5.6, 5.3, '#fff4a4', '#ffd454', '#e6a32e', INK, 0.9);
  eye(ctx, 14.1, 12.6, 1.3, 2, '#393043', 0.2, 0.15);
  eye(ctx, 18, 12.6, 1.3, 2, '#393043', 0.2, 0.15);
  smile(ctx, 16, 15.2, 1.7, '#9b5e38');
  shine(ctx, 13, 9.5, 1.7, 0.7, -0.4, 0.55);
}

function drawStarItem(ctx) {
  glow(ctx, 16, 16, 15, '#ffe36a', 0.36);
  softShadow(ctx, 16, 29.5, 9, 1.6, 0.2);
  path(ctx, p => starPath(p, 16, 16, 13.5, 6.2, 5, -Math.PI / 2),
    linear(ctx, 12, 3, 20, 28, [[0, '#fff5a4'], [0.38, '#ffdf4d'], [1, '#e9a828']]), INK, 1.1);
  eye(ctx, 13.2, 15.5, 1.35, 2.2, '#4c3c37', 0.2, 0.2);
  eye(ctx, 18.8, 15.5, 1.35, 2.2, '#4c3c37', 0.2, 0.2);
  smile(ctx, 16, 19.2, 2, '#9e693b');
  shine(ctx, 14, 7.7, 2.3, 0.85, -0.45, 0.75);
}

function drawBell(ctx) {
  softShadow(ctx, 16, 29, 9, 1.5, 0.22);
  circle(ctx, 16, 5.5, 3, null, '#b88124', 1.8);
  path(ctx, p => {
    p.moveTo(8, 20);
    p.bezierCurveTo(8.5, 17.5, 10.2, 15.5, 11, 11);
    p.quadraticCurveTo(16, 8.5, 21, 11);
    p.bezierCurveTo(21.8, 15.5, 23.5, 17.5, 24, 20);
    p.quadraticCurveTo(25, 24, 27, 25);
    p.quadraticCurveTo(16, 29, 5, 25);
    p.quadraticCurveTo(7, 24, 8, 20);
    p.closePath();
  }, linear(ctx, 8, 9, 24, 26, [[0, '#fff3a2'], [0.3, '#ffda4e'], [0.72, '#eeb231'], [1, '#b97822']]), INK, 1.05);
  path(ctx, p => {
    p.moveTo(8.3, 20);
    p.quadraticCurveTo(16, 23, 23.7, 20);
    p.quadraticCurveTo(24.5, 23, 26.5, 24.3);
    p.quadraticCurveTo(16, 28, 5.5, 24.3);
    p.quadraticCurveTo(7.5, 23, 8.3, 20);
  }, '#d59a29', INK, 0.65);
  circle(ctx, 16, 26, 2.5, '#9c6728', INK, 0.65);
  shine(ctx, 12.5, 12.5, 1.6, 4, 0.08, 0.62);
  shine(ctx, 17.8, 8.5, 3, 0.75, -0.1, 0.5);
}

function drawSeed(ctx) {
  glow(ctx, 16, 16, 14, '#75e4e5', 0.24);
  softShadow(ctx, 16, 29, 9, 1.5, 0.22);
  path(ctx, p => {
    p.moveTo(16, 8);
    p.bezierCurveTo(8, 8, 6, 17, 8.5, 24);
    p.bezierCurveTo(11, 30, 21, 30, 23.5, 24);
    p.bezierCurveTo(26, 17, 24, 8, 16, 8);
    p.closePath();
  }, radial(ctx, 12, 11, 19, [[0, '#b9fbef'], [0.36, '#68ddd8'], [1, '#2d9cb6']]), INK, 1.05);
  path(ctx, p => {
    p.moveTo(16, 8);
    p.bezierCurveTo(14, 3, 17, 1, 20, 1.8);
    p.bezierCurveTo(23, 4, 21, 7, 16, 8);
  }, '#69c85b', INK, 0.8);
  line(ctx, 16, 7, 19, 3, '#3d984d', 0.9);
  eye(ctx, 13.1, 17, 1.45, 2.1, '#244b5d', 0.2, 0.2);
  eye(ctx, 18.9, 17, 1.45, 2.1, '#244b5d', 0.2, 0.2);
  smile(ctx, 16, 21, 1.8, '#286f7b');
  shine(ctx, 11.5, 12, 1.6, 3.4, 0.18, 0.6);
}

function drawItem(ctx, type) {
  if (type === 'coin') drawCoin(ctx);
  else if (type === 'mushroom' || type === 'oneup') drawMushroom(ctx, type === 'oneup');
  else if (type === 'fireflower') drawFireFlower(ctx);
  else if (type === 'star') drawStarItem(ctx);
  else if (type === 'bell') drawBell(ctx);
  else if (type === 'seed') drawSeed(ctx);
}

function drawProjectile(ctx, type) {
  if (type === 'fire') {
    glow(ctx, 17, 16, 15, '#ff7b32', 0.5);
    path(ctx, p => {
      p.moveTo(15, 4);
      p.bezierCurveTo(20, 10, 13, 11, 19, 15);
      p.bezierCurveTo(28, 10, 30, 19, 23, 25);
      p.bezierCurveTo(14, 31, 4, 24, 6, 16);
      p.bezierCurveTo(7, 10, 11, 10, 11, 6);
      p.bezierCurveTo(14, 9, 12, 12, 15, 13);
      p.closePath();
    }, linear(ctx, 8, 5, 24, 27, [[0, '#fff3a0'], [0.35, '#ffd34e'], [0.72, '#ff8736'], [1, '#e84d2e']]), INK, 0.9);
    sphere(ctx, 18, 17, 6.8, 6.8, '#fff8ba', '#ffcf45', '#f17a2f', '#a9442c', 0.7);
    shine(ctx, 15.5, 14.4, 2.1, 1.2, -0.45, 0.85);
  } else if (type === 'bubble') {
    glow(ctx, 16, 16, 15, '#87e8ff', 0.32);
    circle(ctx, 16, 16, 11.4, radial(ctx, 12, 11, 16, [
      [0, rgba('#ffffff', 0.75)], [0.35, rgba('#a8efff', 0.28)], [0.78, rgba('#4db9df', 0.18)], [1, rgba('#3a8fc8', 0.5)]
    ]), '#3e98c4', 1.25);
    circle(ctx, 16, 16, 9.5, null, rgba('#ffffff', 0.75), 0.9);
    oval(ctx, 11.5, 10.5, 3.5, 1.6, '#ffffff', null, -0.55);
    circle(ctx, 21.5, 21, 1.3, rgba('#ffffff', 0.8), null);
  } else {
    glow(ctx, 16, 16, 15, '#ffe477', 0.52);
    path(ctx, p => {
      p.moveTo(16, 1.5);
      p.quadraticCurveTo(18.5, 11, 27, 13);
      p.quadraticCurveTo(20, 16, 23, 25);
      p.quadraticCurveTo(16, 21, 12, 30);
      p.quadraticCurveTo(10, 21, 2, 19);
      p.quadraticCurveTo(11, 15, 16, 1.5);
      p.closePath();
    }, linear(ctx, 9, 3, 22, 29, [[0, '#fffbd0'], [0.42, '#ffe774'], [1, '#ffad32']]), '#a76b28', 0.85);
    circle(ctx, 16, 16, 3.2, '#fffde5', null);
  }
}

function drawParticle(ctx, color) {
  const gradient = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.22, color);
  gradient.addColorStop(0.58, rgba(color, 0.82));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(6, 6, 6, 0, Math.PI * 2);
  ctx.fill();
}

export function generateItemTextures(scene) {
  for (const type of ['coin', 'mushroom', 'oneup', 'fireflower', 'star', 'bell', 'seed']) {
    const { element, ctx } = makeCanvas(64, 64);
    ctx.scale(2, 2);
    drawItem(ctx, type);
    addTexture(scene, `item_${type}`, element, 64, 64);
  }
  for (const type of ['fire', 'bubble', 'spark']) {
    const { element, ctx } = makeCanvas(32, 32);
    drawProjectile(ctx, type);
    addTexture(scene, `projectile_${type}`, element, 32, 32);
  }
  const particles = [
    ['white', '#fff9e8'], ['gold', '#ffd348'], ['pink', '#f77fba'],
    ['cyan', '#78e4f2'], ['green', '#79d966'], ['orange', '#ff914b']
  ];
  for (const [name, color] of particles) {
    const { element, ctx } = makeCanvas(12, 12);
    drawParticle(ctx, color);
    addTexture(scene, `particle_${name}`, element, 12, 12);
  }
}

function noise(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function soil(ctx) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, 40, [
    [0, '#bd7d4c'], [0.3, '#a6653f'], [1, '#75432f']
  ]);
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = linear(ctx, 0, 0, 0, 6, [[0, rgba('#ffe0a2', 0.55)], [1, rgba('#ffe0a2', 0)]]);
  ctx.fillRect(0, 0, 40, 6);
  ctx.fillStyle = linear(ctx, 0, 35, 0, 40, [[0, 'rgba(45,25,39,0)'], [1, 'rgba(45,25,39,0.38)']]);
  ctx.fillRect(0, 35, 40, 5);
  for (let i = 0; i < 22; i++) {
    const x = 2 + noise(i + 2) * 36;
    const y = 8 + noise(i + 40) * 29;
    const r = 0.65 + noise(i + 80) * 1.45;
    oval(ctx, x, y, r * 1.35, r, i % 3 === 0 ? '#d69861' : '#814b35', null, noise(i) * 2);
  }
  strokePath(ctx, p => {
    p.moveTo(3, 23);
    p.bezierCurveTo(8, 20, 12, 25, 16, 22);
    p.moveTo(24, 12);
    p.bezierCurveTo(28, 10, 31, 14, 36, 11);
  }, rgba('#6b3e31', 0.38), 0.8);
}

function drawGround(ctx) {
  soil(ctx);
  line(ctx, 0, 1.5, 40, 1.5, rgba('#ffe0a2', 0.58), 1.2);
  line(ctx, 0, 38.5, 40, 38.5, rgba('#4d2b31', 0.5), 1.2);
}

function drawGrass(ctx) {
  soil(ctx);
  path(ctx, p => {
    p.moveTo(0, 9);
    p.quadraticCurveTo(7, 5, 14, 9);
    p.quadraticCurveTo(21, 5, 28, 9);
    p.quadraticCurveTo(34, 5, 40, 9);
    p.lineTo(40, 17);
    p.quadraticCurveTo(33, 15, 29, 17);
    p.quadraticCurveTo(21, 14, 15, 17);
    p.quadraticCurveTo(7, 14, 0, 17);
    p.closePath();
  }, linear(ctx, 0, 6, 0, 18, [[0, '#9ae66b'], [0.35, '#58bc50'], [1, '#2d8740']]), '#245e39', 0.9);
  for (let i = 0; i < 11; i++) {
    const x = 1.5 + i * 3.6;
    const h = 2 + noise(i + 12) * 3.2;
    path(ctx, p => {
      p.moveTo(x, 9.5);
      p.quadraticCurveTo(x + 0.6, 9.5 - h * 0.6, x + 1.8, 9.5 - h);
      p.quadraticCurveTo(x + 1.4, 9.5 - h * 0.3, x + 2.4, 10);
    }, i % 2 ? '#80d65b' : '#b0ec77', null);
  }
  strokePath(ctx, p => {
    p.moveTo(2, 10);
    p.quadraticCurveTo(10, 7, 18, 10);
    p.moveTo(22, 10);
    p.quadraticCurveTo(31, 7, 38, 10);
  }, rgba('#e1ffad', 0.72), 1.1);
  for (const [x, y] of [[5, 17], [22, 16], [35, 18]]) {
    path(ctx, p => {
      p.moveTo(x, y - 2);
      p.quadraticCurveTo(x + 1, y + 2, x + 3, y + 4);
    }, null, '#397d3d', 1.2);
  }
}

function brick(ctx, x, y, width, height, shade) {
  const gradient = linear(ctx, x, y, x, y + height, [
    [0, shade === 0 ? '#f2a16c' : '#e38b5e'],
    [0.35, shade === 0 ? '#d8784c' : '#c86b48'],
    [1, '#9e4c39']
  ]);
  roundedRect(ctx, x, y, width, height, 3, gradient, '#743c35', 0.9);
  strokePath(ctx, p => {
    p.moveTo(x + 2.7, y + 2.1);
    p.lineTo(x + width - 2.7, y + 2.1);
  }, rgba('#ffe0ad', 0.65), 1.05);
  line(ctx, x + 2, y + height - 2, x + width - 2, y + height - 2, rgba('#713735', 0.6), 0.9);
}

function drawBrick(ctx) {
  ctx.fillStyle = '#784037';
  ctx.fillRect(0, 0, 40, 40);
  brick(ctx, 1.5, 1.5, 17.5, 17.5, 0);
  brick(ctx, 21, 1.5, 17.5, 17.5, 1);
  brick(ctx, -7, 21, 18, 17.5, 1);
  brick(ctx, 13, 21, 18, 17.5, 0);
  brick(ctx, 33, 21, 8, 17.5, 1);
}

function drawQuestion(ctx) {
  roundedRect(ctx, 1.5, 1.5, 37, 37, 7, linear(ctx, 3, 2, 37, 39, [
    [0, '#fff19a'], [0.22, '#ffdc55'], [0.58, '#f3b632'], [1, '#c77c23']
  ]), INK, 1.3);
  roundedRect(ctx, 5, 5, 30, 30, 5, null, rgba('#fff3b0', 0.68), 1.15);
  path(ctx, p => {
    p.moveTo(5.5, 9);
    p.quadraticCurveTo(20, 3.5, 34.5, 9);
    p.lineTo(34.5, 13);
    p.quadraticCurveTo(20, 8, 5.5, 13);
    p.closePath();
  }, rgba('#ffffff', 0.26), null);
  for (const [x, y] of [[8, 8], [32, 8], [8, 32], [32, 32]]) {
    circle(ctx, x, y, 1.55, '#c88928', '#8f5c25', 0.55);
    circle(ctx, x - 0.35, y - 0.4, 0.5, '#ffe485', null);
  }
  const question = p => {
    p.moveTo(13.4, 13.1);
    p.bezierCurveTo(13.5, 7.8, 26.6, 7.4, 26.7, 13.3);
    p.bezierCurveTo(26.7, 17.1, 20.1, 17.6, 20.1, 22.2);
    p.moveTo(20.1, 27.4);
  };
  strokePath(ctx, question, '#9b6024', 4.5);
  strokePath(ctx, question, '#fff8c9', 2.5);
  circle(ctx, 20.1, 27.8, 1.4, '#fff8c9', '#9b6024', 0.65);
  shine(ctx, 13, 6.8, 6, 0.9, -0.12, 0.58);
}

function drawUsedBlock(ctx) {
  roundedRect(ctx, 1.5, 1.5, 37, 37, 6, linear(ctx, 3, 2, 37, 39, [
    [0, '#c5ad8d'], [0.35, '#a98b6d'], [1, '#725645']
  ]), INK, 1.2);
  roundedRect(ctx, 5.5, 5.5, 29, 29, 4, null, '#80634e', 1);
  for (const [x, y] of [[9, 9], [31, 9], [9, 31], [31, 31]]) {
    circle(ctx, x, y, 2, '#725745', INK, 0.65);
    line(ctx, x - 0.9, y, x + 0.9, y, '#b79a79', 0.75);
  }
  strokePath(ctx, p => {
    p.moveTo(14, 20);
    p.quadraticCurveTo(20, 18, 26, 20);
  }, rgba('#5f473d', 0.55), 1);
  shine(ctx, 13, 6.5, 6, 0.8, -0.1, 0.35);
}

function drawStone(ctx) {
  ctx.fillStyle = '#3f485f';
  ctx.fillRect(0, 0, 40, 40);
  polygon(ctx, [[3, 3], [37, 3], [37, 37], [3, 37]], '#8290a6', INK, 1.1);
  polygon(ctx, [[4, 4], [35.5, 4], [31, 11], [10, 10]], '#b4c0d0', null);
  polygon(ctx, [[35.5, 4], [36, 36], [29, 31], [31, 11]], '#59667f', null);
  polygon(ctx, [[4, 35.5], [36, 36], [29, 31], [10, 32]], '#4b5870', null);
  polygon(ctx, [[4, 4], [10, 10], [10, 32], [4, 35.5]], '#91a0b5', null);
  polygon(ctx, [[10, 10], [31, 11], [29, 31], [10, 32]], '#7d8ca4', '#65738b', 0.7);
  polygon(ctx, [[17, 14], [27, 13], [29, 21], [20, 25], [13, 21]], '#8f9db2', null);
  strokePath(ctx, p => {
    p.moveTo(17, 14);
    p.lineTo(20, 25);
    p.lineTo(29, 21);
  }, rgba('#c7d2df', 0.35), 0.85);
  shine(ctx, 14, 6.5, 5.5, 0.7, -0.08, 0.4);
}

function drawCloud(ctx) {
  path(ctx, p => {
    p.moveTo(2, 12.5);
    p.bezierCurveTo(0, 8, 4, 5, 8, 6.5);
    p.bezierCurveTo(9, 1.8, 16, 0.8, 19, 4.2);
    p.bezierCurveTo(23, 0.2, 31, 1.4, 31.5, 6.2);
    p.bezierCurveTo(37, 4.7, 40.5, 8.2, 38, 12.3);
    p.quadraticCurveTo(30, 15.2, 22, 13.6);
    p.quadraticCurveTo(13, 16.2, 2, 12.5);
    p.closePath();
  }, linear(ctx, 0, 2, 0, 15, [[0, '#ffffff'], [0.55, '#f4f8f5'], [1, '#bed7e4']]), '#6f91ad', 0.9);
  strokePath(ctx, p => {
    p.moveTo(7, 7.2);
    p.quadraticCurveTo(12, 4, 16, 6);
    p.moveTo(21, 5);
    p.quadraticCurveTo(25, 3, 29, 5.5);
  }, rgba('#ffffff', 0.9), 1.7);
  strokePath(ctx, p => {
    p.moveTo(4, 12);
    p.quadraticCurveTo(15, 15, 25, 12.5);
    p.quadraticCurveTo(32, 14, 37, 12);
  }, rgba('#8fb5cd', 0.45), 1);
}

function drawPipeTop(ctx) {
  softShadow(ctx, 40, 39, 35, 2.5, 0.23);
  roundedRect(ctx, 13, 20, 54, 20, 4, linear(ctx, 13, 20, 67, 40, [
    [0, '#1f743e'], [0.25, '#54c65a'], [0.5, '#36a94a'], [0.82, '#237b40'], [1, '#195d37']
  ]), INK, 1.1);
  roundedRect(ctx, 2, 5, 76, 25, 10, linear(ctx, 3, 5, 77, 29, [
    [0, '#1f743e'], [0.16, '#62cf65'], [0.35, '#43b950'], [0.62, '#2d9645'], [0.84, '#1f753d'], [1, '#174f34']
  ]), INK, 1.2);
  oval(ctx, 40, 10.5, 34, 7.8, linear(ctx, 40, 3, 40, 18, [
    [0, '#163e30'], [0.55, '#0f382b'], [1, '#236b3b']
  ]), INK, 0, 1);
  oval(ctx, 40, 10.2, 28.5, 4.8, radial(ctx, 36, 8, 25, [
    [0, '#2a7044'], [0.6, '#174c34'], [1, '#0d2e27']
  ]), '#3d8a50', 0, 0.75);
  strokePath(ctx, p => {
    p.moveTo(7, 10);
    p.quadraticCurveTo(7, 5.5, 13, 5.5);
    p.lineTo(31, 5.5);
  }, rgba('#c4f39a', 0.78), 2.1);
  strokePath(ctx, p => {
    p.moveTo(9, 20);
    p.quadraticCurveTo(9, 15, 15, 15);
    p.lineTo(26, 15);
  }, rgba('#b9ef91', 0.58), 1.5);
  line(ctx, 71, 16, 71, 26, rgba('#0f3d2c', 0.55), 1.2);
  strokePath(ctx, p => {
    p.moveTo(7, 27.5);
    p.quadraticCurveTo(40, 32, 73, 27.5);
  }, rgba('#164f32', 0.6), 1);
}

function drawPipeBody(ctx) {
  ctx.fillStyle = linear(ctx, 11, 0, 69, 0, [
    [0, '#185e37'], [0.12, '#56c45a'], [0.28, '#7cdd70'], [0.42, '#43b84e'],
    [0.68, '#2d9544'], [0.88, '#20743d'], [1, '#164f33']
  ]);
  ctx.fillRect(11, 0, 58, 40);
  line(ctx, 11, 0, 11, 40, INK, 1.1);
  line(ctx, 69, 0, 69, 40, INK, 1.1);
  strokePath(ctx, p => {
    p.moveTo(17, 0);
    p.lineTo(17, 40);
    p.moveTo(22, 0);
    p.lineTo(22, 40);
  }, rgba('#c4f4a1', 0.38), 2.2);
  strokePath(ctx, p => {
    p.moveTo(61, 0);
    p.lineTo(61, 40);
  }, rgba('#0e3e2c', 0.32), 2.4);
  ctx.fillStyle = linear(ctx, 0, 0, 0, 40, [[0, 'rgba(255,255,255,0.08)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(15,40,30,0.13)']]);
  ctx.fillRect(11, 0, 58, 40);
}

function drawLava(ctx) {
  ctx.fillStyle = linear(ctx, 0, 0, 0, 40, [
    [0, '#ffb52f'], [0.16, '#f47b28'], [0.52, '#df4d27'], [1, '#a92432']
  ]);
  ctx.fillRect(0, 0, 40, 40);
  path(ctx, p => {
    p.moveTo(0, 4);
    p.quadraticCurveTo(8, 0, 15, 4);
    p.quadraticCurveTo(24, 8, 31, 3);
    p.quadraticCurveTo(36, 1, 40, 4);
    p.lineTo(40, 10);
    p.quadraticCurveTo(31, 7, 24, 11);
    p.quadraticCurveTo(13, 7, 0, 11);
    p.closePath();
  }, linear(ctx, 0, 3, 0, 11, [[0, '#fff6a0'], [0.45, '#ffd348'], [1, '#ff9232']]), null);
  for (let i = 0; i < 7; i++) {
    const x = 2 + noise(i + 3) * 35;
    const y = 13 + noise(i + 22) * 23;
    const rx = 3 + noise(i + 44) * 4;
    const ry = 1.5 + noise(i + 67) * 2.3;
    oval(ctx, x, y, rx, ry, i % 2 ? '#b82d32' : '#c93c2d', null, noise(i) * 2);
    strokePath(ctx, p => {
      p.moveTo(x - rx * 0.7, y - ry * 0.2);
      p.quadraticCurveTo(x, y - ry, x + rx * 0.8, y - ry * 0.15);
    }, rgba('#ffbd3e', 0.8), 1.1);
  }
  strokePath(ctx, p => {
    p.moveTo(3, 22);
    p.bezierCurveTo(10, 18, 11, 25, 17, 22);
    p.bezierCurveTo(23, 18, 24, 27, 31, 23);
    p.lineTo(37, 25);
    p.moveTo(8, 34);
    p.quadraticCurveTo(18, 29, 26, 35);
  }, '#ffd449', 2.1);
  strokePath(ctx, p => {
    p.moveTo(4, 23);
    p.bezierCurveTo(10, 20, 12, 26, 18, 23);
  }, '#fff3a0', 0.75);
  for (const [x, y, r] of [[9, 16, 1.5], [29, 30, 2], [21, 36, 1.1]]) {
    circle(ctx, x, y, r, '#ffdb4f', '#ffad32', 0.5);
    circle(ctx, x - 0.3, y - 0.4, r * 0.3, '#fff7bd', null);
  }
}

export function generateTerrainTextures(scene) {
  const add = (key, width, height, draw) => {
    const { element, ctx } = makeCanvas(width, height);
    draw(ctx);
    addTexture(scene, key, element, width, height);
  };
  add('tile_ground', TILE, TILE, drawGround);
  add('tile_grass', TILE, TILE, drawGrass);
  add('tile_brick', TILE, TILE, drawBrick);
  add('tile_question', TILE, TILE, drawQuestion);
  add('tile_used', TILE, TILE, drawUsedBlock);
  add('tile_stone', TILE, TILE, drawStone);
  add('tile_cloud', TILE, 16, drawCloud);
  add('tile_pipe_top', TILE * 2, TILE, drawPipeTop);
  add('tile_pipe_body', TILE * 2, TILE, drawPipeBody);
  add('tile_lava', TILE, TILE, drawLava);
}

function arch(ctx, x, y, width, height, fill, stroke = INK, lineWidth = 1) {
  path(ctx, p => {
    p.moveTo(x, y + height);
    p.lineTo(x, y + width / 2);
    p.bezierCurveTo(x, y - width * 0.12, x + width, y - width * 0.12, x + width, y + width / 2);
    p.lineTo(x + width, y + height);
    p.closePath();
  }, fill, stroke, lineWidth);
}

function litWindow(ctx, x, y, width = 13, height = 21) {
  glow(ctx, x + width / 2, y + height / 2, width * 1.25, '#ffd46d', 0.32);
  arch(ctx, x, y, width, height, linear(ctx, x, y, x, y + height, [
    [0, '#fff3ad'], [0.55, '#ffc95e'], [1, '#e8913e']
  ]), INK, 1.1);
  line(ctx, x + width / 2, y + 2, x + width / 2, y + height, '#8e6245', 1.1);
  line(ctx, x + 1.5, y + height * 0.55, x + width - 1.5, y + height * 0.55, '#8e6245', 1);
  shine(ctx, x + width * 0.35, y + height * 0.32, width * 0.13, height * 0.2, 0.2, 0.55);
}

function castleWall(ctx, x, y, width, height, light = '#f3b08e', mid = '#d7806c', dark = '#a95755') {
  roundedRect(ctx, x, y, width, height, 4, linear(ctx, x, y, x + width, y + height, [
    [0, light], [0.42, mid], [1, dark]
  ]), INK, 1.25);
  strokePath(ctx, p => {
    p.moveTo(x + 4, y + 5);
    p.lineTo(x + width - 5, y + 5);
  }, rgba('#fff3d4', 0.55), 1.4);
  for (let row = y + 18; row < y + height - 4; row += 15) {
    line(ctx, x + 2, row, x + width - 2, row, rgba(dark, 0.42), 0.65);
    for (let col = x + 13 + (Math.round((row - y) / 15) % 2) * 9; col < x + width - 3; col += 23) {
      line(ctx, col, row - 13, col, row, rgba(dark, 0.35), 0.6);
    }
  }
}

function roof(ctx, x, y, width, height, color = '#e85e54') {
  path(ctx, p => {
    p.moveTo(x, y + height);
    p.lineTo(x + width * 0.5, y);
    p.lineTo(x + width, y + height);
    p.quadraticCurveTo(x + width * 0.5, y + height + 5, x, y + height);
    p.closePath();
  }, linear(ctx, x + width * 0.5, y, x + width * 0.5, y + height, [
    [0, '#ff9a74'], [0.35, color], [1, '#a33e4b']
  ]), INK, 1.25);
  strokePath(ctx, p => {
    p.moveTo(x + width * 0.5, y + 3);
    p.lineTo(x + width * 0.5, y + height + 1);
  }, rgba('#ffd091', 0.45), 1.2);
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    line(ctx, x + width * 0.5 - width * 0.5 * t, y + height * (1 - t),
      x + width * 0.5 + width * 0.5 * t, y + height * (1 - t), rgba('#7f3447', 0.3), 0.8);
  }
}

function flag(ctx, x, y, color = '#ef5b57', scale = 1) {
  line(ctx, x, y, x, y - 16 * scale, '#d7b260', 1.2 * scale);
  path(ctx, p => {
    p.moveTo(x, y - 15 * scale);
    p.quadraticCurveTo(x + 8 * scale, y - 18 * scale, x + 16 * scale, y - 14 * scale);
    p.lineTo(x + 12 * scale, y - 8 * scale);
    p.lineTo(x + 16 * scale, y - 3 * scale);
    p.quadraticCurveTo(x + 8 * scale, y - 6 * scale, x, y - 4 * scale);
    p.closePath();
  }, linear(ctx, x, y - 16 * scale, x + 16 * scale, y - 4 * scale,
    [[0, '#ff9a84'], [0.5, color], [1, '#a93649']]), INK, 0.7 * scale);
}

function drawGoal(ctx) {
  softShadow(ctx, 23, 155, 22, 4, 0.22);
  roundedRect(ctx, 5, 148, 36, 9, 4, linear(ctx, 5, 148, 41, 157, [
    [0, '#e7d6b0'], [0.45, '#bfa783'], [1, '#806a59']
  ]), INK, 1);
  roundedRect(ctx, 20.5, 5, 5, 148, 2.5, linear(ctx, 20.5, 0, 25.5, 0, [
    [0, '#8d919c'], [0.28, '#fff7dc'], [0.58, '#e5dfcc'], [1, '#777d8a']
  ]), INK, 0.9);
  circle(ctx, 23, 5, 5.1, radial(ctx, 21, 3, 7, [
    [0, '#fff6b0'], [0.45, '#ffd553'], [1, '#c78b28']
  ]), INK, 0.9);
  path(ctx, p => {
    p.moveTo(25, 16);
    p.bezierCurveTo(34, 12, 41, 20, 46, 17);
    p.lineTo(46, 45);
    p.bezierCurveTo(39, 48, 33, 40, 25, 44);
    p.closePath();
  }, linear(ctx, 26, 16, 45, 44, [[0, '#ff8b75'], [0.4, '#ed514e'], [1, '#ad3047']]), INK, 1);
  star(ctx, 36, 30, 6, 2.8, '#ffdf61', '#a66732', 5, -Math.PI / 2);
  shine(ctx, 29, 19, 5.5, 0.9, 0.15, 0.4);
  circle(ctx, 12, 152, 1.2, '#806a59', null);
  circle(ctx, 34, 152, 1.2, '#806a59', null);
}

function drawCheckpoint(ctx) {
  softShadow(ctx, 22, 69, 20, 2.8, 0.22);
  roundedRect(ctx, 6, 64, 31, 6, 3, linear(ctx, 6, 64, 37, 70, [
    [0, '#d7c5a4'], [1, '#7c6656']
  ]), INK, 0.9);
  roundedRect(ctx, 19.5, 7, 4.5, 60, 2, linear(ctx, 19.5, 0, 24, 0, [
    [0, '#929aaa'], [0.35, '#fff7df'], [1, '#777e8d']
  ]), INK, 0.8);
  glow(ctx, 21.5, 6, 8, '#78e4ce', 0.35);
  circle(ctx, 21.5, 6, 4.5, radial(ctx, 20, 4.5, 7, [
    [0, '#edfff1'], [0.4, '#7be2c5'], [1, '#2b9c91']
  ]), INK, 0.8);
  path(ctx, p => {
    p.moveTo(24, 13);
    p.quadraticCurveTo(34, 10, 43, 15);
    p.lineTo(43, 36);
    p.quadraticCurveTo(34, 31, 24, 34);
    p.closePath();
  }, linear(ctx, 25, 13, 43, 35, [[0, '#a7ed86'], [0.45, '#55c477'], [1, '#258c65']]), INK, 0.95);
  star(ctx, 34, 24, 5.5, 2.4, '#fff2a1', '#477454', 5, -Math.PI / 2);
  shine(ctx, 27, 16, 4.2, 0.7, 0.2, 0.45);
}

function drawSign(ctx) {
  softShadow(ctx, 32, 53, 24, 3, 0.22);
  roundedRect(ctx, 28, 28, 8, 26, 3, linear(ctx, 28, 28, 36, 54, [
    [0, '#c88c50'], [0.45, '#9a603a'], [1, '#67412f']
  ]), INK, 1);
  for (const y of [34, 44]) line(ctx, 29, y, 35, y + 1, '#70462f', 0.7);
  path(ctx, p => {
    p.moveTo(7, 8);
    p.lineTo(53, 8);
    p.lineTo(61, 21);
    p.lineTo(53, 34);
    p.lineTo(7, 34);
    p.quadraticCurveTo(3, 21, 7, 8);
    p.closePath();
  }, linear(ctx, 7, 8, 55, 34, [[0, '#f0b76c'], [0.42, '#c88a4c'], [1, '#8b5234']]), INK, 1.2);
  strokePath(ctx, p => {
    p.moveTo(9, 11);
    p.lineTo(51, 11);
    p.lineTo(56.5, 21);
  }, rgba('#ffe0a0', 0.72), 1.4);
  strokePath(ctx, p => {
    p.moveTo(8, 31);
    p.lineTo(52, 31);
    p.lineTo(58, 21);
  }, rgba('#6f402e', 0.5), 1);
  for (const y of [13, 19, 27]) {
    strokePath(ctx, p => {
      p.moveTo(11, y);
      p.bezierCurveTo(22, y - 2, 30, y + 2, 43, y);
    }, rgba('#9c603a', 0.48), 0.75);
  }
  path(ctx, p => {
    p.moveTo(17, 21);
    p.lineTo(43, 21);
    p.lineTo(43, 16);
    p.lineTo(54, 23);
    p.lineTo(43, 30);
    p.lineTo(43, 25);
    p.lineTo(17, 25);
    p.closePath();
  }, '#ffe3a0', '#815334', 0.9);
  circle(ctx, 11, 21, 1.4, '#7d5238', INK, 0.5);
  circle(ctx, 48, 21, 1.1, '#7d5238', INK, 0.5);
}

function tower(ctx, x, top, width, base, roofColor) {
  castleWall(ctx, x, top + 19, width, base - top - 19);
  for (let i = 0; i < 4; i++) {
    roundedRect(ctx, x - 2 + i * (width + 4) / 4, top + 8, (width + 4) / 4 - 1, 16, 2,
      '#df9479', INK, 0.85);
  }
  roof(ctx, x - 7, top - 24, width + 14, 35, roofColor);
  litWindow(ctx, x + width / 2 - 5, top + 36, 10, 18);
}

function drawCastle(ctx) {
  softShadow(ctx, 120, 191, 105, 8, 0.28);
  // Rear keep and two side towers establish a storybook silhouette.
  castleWall(ctx, 61, 66, 118, 119);
  tower(ctx, 19, 62, 46, 185, '#e96758');
  tower(ctx, 175, 62, 46, 185, '#e96758');
  castleWall(ctx, 88, 35, 64, 150, '#f8c29c', '#df9579', '#ad5d5a');
  for (let i = 0; i < 4; i++) {
    roundedRect(ctx, 84 + i * 19, 29, 16, 18, 2, '#efa47f', INK, 0.9);
  }
  roof(ctx, 78, 0, 84, 40, '#e85b54');
  flag(ctx, 120, 19, '#ef665b', 1.05);

  // Grand arched entrance with beveled stone and warm wooden doors.
  arch(ctx, 99, 123, 43, 62, '#7d5360', INK, 1.2);
  arch(ctx, 104, 128, 33, 57, linear(ctx, 105, 128, 136, 185, [
    [0, '#b5784e'], [0.45, '#865039'], [1, '#543239']
  ]), INK, 0.9);
  line(ctx, 120.5, 130, 120.5, 184, '#5d392f', 1.2);
  for (const x of [109, 116, 125, 132]) line(ctx, x, 137, x, 181, rgba('#e0a269', 0.35), 0.8);
  circle(ctx, 116.5, 157, 1.5, '#ffd36a', INK, 0.45);
  circle(ctx, 124.5, 157, 1.5, '#ffd36a', INK, 0.45);
  for (const x of [96, 99, 142, 145]) {
    roundedRect(ctx, x, 137 + Math.abs(x - 120) * 0.1, 4, 17, 1, '#f4bd94', INK, 0.55);
  }

  litWindow(ctx, 104, 73, 15, 26);
  litWindow(ctx, 130, 73, 15, 26);
  litWindow(ctx, 31, 108, 13, 22);
  litWindow(ctx, 196, 108, 13, 22);
  // Tiny balconies and bright trim make the castle read at gameplay distance.
  roundedRect(ctx, 98, 101, 54, 4, 1.5, '#ffe0a4', INK, 0.7);
  for (let x = 100; x <= 149; x += 8) line(ctx, x, 98, x, 103, '#9b6251', 0.7);
  roundedRect(ctx, 25, 132, 34, 4, 1.5, '#ffe0a4', INK, 0.7);
  roundedRect(ctx, 190, 132, 34, 4, 1.5, '#ffe0a4', INK, 0.7);
  circle(ctx, 89, 57, 3, '#ffd86b', INK, 0.6);
  circle(ctx, 151, 57, 3, '#ffd86b', INK, 0.6);
  // Low shrubs and flowers soften the contact with the ground.
  for (const [x, y, r] of [[16, 183, 10], [38, 186, 8], [203, 186, 9], [225, 183, 7]]) {
    sphere(ctx, x, y, r, r * 0.58, '#b4e77d', '#63b95d', '#2c834b', INK, 0.8);
  }
  for (const [x, y] of [[12, 179], [43, 183], [201, 182], [229, 179]]) {
    flower(ctx, x, y, 2.5, '#fff0c2', '#f3ad4c', 0.2);
  }
}

export function generateDecorTextures(scene) {
  const specs = [
    ['decor_goal', 48, 160, drawGoal],
    ['decor_checkpoint', 48, 72, drawCheckpoint],
    ['decor_sign', 64, 56, drawSign],
    ['decor_castle', 240, 200, drawCastle]
  ];
  for (const [key, width, height, draw] of specs) {
    const { element, ctx } = makeCanvas(width, height);
    draw(ctx);
    addTexture(scene, key, element, width, height);
  }
}

export function generateAllTextures(scene) {
  const portraits = generateHeroTextures(scene);
  generateEnemyTextures(scene);
  generateItemTextures(scene);
  generateTerrainTextures(scene);
  generateDecorTextures(scene);
  return portraits;
}
