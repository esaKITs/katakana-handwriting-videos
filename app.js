const VIDEO='Rn2W95wAbvI',rows=[['ア','A',5],['カ','Ka',5],['サ','Sa',5],['タ','Ta',5],['ナ','Na',5],['ハ','Ha',5],['マ','Ma',5],['ヤ','Ya',3],['ラ','Ra',5],['ワ','Wa',2],[null,null,1]];
let videos=[],selected=0,player,ready=false,loop=false,monitorId=null;
let playbackMode=new URLSearchParams(location.search).get('mode')==='explanation'?'explanation':'writing';
const $=id=>document.getElementById(id),setStatus=s=>{};

function updateMuteButton(){
  const muted=!ready||player.isMuted(),b=$('mute'),label=muted?'消音解除':'消音';
  b.setAttribute('aria-label',label);b.title=label;
  b.innerHTML=muted?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zM16 9l5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function qrUrl(k){return 'qr/'+k.codePointAt(0).toString(16).padStart(4,'0')+'.svg'}
function updateQR(k){$('selected-qr').src=qrUrl(k);$('selected-qr').alt=k+'の教材ページへのQRコード'}
function segmentStart(){return Math.max(0,videos[selected].start-2)}
function segmentEnd(){
  const v=videos[selected];
  if(playbackMode==='writing')return v.end+2;
  if(selected<videos.length-1)return Math.max(v.end+2,videos[selected+1].start-2);
  if(ready){const d=player.getDuration();if(d&&d>v.end)return d-.25}
  return v.end+30;
}
function syncModeButtons(){
  const w=$('mode-writing'),e=$('mode-explanation');
  if(!w||!e)return;
  const writing=playbackMode==='writing';
  w.setAttribute('aria-pressed',String(writing));e.setAttribute('aria-pressed',String(!writing));
  w.classList.toggle('active-mode',writing);e.classList.toggle('active-mode',!writing);
}
function setPlaybackMode(mode){
  if(mode!== 'writing'&&mode!=='explanation')return;
  stop();playbackMode=mode;syncModeButtons();
  const u=new URL(location.href);
  if(mode==='explanation')u.searchParams.set('mode','explanation');else u.searchParams.delete('mode');
  history.replaceState(null,'',u);
  if(ready&&videos.length)try{player.cueVideoById({videoId:VIDEO,startSeconds:segmentStart()})}catch(e){}
}
function stop(){loop=false;if(ready)try{player.pauseVideo()}catch(e){}}
function play(){
  if(!ready)return;
  try{const iframe=player.getIframe(),request=iframe.requestFullscreen||iframe.webkitRequestFullscreen;if(request){const result=request.call(iframe);if(result&&typeof result.catch==='function')result.catch(()=>{});}else if(iframe.webkitEnterFullscreen){iframe.webkitEnterFullscreen()}}catch(e){}
  loop=true;
  try{
    player.loadVideoById({videoId:VIDEO,startSeconds:segmentStart()});
    if(playbackMode==='explanation')player.unMute();else player.mute();
    updateMuteButton();setStatus('区間ループ再生中');
  }catch(e){setStatus('再生できませんでした')}
}
function loopBack(){if(!loop||!ready)return;try{player.seekTo(segmentStart(),true);player.playVideo()}catch(e){setStatus('繰り返し再生に失敗しました')}}
function choose(i,changeUrl=true,userAction=false){
  stop();selected=i;const v=videos[i];
  $('selected-kana').textContent=v.kana;$('selected-romaji').textContent=v.romaji;updateQR(v.kana);
  $('previous-kana').disabled=i===0;$('next-kana').disabled=i===videos.length-1;
  document.querySelectorAll('.card').forEach((c,j)=>{c.classList.toggle('active',i===j);c.querySelector('button').setAttribute('aria-pressed',String(i===j))});
  if(ready&&!userAction)try{player.cueVideoById({videoId:VIDEO,startSeconds:segmentStart()})}catch(e){}
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
  const k=new URLSearchParams(location.search).get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false);syncModeButtons();
}
window.onYouTubeIframeAPIReady=()=>{
  player=new YT.Player('video-shell',{videoId:VIDEO,playerVars:{start:33,end:39,playsinline:0,controls:1,fs:1,rel:0,enablejsapi:1,cc_load_policy:0,iv_load_policy:3,hl:'ja'},events:{
    onReady:()=>{ready=true;try{player.mute();player.setOption('captions','track',{});player.setOption('captions','reload',false)}catch(e){}updateMuteButton();setStatus('再生できます');if(videos.length)choose(selected,false);monitorId=setInterval(()=>{if(!loop||!ready)return;try{if(player.getCurrentTime()>=segmentEnd()-.12)loopBack()}catch(e){}},150)},
    onStateChange:e=>{if(e.data===YT.PlayerState.ENDED&&loop)loopBack()},onError:e=>{loop=false;setStatus('YouTube再生エラー: '+e.data)}
  }})
};
$('play').onclick=play;
$('mute').onclick=()=>{if(!ready)return;if(player.isMuted()){player.unMute();updateMuteButton()}else{player.mute();updateMuteButton()}};
$('mode-writing').onclick=()=>setPlaybackMode('writing');
$('mode-explanation').onclick=()=>setPlaybackMode('explanation');
$('previous-kana').onclick=()=>{if(selected>0)choose(selected-1,true,true)};
$('next-kana').onclick=()=>{if(selected<videos.length-1)choose(selected+1,true,true)};
$('print-button').onclick=async()=>{const button=$('print-button');button.disabled=true;try{const images=[...document.querySelectorAll('.card-qr')];await Promise.all(images.map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth===0){reject(new Error('QR missing: '+img.src));return}img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(new Error('QR missing: '+img.src)),{once:true})})));window.print()}catch(e){alert('QRコードをすべて読み込めませんでした。通信状況を確認して、もう一度お試しください。')}finally{button.disabled=false}};
window.addEventListener('popstate',()=>{const q=new URLSearchParams(location.search);playbackMode=q.get('mode')==='explanation'?'explanation':'writing';syncModeButtons();const k=q.get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false)});
fetch('videos.json').then(r=>r.json()).then(d=>{videos=d;render()}).catch(()=>setStatus('一覧データを読み込めません'));
const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.append(script);
