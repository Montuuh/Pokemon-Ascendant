// A17 / §9.3 — native FRLG overworld people for the route, separate from battle portraits.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const out='public/art/map/people';
const commit='ce6406d8c2eaf46d543c8a2606de0c3cb1951982';
const origin=`https://raw.githubusercontent.com/pret/pokefirered/${commit}/graphics/object_events/pics/people`;
const ids={youngster:'youngster',lass:'lass','bug-catcher':'bug_catcher',hiker:'hiker',camper:'camper',picnicker:'picnicker',acetrainer:'cooltrainer_f',swimmer:'swimmer_f_land',nurse:'nurse',merchant:'clerk',pokefan:'fat_man',scientist:'scientist',rocketgrunt:'rocket_m',rocketgruntf:'rocket_f',blackbelt:'black_belt',hexmaniac:'channeler',brock:'brock',misty:'misty',bugsy:'bug_catcher',whitney:'lass',blaine:'blaine',erika:'erika',ltsurge:'lt_surge',koga:'koga',giovanni:'giovanni','giovanni-rocket':'giovanni',kiyo:'black_belt',sabrina:'sabrina',lorelei:'lorelei',lance:'lance',bruno:'bruno',agatha:'agatha',blue:'blue',will:'cooltrainer_m',gambler:'gentleman',archer:'rocket_m'};
await mkdir(`${out}/sources`,{recursive:true});
const exists=(p)=>access(p).then(()=>true,()=>false);
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const sources=[],outputs=[];
for(const file of new Set(Object.values(ids))){
  const path=`${out}/sources/${file}.png`,url=`${origin}/${file}.png`;
  if(!(await exists(path))||process.argv.includes('--fetch')){
    const response=await fetch(url);
    if(!response.ok)throw new Error(`${response.status} ${url}`);
    await writeFile(path,Buffer.from(await response.arrayBuffer()));
  }
  const bytes=await readFile(path),meta=await sharp(bytes).metadata();
  sources.push({path,url,sha256:sha(bytes),width:meta.width,height:meta.height});
}
for(const [id,file]of Object.entries(ids)){
  const {data,info}=await sharp(`${out}/sources/${file}.png`).extract({left:0,top:0,width:16,height:32}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const key=[...data.subarray(0,3)];
  for(let p=0;p<data.length;p+=4)if(data[p]===key[0]&&data[p+1]===key[1]&&data[p+2]===key[2])data[p+3]=0;
  const bytes=await sharp(data,{raw:info}).png({palette:true}).toBuffer();
  await writeFile(`${out}/${id}.png`,bytes);
  outputs.push({id,file:`${id}.png`,source:`sources/${file}.png`,crop:[0,0,16,32],sha256:sha(bytes)});
}
// The authentic overworld item ball is a world object rather than the bag's ball icon.
const ballSource='public/art/events/sources/ball.png';
const ball=await readFile(ballSource);
const {data,info}=await sharp(ball).extract({left:0,top:0,width:16,height:16}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const key=[...data.subarray(0,3)];
for(let p=0;p<data.length;p+=4)if(data[p]===key[0]&&data[p+1]===key[1]&&data[p+2]===key[2])data[p+3]=0;
const ballOutput=await sharp(data,{raw:info}).png({palette:true}).toBuffer();
await writeFile(`${out}/item-ball.png`,ballOutput);
await writeFile(`${out}/manifest.json`,JSON.stringify({build:'node scripts/build-map-people.mjs',processing:'First south-facing 16x32 frame, exact palette-zero transparency; no resampling, no colour edits. Render at 2x on the map. Battle portraits remain in the preview.',aliases:'Johto and role-only identities use the matching FRLG trainer class, with their real name, rank, type and portrait retained in the preview.',sources,outputs,ball:{file:'item-ball.png',source:ballSource,sourceSha256:sha(ball),sha256:sha(ballOutput),crop:[0,0,16,16],url:'https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/graphics/object_events/pics/misc/item_ball.png'}},null,2)+'\n');
console.log(`Built ${outputs.length} native route NPCs and one item ball.`);
