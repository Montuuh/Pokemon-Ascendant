// §2.9.4.1 — two distinct native-grid venues, assembled from retained FRLG tiles.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/ring');
await mkdir(out, { recursive: true });
const sources = [], crops = [], outputs = [];
const sha = (b) => createHash('sha256').update(b).digest('hex');
async function source(path, url) {
  const bytes = await readFile(resolve(root, path));
  sources.push({ path, url, sha256: sha(bytes) });
  return { bytes, path };
}
async function crop(s, box) {
  crops.push({ source: s.path, box });
  return sharp(s.bytes).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer();
}
const indigo = await source('public/art/league/sources/indigo-frlg.png', 'https://archives.bulbagarden.net/wiki/File:Indigo_Plateau_FRLG.png');
const tree = await source('public/art/route/forest/tree.png', 'https://archives.bulbagarden.net/wiki/File:Viridian_Forest_FRLG.png');
const grass = await source('public/art/route/meadow/ground.png', 'https://archives.bulbagarden.net/wiki/File:Route_1_FRLG.png');
const people = [];
for (const [name, file] of [['carny','man_4'],['ranger','picnicker'],['grandmother','old_woman']]) {
  const s = await source(`public/art/events/sources/${name}.png`, `https://raw.githubusercontent.com/pret/pokeemerald/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/graphics/object_events/pics/people/${file}.png`);
  const {data,info} = await sharp(await crop(s,[0,0,16,32])).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const key=[...data.subarray(0,3)];
  for(let i=0;i<data.length;i+=4)if(data[i]===key[0]&&data[i+1]===key[1]&&data[i+2]===key[2])data[i+3]=0;
  people.push(await sharp(data,{raw:info}).png().toBuffer());
}
const stone = await crop(indigo, [176,144,16,16]);
const wall = await crop(indigo, [144,240,16,16]);
const spectator = people[0];
const lamp = await crop(indigo, [96,128,16,32]);
const W=480,H=192;
async function build(id, stops, indoor) {
  const layers=[];
  const put=async(input,x,y)=>{
    const m=await sharp(input).metadata();
    const left=Math.max(0,x),top=Math.max(0,y);
    const width=Math.min(W,x+m.width)-left,height=Math.min(H,y+m.height)-top;
    if(width>0&&height>0) layers.push({input:await sharp(input).extract({left:left-x,top:top-y,width,height}).png().toBuffer(),left,top});
  };
  const rect=async(x,y,width,height,background)=>put(await sharp({create:{width,height,channels:4,background}}).png().toBuffer(),x,y);
  const tile=async(input,x,y,w,h)=>{const m=await sharp(input).metadata();for(let yy=y;yy<y+h;yy+=m.height)for(let xx=x;xx<x+w;xx+=m.width)await put(input,xx,yy);};
  await tile(indoor?stone:grass.bytes,0,0,W,H);
  if(indoor){
    // Two staggered spectator banks, each with a complete row of native Emerald NPCs.
    await rect(0,0,W,60,'#605868');
    for(let row=0;row<2;row++){
      await rect(0,row*24+24,W,4,'#a8a090');
      for(let x=16+row*16;x<W-16;x+=32){
        await put(people[(Math.floor(x/32)+row)%people.length],x,row*24-4);
      }
    }
    for(const x of [0,464]){await rect(x,56,16,136,'#605868');await rect(x+3,56,10,112,'#a85850');await rect(x+6,56,4,112,'#e0ac7c');}
    await rect(16,60,448,4,'#605868');
  }else{
    for(let x=-16;x<W;x+=32){await put(tree.bytes,x,-24);await put(tree.bytes,x,168);}
    for(const x of [0,448])for(const y of [8,56,104])await put(tree.bytes,x,y);
    await tile(stone,48,48,384,112);
    for(const x of [64,400]){await put(lamp,x,24);await put(lamp,x,128);}
    for(const [x,y] of [[80,84],[384,120],[48,116],[400,64]])await put(spectator,x,y);
  }
  // The connected stepped route leads up to the final ring. Geometry uses only sampled FRLG colours.
  for(let i=0;i<stops.length-1;i++){
    const [x,y]=stops[i],[xx,yy]=stops[i+1];
    await rect(x,y+8,xx-x+8,12,indoor?'#a85850':'#a8a090');
    await rect(xx-8,yy+8,16,y-yy+12,indoor?'#a85850':'#a8a090');
    for(let step=yy+16;step<y+8;step+=8)await rect(xx-8,step,16,2,'#e0d8b8');
  }
  for(const [x,y]of stops){
    // Raised octagonal stone courts, each with its own outlined battle circle.
    await tile(wall,x-40,y+16,80,16);
    await rect(x-44,y-12,88,36,'#605868');
    await rect(x-36,y-20,72,52,'#605868');
    await rect(x-42,y-10,84,32,'#e0d8b8');
    await rect(x-34,y-18,68,48,'#e0d8b8');
    await rect(x-28,y-12,56,36,indoor?'#c87868':'#a8b8b0');
    await rect(x-34,y-6,68,24,indoor?'#c87868':'#a8b8b0');
    await rect(x-34,y+4,68,2,'#f8f0d8');
    await rect(x-8,y-2,16,14,'#605868');
    await rect(x-6,y,12,10,'#f8f0d8');
    await rect(x-3,y+2,6,6,indoor?'#c87868':'#a8b8b0');
  }
  const bytes=await sharp({create:{width:W,height:H,channels:4,background:'#e0d8b8'}}).composite(layers).png({palette:true,colours:256,dither:0}).toBuffer();
  await writeFile(resolve(out,`${id}.png`),bytes);
  outputs.push({file:`${id}.png`,width:W,height:H,stops,sha256:sha(bytes),bytes:bytes.length});
}
await build('pallet-ring',[[144,112],[336,72]],false);
await build('celadon-coliseum',[[96,128],[240,96],[384,64]],true);
await writeFile(resolve(out,'manifest.json'),JSON.stringify({build:'node scripts/build-ring-art.mjs',processing:'Native pixel crops and repeated authentic tiles; original stepped courts, ring markings, route, grandstand and banners in FRLG colours. No resampling or AI.',sources,crops,outputs},null,2)+'\n');
console.log(`Built ${outputs.length} native Ring venues.`);
