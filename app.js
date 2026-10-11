const VIDEO='Rn2W95wAbvI',rows=[['ア','A',5],['カ','Ka',5],['サ','Sa',5],['タ','Ta',5],['ナ','Na',5],['ハ','Ha',5],['マ','Ma',5],['ヤ','Ya',3],['ラ','Ra',5],['ワ','Wa',2],[null,null,1]];
let videos=[],tipMap=new Map(),subtitleMap=new Map(),selected=0,player,ready=false,loop=false,monitorId=null,currentTipText='';
let playbackMode=new URLSearchParams(location.search).get('mode')==='explanation'?'explanation':'writing';
const $=id=>document.getElementById(id),setStatus=s=>{};

function qrUrl(k){return 'qr/'+k.codePointAt(0).toString(16).padStart(4,'0')+'.svg'}
function updateQR(k){$('selected-qr').src=qrUrl(k);$('selected-qr').alt=k+'の教材ページへのQRコード'}
function segmentStart(){
  const v=videos[selected];
  const normal=Math.max(0,v.start-2);
  if(playbackMode!=='explanation')return normal;
  const first=subtitleMap.get(v.kana)?.[0]?.start;
  if(!Number.isFinite(first))return normal;
  const previousEnd=selected>0?videos[selected-1].tipsEnd:0;
  // Keep spoken introductions, but never seek into the previous character's segment.
  return Math.max(0,previousEnd,Math.min(normal,first));
}
function segmentEnd(){
  const v=videos[selected];
  if(playbackMode==='writing')return v.end+2;
  if(Number.isFinite(v.tipsEnd)){
    const cues=subtitleMap.get(v.kana)||[];
    const lastEnd=cues.length?cues[cues.length-1].end:0;
    const nextStart=selected<videos.length-1?videos[selected+1].start:Infinity;
    // Subtitle-based provisional tail allowance; cap before the next character.
    return Math.max(v.tipsEnd,Math.min(lastEnd+0.5,nextStart-1));
  }
  if(selected<videos.length-1)return Math.max(v.end+2,videos[selected+1].start-2);
  if(ready){const d=player.getDuration();if(d&&d>v.end)return d-.25}
  return v.end+30;
}
function syncTipsToggle(){
  const t=$('tips-toggle');
  if(!t)return;
  t.checked=playbackMode==='explanation';
  document.body.classList.toggle('tips-enabled',playbackMode==='explanation');
}
function suppressYouTubeCaptions(){
  if(!ready)return;
  try{player.setOption('captions','track',{});}catch(e){}
  try{player.unloadModule('captions');}catch(e){}
}
function applyAudioMode(){
  if(!ready)return;
  try{if(playbackMode==='explanation')player.unMute();else player.mute()}catch(e){}
}
function hideTipCaption(){
  const box=$('tip-caption');
  if(!box)return;
  currentTipText='';box.textContent='';box.hidden=true;
}
function updateTipCaption(time){
  const box=$('tip-caption');
  if(!box)return;
  if(playbackMode!=='explanation'||!videos.length){hideTipCaption();return}
  const list=subtitleMap.get(videos[selected].kana)||[];
  // ソ has no spoken red-pen explanation; clear the writing subtitle at 524s.
  const silentTips=videos[selected].kana==='ソ'&&time>=524;
  const active=time>=segmentStart()&&time<segmentEnd()&&!silentTips;
  let entry=null;
  if(active){for(const item of list){if(time>=item.start)entry=item;else break}}
  const key=entry?entry.start+'|'+entry.en+'|'+(entry.strokeLabel||''):'';
  if(key===currentTipText)return;
  currentTipText=key;
  box.replaceChildren();
  if(!entry){box.hidden=true;return}
  if(entry.strokeLabel){
    const strong=document.createElement('strong');
    strong.textContent=entry.strokeLabel+': ';
    box.append(strong);
  }
  box.append(document.createTextNode(entry.en));
  box.hidden=false;
}
function setPlaybackMode(mode){
  if(mode!=='writing'&&mode!=='explanation')return;
  stop();playbackMode=mode;syncTipsToggle();hideTipCaption();
  const u=new URL(location.href);
  if(mode==='explanation')u.searchParams.set('mode','explanation');else u.searchParams.delete('mode');
  history.replaceState(null,'',u);
  if(player&&window.YT){createVideoPlayer();}
}
function stop(){loop=false;hideTipCaption();if(ready)try{player.pauseVideo()}catch(e){}}
function loadCurrentSegment(){
  if(!ready||!videos.length)return;
  player.loadVideoById({videoId:VIDEO,startSeconds:segmentStart(),endSeconds:segmentEnd()});
  suppressYouTubeCaptions();
}
function play(){
  if(!ready)return;
  if(playbackMode==='writing'){try{const iframe=player.getIframe(),request=iframe.requestFullscreen||iframe.webkitRequestFullscreen;if(request){const result=request.call(iframe);if(result&&typeof result.catch==='function')result.catch(()=>{});}else if(iframe.webkitEnterFullscreen){iframe.webkitEnterFullscreen()}}catch(e){}}
  loop=true;
  try{
    loadCurrentSegment();
    applyAudioMode();
    hideTipCaption();
    setStatus('区間ループ再生中');
  }catch(e){loop=false;setStatus('再生できませんでした')}
}
function loopBack(){
  if(!loop||!ready)return;
  try{
    loadCurrentSegment();
    applyAudioMode();
    hideTipCaption();
  }catch(e){loop=false;setStatus('繰り返し再生に失敗しました')}
}
function choose(i,changeUrl=true,userAction=false){
  stop();selected=i;const v=videos[i];
  $('selected-kana').textContent=v.kana;$('selected-romaji').textContent=v.romaji;updateQR(v.kana);
  $('previous-kana').disabled=i===0;$('next-kana').disabled=i===videos.length-1;
  document.querySelectorAll('.card').forEach((c,j)=>{c.classList.toggle('active',i===j);c.querySelector('button').setAttribute('aria-pressed',String(i===j))});
  if(ready&&!userAction)try{player.cueVideoById({videoId:VIDEO,startSeconds:segmentStart(),endSeconds:segmentEnd()})}catch(e){}
  if(changeUrl){const u=new URL(location.href);u.searchParams.set('kana',v.kana);history.replaceState(null,'',u);$('video-shell').scrollIntoView({block:'start'})}
  setStatus('再生ボタンで開始');if(userAction)play();
}
function render(){
  const groups=$('groups');let offset=0;
  rows.forEach(([label,en,count])=>{
    const section=document.createElement('section');section.className='group';
    if(label){const h=document.createElement('h3');h.className='group-label';h.innerHTML='<span class="row-ja">'+label+'行</span> / <span class="row-en" lang="en">'+en+'-row</span>';section.append(h)}
    const grid=document.createElement('div');grid.className='card-grid';if(!label){section.classList.add('group-standalone');grid.style.gridColumn='2'}
    for(let j=0;j<count;j++){
      const i=offset+j,v=videos[i],card=document.createElement('article');card.className='card';
      if(label==='ヤ')card.style.gridColumn=String(j*2+1);if(label==='ワ')card.style.gridColumn=String(j*4+1);
      const b=document.createElement('button');b.className='card-button';b.setAttribute('aria-label',v.kana+'の書き方を選択');
      b.innerHTML='<div class="thumb"><span class="thumb-kana">'+v.kana+'</span></div><div class="card-bottom"><div class="character-label"><span class="card-kana">'+v.kana+'</span><span class="card-romaji">'+v.romaji+'</span></div><img class="card-qr" loading="eager" alt="'+v.kana+'のQRコード" src="'+qrUrl(v.kana)+'"></div>';
      b.addEventListener('click',()=>choose(i,true,true));card.append(b);grid.append(card);
    }
    offset+=count;section.append(grid);groups.append(section);
  });
  const k=new URLSearchParams(location.search).get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false);syncTipsToggle();
}
function createVideoPlayer(){
  ready=false;
  if(player){try{player.destroy()}catch(e){};player=null;}
  // YouTube replaces this element with an iframe, so restore its mount point.
  const mount=document.getElementById('video-shell');
  if(!mount){const shell=document.createElement('div');shell.id='video-shell';document.querySelector('.video-shell')?.replaceWith(shell);}
  player=new YT.Player('video-shell',{videoId:VIDEO,playerVars:{start:33,end:39,playsinline:playbackMode==='writing'?0:1,controls:1,fs:1,rel:0,enablejsapi:1,cc_load_policy:0,iv_load_policy:3,hl:'en'},events:{
    onReady:()=>{ready=true;applyAudioMode();suppressYouTubeCaptions();setStatus('再生できます');if(videos.length)choose(selected,false);if(!monitorId)monitorId=setInterval(()=>{if(!ready)return;try{const t=player.getCurrentTime();updateTipCaption(t);if(loop&&t>=segmentEnd()-.12)loopBack()}catch(e){}},150)},
    onApiChange:()=>{try{player.setOption('captions','track',{})}catch(e){}},
    onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING)suppressYouTubeCaptions();if(e.data===YT.PlayerState.ENDED&&loop)loopBack()},onError:e=>{loop=false;hideTipCaption();setStatus('YouTube再生エラー: '+e.data)}
  }});
}
window.onYouTubeIframeAPIReady=createVideoPlayer;
$('play').onclick=play;
$('tips-toggle').onchange=e=>setPlaybackMode(e.target.checked?'explanation':'writing');
$('previous-kana').onclick=()=>{if(selected>0)choose(selected-1,true,true)};
$('next-kana').onclick=()=>{if(selected<videos.length-1)choose(selected+1,true,true)};
$('print-button').onclick=async()=>{const button=$('print-button');button.disabled=true;try{const images=[...document.querySelectorAll('.card-qr')];await Promise.all(images.map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth===0){reject(new Error('QR missing: '+img.src));return}img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(new Error('QR missing: '+img.src)),{once:true})})));window.print()}catch(e){alert('QRコードをすべて読み込めませんでした。通信状況を確認して、もう一度お試しください。')}finally{button.disabled=false}};
window.addEventListener('popstate',()=>{const q=new URLSearchParams(location.search);playbackMode=q.get('mode')==='explanation'?'explanation':'writing';syncTipsToggle();applyAudioMode();hideTipCaption();const k=q.get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false)});
Promise.all([fetch('videos.json').then(r=>r.json()),fetch('tips.json').then(r=>r.json()),fetch('subtitles.json').then(r=>r.json())]).then(([v,t,sub])=>{videos=v;tipMap=new Map(t.map(x=>[x.kana,x.tips||[]]));subtitleMap=new Map(Object.entries(sub));render()}).catch(()=>setStatus('一覧データを読み込めません'));
const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.append(script);
