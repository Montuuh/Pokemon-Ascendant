#!/usr/bin/env node
// Generate an image with Google's image models ("Nano Banana") and write it straight into the project.
// This closes the loop the Unity project never had: prompt → PNG on disk → read it back → judge → iterate,
// with no human step in the middle.
//
// TWO PROVIDERS, and the difference is where the money comes from:
//
//   vertex   (default)  Vertex AI on a GCP project. Authenticates with gcloud Application Default
//                       Credentials, so there is NO API KEY anywhere. This is where the Google AI Pro
//                       promotional credits actually land.
//   aistudio            generativelanguage.googleapis.com with GEMINI_API_KEY. Bills against AI Studio
//                       *Prepay* credit, which is a separate pot and is usually empty. A 429
//                       "prepayment credits are depleted" means you wanted --provider vertex.
//
// Usage:
//   npm run art:gen -- --out public/art/stages/meadow.png --prompt-file docs/art/prompts/meadow.txt --aspect 16:9
//   npm run art:gen -- ... --n 4                 four variants as <name>-1.png … -4.png; pick the best
//   npm run art:gen -- ... --ref <style-key>.png attach a style key so the whole set matches
//   npm run art:gen -- ... --size 2K             1K | 2K | 4K (2K default: 1K comes back small and soft)
//   npm run art:gen -- ... --model <id>          override the model
//   npm run art:gen -- ... --provider aistudio   use the API key path instead
//   npm run art:gen -- ... --dry-run             print the request, call nothing
//
// Generating four and picking one is the single biggest quality lever here, which is why --n exists:
// one shot is a coin flip, best-of-four is a choice.
//
// Setup for the default path, once per machine:
//   gcloud auth application-default login
//   gcloud config set project <your-gcp-project>
// The project needs the Vertex AI API (aiplatform.googleapis.com) enabled and billing active.
//
// House style and the workflow live in docs/art/backdrop-prompts.md; prompts in docs/art/prompts/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve, extname } from 'node:path';

// gcloud is a .cmd on Windows, which execFile cannot resolve from PATH. These two commands are fixed
// strings with no interpolation, so execSync is both safe here and free of the shell-args deprecation.
function gcloud(command) {
  try {
    return execSync(`gcloud ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Nano Banana Pro. Higher fidelity than 2.5-flash-image and worth the cost for a backdrop you ship.
const DEFAULT_MODEL = 'gemini-3-pro-image';
const FALLBACK_LOCATION = 'europe-west1';

/** Gemini 3.x image models are not published to regional endpoints; they only answer on `global`. */
const prefersGlobal = (model) => /^gemini-3(\.\d+)?-/.test(model);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

// Minimal .env loader (no dependency). Only the aistudio provider needs it.
if (existsSync('.env')) {
  for (const line of (await readFile('.env', 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

const provider = arg('provider', process.env.IMAGE_PROVIDER ?? 'vertex').toLowerCase();
const model = arg('model', process.env.GOOGLE_IMAGE_MODEL ?? DEFAULT_MODEL);
const out = arg('out');
const promptInline = arg('prompt');
const promptFile = arg('prompt-file');
const ref = arg('ref');
const aspect = arg('aspect', '1:1');
const size = (arg('size', process.env.GEMINI_IMAGE_SIZE ?? '2K') ?? '2K').toUpperCase();
const count = Math.max(1, Math.min(8, Number(arg('n', '1')) || 1));

if (!out || (!promptInline && !promptFile)) {
  console.error('usage: gen-image --out <png> (--prompt "<text>" | --prompt-file <txt>)');
  console.error('       [--aspect 1:1|3:2|4:3|16:9|9:16|21:9] [--size 1K|2K|4K] [--n 1-8]');
  console.error('       [--ref <image>] [--model <id>] [--provider vertex|aistudio] [--dry-run]');
  process.exit(2);
}
const prompt = promptInline ?? (await readFile(promptFile, 'utf8')).trim();

const parts = [{ text: prompt }];
if (ref) {
  const bytes = await readFile(ref);
  const mime = /\.jpe?g$/i.test(ref) ? 'image/jpeg' : 'image/png';
  parts.unshift({ inlineData: { mimeType: mime, data: bytes.toString('base64') } });
  parts.push({
    text: 'Match the exact art style, colour palette, linework, cel-shading, level of stylisation and lighting of the attached reference image.',
  });
}

// TEXT must be requested alongside IMAGE. Asking for IMAGE alone makes gemini-3-pro-image finish with
// IMAGE_RECITATION and return nothing at all — an hour of "the pipeline is broken" that was one word.
const generationConfig = {
  responseModalities: ['TEXT', 'IMAGE'],
  imageConfig: { aspectRatio: aspect, imageSize: size },
};
const body = { contents: [{ role: 'user', parts }], generationConfig };

/** The GCP project: explicit env first, otherwise whatever gcloud is pointed at. */
function gcloudProject() {
  const env = process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  if (env) return env;
  const v = gcloud('config get-value project');
  return v && v !== '(unset)' ? v : null;
}

function gcloudToken() {
  return gcloud('auth print-access-token') || null;
}

function vertexTarget() {
  const project = gcloudProject();
  if (!project) throw new Error('No GCP project. Run `gcloud config set project <id>` or set GOOGLE_CLOUD_PROJECT.');
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || (prefersGlobal(model) ? 'global' : FALLBACK_LOCATION);
  const host = location === 'global' ? 'https://aiplatform.googleapis.com' : `https://${location}-aiplatform.googleapis.com`;
  return {
    project,
    location,
    url: `${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`,
  };
}

if (flag('dry-run')) {
  const target = provider === 'vertex' ? vertexTarget() : { project: '-', location: 'aistudio' };
  console.log(JSON.stringify({ provider, model, ...target, out, aspect, size, count, promptChars: prompt.length, ref: ref ?? null }, null, 2));
  process.exit(0);
}

/** Turn the API's raw complaint into the thing you actually have to go and fix. */
function explain(raw) {
  if (/prepayment credits are depleted|RESOURCE_EXHAUSTED/i.test(raw) && provider === 'aistudio')
    return 'AI Studio Prepay is empty. The Google AI Pro credits live on GCP, so drop --provider aistudio and use Vertex.';
  if (/Could not load the default credentials|UNAUTHENTICATED|401/i.test(raw))
    return 'No GCP credentials. Run `gcloud auth application-default login`.';
  if (/PERMISSION_DENIED|403/i.test(raw))
    return 'Permission denied. Enable aiplatform.googleapis.com on the project and grant the Vertex AI User role.';
  if (/Publisher Model.*(NOT_FOUND|not found)|404/i.test(raw))
    return `Model ${model} is not published to that location. Gemini 3.x image models only answer on the global endpoint; 2.5 answers on ${FALLBACK_LOCATION}.`;
  if (/billing/i.test(raw)) return 'Billing is not active on the GCP project.';
  return null;
}

async function callVertex() {
  const token = gcloudToken();
  if (!token) throw new Error('Could not get a token. Run `gcloud auth application-default login`.');
  const { url } = vertexTarget();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function callAiStudio() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing. Copy .env.example to .env, or use the default --provider vertex.');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One image, or an error carrying the API's own words plus what to do about them. */
async function generate(attempt = 1) {
  const { ok, status, text } = provider === 'vertex' ? await callVertex() : await callAiStudio();

  // A 429 here is nearly always the per-minute quota, not an empty wallet: --n 4 outruns it. Back off and
  // retry rather than losing the variant. A genuinely depleted wallet still fails, just three times slower.
  if (status === 429 && attempt <= 3) {
    const wait = attempt * 20000;
    console.log(`   rate limited, waiting ${wait / 1000}s (attempt ${attempt}/3)`);
    await sleep(wait);
    return generate(attempt + 1);
  }

  if (!ok) {
    const hint = explain(text);
    throw new Error(`HTTP ${status}${hint ? ` — ${hint}` : ''}\n   ${text.slice(0, 400)}`);
  }
  const json = JSON.parse(text);
  const candidate = json.candidates?.[0];
  const img = candidate?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (img) return { img, note: candidate.content.parts.find((p) => p.text)?.text ?? null };

  // A refusal is usually the prompt, not the pipeline, so print what the model actually said.
  const said = candidate?.content?.parts?.find((p) => p.text)?.text;
  const reason = candidate?.finishReason ?? json.promptFeedback?.blockReason;
  throw new Error(
    `no image${reason ? ` (${reason})` : ''}${said ? ` — model said: ${said.slice(0, 300)}` : ''}` +
      (reason === 'IMAGE_RECITATION' ? '\n   IMAGE_RECITATION usually means the prompt asked for copyrighted or branded subject matter.' : ''),
  );
}

/** <dir>/name.png + 2 → <dir>/name-2.png */
function numbered(path, i) {
  if (count === 1) return path;
  const ext = extname(path);
  return `${path.slice(0, -ext.length)}-${i}${ext}`;
}

const target = provider === 'vertex' ? vertexTarget() : { project: '-', location: 'aistudio' };
console.log(`${provider} · ${model} · ${target.location} · ${aspect} ${size}\n`);

await mkdir(dirname(resolve(out)), { recursive: true });
let written = 0;
for (let i = 1; i <= count; i++) {
  const dest = numbered(out, i);
  try {
    const { img, note } = await generate();
    await writeFile(dest, Buffer.from(img.data, 'base64'));
    const kb = Math.round((img.data.length * 0.75) / 1024);
    console.log(`wrote ${dest}  ${img.mimeType} ${kb}KB${note ? `\n   model: ${note.trim().slice(0, 140)}` : ''}`);
    written++;
  } catch (e) {
    console.error(`FAILED ${dest}: ${e.message}`);
  }
}
if (!written) process.exit(1);
console.log(`\n${written}/${count} generated`);
