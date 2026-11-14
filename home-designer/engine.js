/* engine.js — new layout engine for Khaneh Negar (steps 1 & 2) */
(function(){
"use strict";
const SD=["n","e","s","w"], ROT={n:"e",e:"s",s:"w",w:"n"};
const EXPOSED=["street","alley","neighbor"];

window.genThree=function(){
  collect();
  const N=S.needs, R=S.rules, floors=Math.max(1,Math.min(N.floors,R.maxF,3));
  const uw=Math.max(6.5,S.land.w-R.setE-R.setW), ud=Math.max(8,S.land.d-R.setN-R.setS);
  const maxFoot=S.land.w*S.land.d*R.cov/100;
  let bw=Math.min(uw*.92,Math.sqrt(maxFoot*.75)), bd=Math.min(ud*.88,maxFoot/Math.max(bw,1));
  if(bw<7) bw=Math.min(uw,8.2);
  if(bd<9) bd=Math.min(ud,11.5);
  const hasElev=N.extra.includes("elevator")||floors>2, hasPark=N.extra.includes("parking")||R.park>0;

  // orientation: rotate so the access side becomes the bottom (canonical frame)
  const off={top:0,right:1,bottom:2,left:3}[S.land.north]||0;
  let ai=["north","east","south","west"].indexOf(S.land.access); if(ai<0) ai=2;
  const k={s:0,w:1,n:2,e:3}[SD[(ai+off)%4]];
  const CW=k%2?bd:bw, CD=k%2?bw:bd;
  const compass=sd=>["n","e","s","w"][(SD.indexOf(sd)+k-off+8)%4]; // canonical side -> compass key
  const warn=[];

  function make(type){
    const fd=hasPark?Math.min(5,CD*.36):Math.min(3.2,CD*.28);
    const md=Math.min(3.6,CD*.26), td=CD-fd-md;
    if(td<3) warn.push(1);
    const cw=floors>1?2.4+(hasElev?1.8:0):0;
    const lw=cw?CW*({A:.38,B:.28,C:.34}[type]):CW*.5;
    const R_=(x0,W,y,h,items,door)=>{
      const fx=items.reduce((a,i)=>a+(i.fw||0),0), fl=items.reduce((a,i)=>a+(i.f||0),0)||1;
      let x=x0;
      return items.map(i=>{
        const w=i.fw||(W-fx)*i.f/fl;
        const r={id:i.id,name:i.name,x:x,y:y,w:w,h:h,type:i.t,door:i.nd?null:{side:i.ds||door,at:.5},wins:[]};
        x+=w; return r;});
    };
    const I=(id,name,t,f,extra)=>Object.assign({id,name,t,f},extra||{});
    const L={id:type,buildW:bw,buildD:bd,floorsCount:floors,hasElev,hasPark,floors:{}};
    let bedsLeft=N.beds;
    for(let f=1;f<=floors;f++){
      let rooms=[];
      const midL=[],midR=[];
      let top=[],front=[];
      if(floors===1){
        const bl=[];for(let b=0;b<Math.min(4,bedsLeft);b++) bl.push(I("bed"+b,b?"خواب "+(b+1):"خواب اصلی","private",1));
        top=bl; bedsLeft=0;
        midL.push(I("liv","نشیمن","public",1));
        midR.push(I("kit","آشپزخانه","service",1.3));
        for(let t=0;t<Math.min(N.baths,2);t++) midR.push(I("bath"+t,"سرویس","service",.7));
        front=[I("ent","ورودی","service",1,{ds:"s"})];
        if(hasPark) front.push(I("park","پارکینگ","service",0,{fw:Math.min(5.4,CW*.45),ds:"s"}));
        if(N.extra.includes("dining")) front.push(I("din","غذاخوری","public",1.2));
      } else if(f===1){
        if(type==="C"){top=[I("liv","نشیمن","public",1.5)];
          top.push(N.extra.includes("yard")?I("yard","حیاط","yard",.9,{nd:1}):I("din","غذاخوری","public",.9));}
        else top=[I("liv","نشیمن","public",1.6)].concat(N.extra.includes("dining")?[I("din","غذاخوری","public",1)]:[]);
        midL.push(I("kit","آشپزخانه","service",1));
        if(type==="B") midR.push(I("court","حیاط","yard",1,{nd:1}));
        midR.push(I("bath0","سرویس","service",.8));
        if(N.extra.includes("laundry")) midR.push(I("laun","رختشوی‌خانه","service",.8));
        else if(N.extra.includes("storage")) midR.push(I("sto","انباری","service",.8));
        front=[I("ent","ورودی","service",1,{ds:"s"})];
        if(hasPark) front.push(I("park","پارکینگ","service",0,{fw:Math.min(5.4,CW*.45),ds:"s"}));
      } else {
        const per=Math.ceil(N.beds/(floors-1)), cnt=f===floors?bedsLeft:Math.min(per,bedsLeft);
        const items=[];
        for(let b=0;b<cnt;b++){const n=N.beds-bedsLeft+b; items.push(I("bed"+n,n?"خواب "+(n+1):"خواب اصلی","private",1));}
        bedsLeft-=cnt;
        if(N.extra.includes("office")&&f===2) items.push(I("off","اتاق کار","private",.8));
        if(N.extra.includes("guest")&&f===floors) items.push(I("guest","اتاق مهمان","private",.9));
        top=items.slice(0,3); front=items.slice(3,6);
        if(items.length>6) warn.push(2);
        if(!front.length) front=[I("lounge","نشیمن","public",1)];
        if(!top.length) top=[I("lounge2","نشیمن","public",1)];
        midL.push(I("bath0","سرویس","service",1));
        midR.push(N.baths>1?I("bath1","سرویس","service",1):I("hall","نشیمن","public",1));
      }
      rooms=rooms.concat(R_(0,CW,0,td,top,"s"), R_(0,CW,td+md,fd,front,"n"));
      rooms=rooms.concat(R_(0,lw,td,md,midL,"s"));
      if(cw){
        rooms.push({id:"stairs",name:"راه‌پله",x:lw,y:td,w:2.4,h:md,type:"core",door:{side:"w",at:.5},wins:[]});
        if(hasElev) rooms.push({id:"elev",name:"آسانسور",x:lw+2.4,y:td,w:1.8,h:md,type:"core",door:{side:"w",at:.5},wins:[]});
      }
      rooms=rooms.concat(R_(lw+cw,CW-lw-cw,td,md,midR,"s"));
      L.floors[f]=rooms;
    }
    // overlap / bounds check (canonical frame)
    Object.values(L.floors).forEach(rs=>{
      for(let i=0;i<rs.length;i++){
        const a=rs[i];
        if(a.x<-.01||a.y<-.01||a.x+a.w>CW+.01||a.y+a.h>CD+.01) warn.push(3);
        for(let j=i+1;j<rs.length;j++){const b=rs[j];
          if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.02&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.02) warn.push(4);}
      }
    });
    // windows by exterior side, neighbor and sun
    let winM=0,habA=0,sunM=0,bad=0,tot=0,usable=0,all=0;
    Object.values(L.floors).forEach(rs=>rs.forEach(r=>{
      all+=r.w*r.h;
      if(r.type!=="core"&&r.id!=="hall"&&r.id!=="lounge"&&r.id!=="lounge2") usable+=r.w*r.h;
      if(r.type==="core"||r.type==="yard"||r.id==="park"||r.id==="ent") return;
      const ext=[];
      if(r.y<.01) ext.push("n"); if(r.y+r.h>CD-.01) ext.push("s");
      if(r.x<.01) ext.push("w"); if(r.x+r.w>CW-.01) ext.push("e");
      const base=r.type==="public"?.45:r.type==="private"?.38:.22;
      ext.sort((a,b)=>(compass(b)==="s")-(compass(a)==="s"));
      ext.slice(0,2).forEach(sd=>{
        const c=compass(sd), nb=S.neigh[c], ex=EXPOSED.includes(nb);
        let len=base*(ex?(r.type==="private"?.55:.8):(nb==="open"||nb==="vacant"?1.15:1))*(c==="s"?1.2:1);
        len=Math.min(.6,len);
        r.wins.push({side:sd,at:.5,len:len});
        const m=len*((sd==="n"||sd==="s")?r.w:r.h);
        winM+=m; tot+=m; if(c==="s") sunM+=m; if(ex) bad+=m*(r.type==="private"?1:.5);
        if(r.type!=="service") habA+=0;
      });
      if(r.type!=="service") habA+=r.w*r.h;
    }));
    const light=Math.min(1,((winM+sunM*.5)/Math.max(habA,1))/.3);
    const priv=Math.max(0,1-bad/Math.max(tot,1));
    const eff=Math.max(0,Math.min(1,(usable/all-.7)/.25));
    const wt={light:[.5,.25,.25],privacy:[.25,.5,.25],efficiency:[.25,.25,.5]}[N.prio]||[.34,.33,.33];
    L.metrics={light:light,priv:priv,eff:eff};
    L.score=Math.round(45+55*(light*wt[0]+priv*wt[1]+eff*wt[2])-(warn.length?8:0));
    // rotate back to the real plan frame
    let Wc=CW,Hc=CD;
    for(let t=0;t<k;t++){
      Object.values(L.floors).forEach(rs=>rs.forEach(r=>{
        const nx=Hc-r.y-r.h, ny=r.x, nw=r.h, nh=r.w;
        r.x=nx;r.y=ny;r.w=nw;r.h=nh;
        if(r.door) r.door.side=ROT[r.door.side];
        r.wins.forEach(w=>w.side=ROT[w.side]);
      }));
      const tmp=Wc;Wc=Hc;Hc=tmp;
    }
    L.title={A:"طرح A — نورمحور",B:"طرح B — حریم‌محور",C:"طرح C — متعادل"}[type];
    L.desc={A:"تمرکز بر نور فضاهای عمومی",B:"تفکیک خصوصی و عمومی",C:"تعادل نور، حریم و کارایی"}[type]
      +" | نور "+Math.round(light*100)+"٪ • حریم "+Math.round(priv*100)+"٪ • کارایی فضا "+Math.round(eff*100)+"٪";
    return L;
  }
  S.layouts={A:make("A"),B:make("B"),C:make("C")};
  S.selected="A"; S.viewFloor=1;
  const st=document.getElementById("st");
  if(st) st.textContent=warn.length?"هشدار: زمین برای این نیازها کوچک است؛ بعضی اتاق‌ها فشرده شده‌اند.":"سه طرح با راه‌پله، آسانسور، در و پنجره مشخص تولید شد.";
};
})();
