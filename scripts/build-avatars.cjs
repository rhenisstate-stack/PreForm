const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const outDir = path.resolve(__dirname, '../apps/web/public/images/avatars');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const avatars = [
  {
    name: 'avatar-default.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#0f172a' />
          <stop offset='100%' stop-color='#134e4a' />
        </linearGradient>
        <linearGradient id='tealGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#2dd4bf' />
          <stop offset='100%' stop-color='#0d9488' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#bg)' stroke='#0d9488' stroke-width='4' stroke-opacity='0.4'/>
      <path d='M128 48 C96 48 80 72 80 100 C80 134 104 156 128 174 C152 156 176 134 176 100 C176 72 160 48 128 48 Z' fill='none' stroke='url(#tealGrad)' stroke-width='8' stroke-linejoin='round'/>
      <circle cx='128' cy='102' r='20' fill='url(#tealGrad)' />
      <rect x='123' y='88' width='10' height='28' rx='4' fill='#0f172a' />
      <rect x='114' y='97' width='28' height='10' rx='4' fill='#0f172a' />
      <path d='M68 214 C76 178 98 160 128 160 C158 160 180 178 188 214' fill='none' stroke='#f8fafc' stroke-width='7' stroke-linecap='round'/>
      <circle cx='128' cy='134' r='16' fill='#f8fafc' />
    </svg>`
  },
  {
    name: 'avatar-female-1.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='f1bg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#f0fdfa' />
          <stop offset='100%' stop-color='#ccfbf1' />
        </linearGradient>
        <linearGradient id='scrubTeal' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='#0d9488' />
          <stop offset='100%' stop-color='#115e59' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#f1bg)' stroke='#14b8a6' stroke-width='3' stroke-opacity='0.5'/>
      <path d='M64 220 C68 175 92 155 128 155 C164 155 188 175 192 220 Z' fill='url(#scrubTeal)' />
      <path d='M112 155 L128 182 L144 155 Z' fill='#f8fafc' />
      <ellipse cx='128' cy='118' rx='36' ry='42' fill='#f1c27d' />
      <path d='M92 115 C92 78 106 66 128 66 C150 66 164 78 164 115 C164 122 162 130 160 134 C152 108 144 94 128 94 C112 94 104 108 96 134 C94 130 92 122 92 115 Z' fill='#3e2723' />
      <circle cx='128' cy='52' r='22' fill='#3e2723' />
      <path d='M100 170 C96 195 106 215 124 218 C142 215 152 195 148 170' fill='none' stroke='#334155' stroke-width='6' stroke-linecap='round' />
      <circle cx='124' cy='222' r='8' fill='#cbd5e1' stroke='#334155' stroke-width='3' />
    </svg>`
  },
  {
    name: 'avatar-female-2.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='f2bg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#f8fafc' />
          <stop offset='100%' stop-color='#e2e8f0' />
        </linearGradient>
        <linearGradient id='scrubNavy' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='#1e293b' />
          <stop offset='100%' stop-color='#0f172a' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#f2bg)' stroke='#0ea5e9' stroke-width='3' stroke-opacity='0.4'/>
      <path d='M62 222 C66 174 92 154 128 154 C164 154 190 174 194 222 Z' fill='url(#scrubNavy)' />
      <path d='M110 154 L128 184 L146 154 Z' fill='#f8fafc' />
      <ellipse cx='128' cy='116' rx='35' ry='40' fill='#8d5524' />
      <path d='M88 120 C88 74 104 60 128 60 C152 60 168 74 168 120 C172 135 170 165 162 175 C162 140 154 110 148 98 C140 85 116 85 108 98 C102 110 94 140 94 175 C86 165 84 135 88 120 Z' fill='#171717' />
      <circle cx='154' cy='190' r='6' fill='#0d9488' />
      <path d='M104 168 C100 196 112 216 128 216 C144 216 156 196 152 168' fill='none' stroke='#0d9488' stroke-width='5' stroke-linecap='round' />
    </svg>`
  },
  {
    name: 'avatar-male-1.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='m1bg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#ecfeff' />
          <stop offset='100%' stop-color='#cffafe' />
        </linearGradient>
        <linearGradient id='m1scrub' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='#0f766e' />
          <stop offset='100%' stop-color='#115e59' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#m1bg)' stroke='#0d9488' stroke-width='3' stroke-opacity='0.5'/>
      <path d='M58 222 C64 170 90 152 128 152 C166 152 192 170 198 222 Z' fill='url(#m1scrub)' />
      <path d='M110 152 L128 180 L146 152 Z' fill='#f8fafc' />
      <ellipse cx='128' cy='118' rx='36' ry='44' fill='#e0ac69' />
      <path d='M92 110 C92 75 106 62 128 62 C150 62 164 75 164 110 C164 116 160 102 156 94 C148 78 108 78 100 94 C96 102 92 116 92 110 Z' fill='#271c19' />
      <path d='M102 165 C98 195 110 216 128 216 C146 216 158 195 154 165' fill='none' stroke='#334155' stroke-width='6' stroke-linecap='round' />
      <circle cx='128' cy='220' r='8' fill='#0d9488' stroke='#f8fafc' stroke-width='2' />
    </svg>`
  },
  {
    name: 'avatar-male-2.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='m2bg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#f0fdf4' />
          <stop offset='100%' stop-color='#dcfce7' />
        </linearGradient>
        <linearGradient id='m2scrub' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stop-color='#1e293b' />
          <stop offset='100%' stop-color='#09111e' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#m2bg)' stroke='#10b981' stroke-width='3' stroke-opacity='0.4'/>
      <path d='M58 222 C64 170 90 152 128 152 C166 152 192 170 198 222 Z' fill='url(#m2scrub)' />
      <path d='M110 152 L128 180 L146 152 Z' fill='#f8fafc' />
      <ellipse cx='128' cy='118' rx='36' ry='44' fill='#ffdbac' />
      <path d='M90 108 C90 70 104 58 128 58 C152 58 166 70 166 108 C166 114 160 98 152 86 C140 68 116 68 104 86 C96 98 90 114 90 108 Z' fill='#4a3728' />
      <rect x='100' y='110' width='22' height='16' rx='4' fill='none' stroke='#334155' stroke-width='3' />
      <rect x='134' y='110' width='22' height='16' rx='4' fill='none' stroke='#334155' stroke-width='3' />
      <line x1='122' y1='118' x2='134' y2='118' stroke='#334155' stroke-width='3' />
      <path d='M102 165 C98 195 110 216 128 216 C146 216 158 195 154 165' fill='none' stroke='#0d9488' stroke-width='6' stroke-linecap='round' />
    </svg>`
  },
  {
    name: 'avatar-neutral.png',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>
      <defs>
        <linearGradient id='nbg' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#0f172a' />
          <stop offset='100%' stop-color='#1e293b' />
        </linearGradient>
        <linearGradient id='nteal' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='#14b8a6' />
          <stop offset='100%' stop-color='#0d9488' />
        </linearGradient>
      </defs>
      <circle cx='128' cy='128' r='124' fill='url(#nbg)' stroke='#0d9488' stroke-width='4' stroke-opacity='0.4'/>
      <circle cx='128' cy='96' r='36' fill='url(#nteal)' />
      <path d='M62 220 C68 166 94 148 128 148 C162 148 188 166 194 220' fill='none' stroke='url(#nteal)' stroke-width='14' stroke-linecap='round' />
      <path d='M110 185 L124 199 L150 173' fill='none' stroke='#f8fafc' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' />
    </svg>`
  }
];

async function run() {
  for (const item of avatars) {
    const dest = path.join(outDir, item.name);
    await sharp(Buffer.from(item.svg))
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log('Created avatar:', item.name);
  }
}

run().catch(console.error);
