import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const assetsDir = path.resolve('assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Create a 1024x1024 SVG logo
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A192F" />
      <stop offset="100%" stop-color="#0F2B5C" />
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1024" height="1024" fill="url(#bg)" />

  <!-- Outer Ring Accent -->
  <circle cx="512" cy="512" r="420" fill="none" stroke="url(#goldGrad)" stroke-width="8" opacity="0.4" />
  <circle cx="512" cy="512" r="390" fill="#0E2347" stroke="url(#blueGrad)" stroke-width="4" />

  <!-- Shield Shape / Emblem -->
  <path d="M 512 210 L 730 310 L 730 550 C 730 690 630 790 512 840 C 394 790 294 690 294 550 L 294 310 Z"
        fill="url(#bg)" stroke="url(#goldGrad)" stroke-width="12" filter="url(#glow)" />

  <!-- Inner Crest "G" -->
  <text x="512" y="580" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="280" fill="url(#blueGrad)">
    G
  </text>

  <!-- Star / Sparkle Accents -->
  <polygon points="512,140 524,175 560,175 530,195 542,230 512,208 482,230 494,195 464,175 500,175" fill="url(#goldGrad)" />
  
  <!-- Banner Subtext -->
  <text x="512" y="690" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="52" fill="#FFFFFF" letter-spacing="8">
    GYAN-26
  </text>
  <text x="512" y="740" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="28" fill="#FCD34D" letter-spacing="4">
    KAUN BANEGA GYANWAN
  </text>
</svg>
`;

// 2. Create Splash SVG (Navy background with centered logo)
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#0A192F" />
  <g transform="translate(854, 854)">
    ${logoSvg.replace('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">', '').replace('</svg>', '')}
  </g>
</svg>
`;

async function generate() {
  console.log('Rendering 1024x1024 assets for Capacitor...');
  const logoBuffer = Buffer.from(logoSvg);
  await sharp(logoBuffer).png().toFile(path.join(assetsDir, 'logo.png'));
  await sharp(logoBuffer).png().toFile(path.join(assetsDir, 'icon-only.png'));
  await sharp(logoBuffer).png().toFile(path.join(assetsDir, 'icon-foreground.png'));

  // Background for adaptive icons (pure navy)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 10, g: 25, b: 47, alpha: 1 },
    },
  }).png().toFile(path.join(assetsDir, 'icon-background.png'));

  // Splash screen
  const splashBuffer = Buffer.from(splashSvg);
  await sharp(splashBuffer).png().toFile(path.join(assetsDir, 'splash.png'));
  await sharp(splashBuffer).png().toFile(path.join(assetsDir, 'splash-dark.png'));

  console.log('Assets created successfully in ./assets!');
}

generate().catch(console.error);
