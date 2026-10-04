/* Sube una build a Steam con SteamPipe en un solo paso: empaqueta, rellena el .vdf con los IDs de steam/ids.local.json y lanza SteamCMD.
 *   node tools/steam-upload.mjs            juego completo
 *   node tools/steam-upload.mjs --demo     demo
 *   --no-pack                              sube lo que ya hay en dist/ sin volver a empaquetar
 * La build se publica en la rama privada de ids.local.json ("branch", por defecto "pruebas"; hay que crearla antes en Steamworks ->
 * SteamPipe -> Builds -> Manage Branches). Nunca se publica en "default": eso se hace a mano en Steamworks cuando toque lanzar.
 * La primera vez SteamCMD pide la contrasena y el codigo de Steam Guard en la consola; luego recuerda la sesion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const DEMO = args.has("--demo");
const IDS = path.join(ROOT, "steam/ids.local.json");

if (!fs.existsSync(IDS)) {
  fs.writeFileSync(IDS, JSON.stringify({
    user: "TU_USUARIO_DE_STEAMWORKS",
    appid: 0, depot: 0,
    demoAppid: 0, demoDepot: 0,
    branch: "pruebas",
    steamcmd: "C:\\steamcmd\\steamcmd.exe",
  }, null, 2) + "\n");
  console.log(`Creado ${path.relative(ROOT, IDS)}: rellena usuario, App ID y Depot ID (Steamworks -> SteamPipe -> Depots) y vuelve a lanzarlo.`);
  process.exit(1);
}
const ids = JSON.parse(fs.readFileSync(IDS, "utf8"));
const appid = DEMO ? ids.demoAppid : ids.appid, depot = DEMO ? ids.demoDepot : ids.depot;
if (!appid || !depot || !ids.user || /^TU_/.test(ids.user)) { console.error(`Faltan datos en ${path.relative(ROOT, IDS)} (usuario, ${DEMO ? "demoAppid/demoDepot" : "appid/depot"}).`); process.exit(1); }
const branch = ids.branch || "pruebas";
if (branch === "default") { console.error('La rama "default" es la publica: publicala a mano en Steamworks.'); process.exit(1); }
if (!fs.existsSync(ids.steamcmd)) { console.error(`No encuentro SteamCMD en ${ids.steamcmd}. Descargalo de https://developer.valvesoftware.com/wiki/SteamCMD (zip de Windows), descomprimelo ahi y lanzalo una vez para que se actualice.`); process.exit(1); }

if (!args.has("--no-pack")) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/steam-pack.mjs")].concat(DEMO ? ["--demo"] : []), { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}
const content = path.join(ROOT, "dist", DEMO ? "Geolite Demo-win32-x64" : "Geolite-win32-x64");
if (!fs.existsSync(content)) { console.error(`No existe ${content}: empaqueta primero.`); process.exit(1); }

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const out = path.join(ROOT, "steam-output");
fs.mkdirSync(out, { recursive: true });
const q = s => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const vdf = path.join(out, `app_build_${appid}.vdf`);
fs.writeFileSync(vdf, `"AppBuild"
{
	"AppID" "${appid}"
	"Desc" "${q(`${DEMO ? "Geolite Demo" : "Geolite"} v${version}`)}"
	"BuildOutput" "${q(out)}"
	"ContentRoot" "${q(content)}"
	"SetLive" "${q(branch)}"
	"Depots"
	{
		"${depot}"
		{
			"FileMapping"
			{
				"LocalPath" "*"
				"DepotPath" "."
				"recursive" "1"
			}
		}
	}
}
`);

console.log(`Subiendo ${DEMO ? "la demo" : "el juego"} v${version} (App ${appid}, depot ${depot}) a la rama "${branch}"...`);
const r = spawnSync(ids.steamcmd, ["+login", ids.user, "+run_app_build", vdf, "+quit"], { stdio: "inherit" });
if (r.status !== 0) { console.error("SteamCMD termino con error (mira steam-output/ y la consola de arriba)."); process.exit(r.status || 1); }
console.log(`Hecho. En la biblioteca de Steam: Geolite -> Propiedades -> Betas -> "${branch}" y se actualiza solo.`);
