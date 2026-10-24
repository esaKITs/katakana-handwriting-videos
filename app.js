
/* Loop help is informational only; playback and subtitle logic are unchanged. */
const loopHelpButton=document.getElementById('loop-help');
const loopHelpPopup=document.getElementById('loop-help-popup');
function setLoopHelpOpen(open){loopHelpPopup.hidden=!open;loopHelpButton.setAttribute('aria-expanded',String(open))}
loopHelpButton.addEventListener('click',()=>setLoopHelpOpen(loopHelpPopup.hidden));
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.loop-help-wrap'))setLoopHelpOpen(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!loopHelpPopup.hidden){setLoopHelpOpen(false);loopHelpButton.focus()}});
const SEIHO_VIDEO='zv6uxNdROOc',SEIHO_SEGMENTS={"ア":[3,9],"ウ":[16,24],"エ":[25,32],"オ":[33,40],"カ":[41,47],"キ":[48,54],"ケ":[60,66],"コ":[67,73],"サ":[74,81],"シ":[82,87],"セ":[94,99],"タ":[106,111],"チ":[112,119],"ツ":[120,125],"テ":[126,131],"ナ":[138,144],"ニ":[144,149],"ネ":[157,164],"ハ":[170,176],"ヒ":[177,182],"フ":[183,187],"ヘ":[188,193],"マ":[204,208],"ム":[216,222],"メ":[223,229],"モ":[230,236],"ヤ":[238,243],"ヨ":[249,255],"ル":[266,271],"ロ":[277,283],"ワ":[284,290],"ヲ":[291,296],"ン":[297,303],"イ":[9,16],"ク":[54,60],"ス":[87,94],"ソ":[99,106],"ト":[131,138],"ヌ":[149,157],"ノ":[164,170],"ホ":[193,204],"ミ":[208,216],"ユ":[243,249],"ラ":[255,260.5],"リ":[260.5,266],"レ":[271,277]},rows=[['ア','A',5],['カ','Ka',5],['サ','Sa',5],['タ','Ta',5],['ナ','Na',5],['ハ','Ha',5],['マ','Ma',5],['ヤ','Ya',3],['ラ','Ra',5],['ワ','Wa',2],[null,null,1]];
let videos=[],selected=0,player,ready=false,loop=true,isPlaying=false,monitorId=null;
const $=id=>document.getElementById(id),setStatus=s=>{};

function qrUrl(k){return 'qr/'+k.codePointAt(0).toString(16).padStart(4,'0')+'.svg'}
function updateQR(k){$('selected-qr').src=qrUrl(k);$('selected-qr').alt=k+'の教材ページへのQRコード'}
function segmentStart(){return SEIHO_SEGMENTS[videos[selected].kana][0]}
function segmentEnd(){return SEIHO_SEGMENTS[videos[selected].kana][1]}
function suppressYouTubeCaptions(){
 if(!ready)return;
 try{player.setOption('captions','track',{})}catch(e){}
 try{player.unloadModule('captions')}catch(e){}
}
function updatePlayButton(){
 const b=$('play');if(!b)return;
 b.setAttribute('aria-label',isPlaying?'一時停止':'再生');b.title=isPlaying?'一時停止':'再生';
 b.innerHTML=isPlaying?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l14 8-14 8z" fill="currentColor"/></svg>';
}
function updateLoopButton(){
 const b=$('loop-toggle');if(!b)return;
 b.classList.toggle('loop-active',loop);b.setAttribute('aria-pressed',String(loop));
 b.setAttribute('aria-label',loop?'ループ再生オン':'ループ再生オフ');b.title=loop?'ループ再生オン':'ループ再生オフ';
}
function stop(){isPlaying=false;updatePlayButton();if(ready)try{player.pauseVideo()}catch(e){}}
function loadCurrentSegment(){
  if(!ready||!videos.length)return;
  player.loadVideoById({videoId:SEIHO_VIDEO,startSeconds:segmentStart(),endSeconds:segmentEnd()});
  suppressYouTubeCaptions();
}
function play(){
 if(!ready)return;
 if(isPlaying){try{player.pauseVideo()}catch(e){}isPlaying=false;updatePlayButton();return}
 {try{const iframe=player.getIframe(),request=iframe.requestFullscreen||iframe.webkitRequestFullscreen;if(request){const result=request.call(iframe);if(result&&typeof result.catch==='function')result.catch(()=>{});}else if(iframe.webkitEnterFullscreen){iframe.webkitEnterFullscreen()}}catch(e){}}
 try{
   loadCurrentSegment();
   isPlaying=true;updatePlayButton();
 }catch(e){isPlaying=false;updatePlayButton();setStatus('再生できませんでした')}
}
function loopBack(){
 if(!loop||!ready||!isPlaying)return;
 try{
   // Reuse the current YouTube player instead of reloading the video at every loop.
   player.seekTo(segmentStart(),true);
   player.playVideo();
   
 }
 catch(e){isPlaying=false;updatePlayButton();setStatus('繰り返し再生に失敗しました')}
}
function endSegment(){
 if(!isPlaying)return;
 if(loop){loopBack();return}
 isPlaying=false;updatePlayButton();
 try{player.pauseVideo()}catch(e){}
}
function choose(i,changeUrl=true,userAction=false){
  stop();selected=i;const v=videos[i];
  $('selected-kana').textContent=v.kana;$('selected-romaji').textContent=v.romaji;updateQR(v.kana);
  $('previous-kana').disabled=i===0;$('next-kana').disabled=i===videos.length-1;
  document.querySelectorAll('.card').forEach((c,j)=>{c.classList.toggle('active',i===j);c.querySelector('button').setAttribute('aria-pressed',String(i===j))});
  if(ready&&!userAction)try{player.cueVideoById({videoId:SEIHO_VIDEO,startSeconds:segmentStart(),endSeconds:segmentEnd()})}catch(e){}
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
  const k=new URLSearchParams(location.search).get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false);
}
function createVideoPlayer(){
  ready=false;isPlaying=false;updatePlayButton();
  if(player){try{player.destroy()}catch(e){};player=null;}
  // YouTube replaces this element with an iframe, so restore its mount point.
  const mount=document.getElementById('video-shell');
  if(!mount){const shell=document.createElement('div');shell.id='video-shell';document.querySelector('.video-shell')?.append(shell);}
  player=new YT.Player('video-shell',{videoId:SEIHO_VIDEO,playerVars:{start:segmentStart(),end:segmentEnd(),playsinline:0,controls:1,fs:1,rel:0,enablejsapi:1,cc_load_policy:0,iv_load_policy:3,hl:'en'},events:{
    onReady:()=>{ready=true;try{player.mute()}catch(e){};suppressYouTubeCaptions();setStatus('再生できます');if(videos.length)choose(selected,false);if(!monitorId)monitorId=setInterval(()=>{if(!ready)return;try{const t=player.getCurrentTime();if(isPlaying&&t>=segmentEnd()-.12)endSegment()}catch(e){}},150)},
    onApiChange:()=>suppressYouTubeCaptions(),
    onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){suppressYouTubeCaptions();setTimeout(suppressYouTubeCaptions,350);setTimeout(suppressYouTubeCaptions,1200);}if(e.data===YT.PlayerState.ENDED)endSegment()},onError:e=>{isPlaying=false;updatePlayButton();setStatus('YouTube再生エラー: '+e.data)}
  }});
}
window.onYouTubeIframeAPIReady=createVideoPlayer;
$('play').onclick=play;
$('loop-toggle').onclick=()=>{loop=!loop;updateLoopButton()};
updateLoopButton();updatePlayButton();
$('previous-kana').onclick=()=>{if(selected>0)choose(selected-1,true,true)};
$('next-kana').onclick=()=>{if(selected<videos.length-1)choose(selected+1,true,true)};
$('print-button').onclick=async()=>{const button=$('print-button');button.disabled=true;try{const images=[...document.querySelectorAll('.card-qr')];await Promise.all(images.map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth===0){reject(new Error('QR missing: '+img.src));return}img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(new Error('QR missing: '+img.src)),{once:true})})));window.print()}catch(e){alert('QRコードをすべて読み込めませんでした。通信状況を確認して、もう一度お試しください。')}finally{button.disabled=false}};
window.addEventListener('popstate',()=>{const q=new URLSearchParams(location.search);const k=q.get('kana');choose(Math.max(0,videos.findIndex(v=>v.kana===k)),false)});
fetch('videos.json').then(r=>r.json()).then(v=>{videos=v;render()}).catch(()=>setStatus('一覧データを読み込めません'));
const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.append(script);
