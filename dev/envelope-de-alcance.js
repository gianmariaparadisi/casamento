/* Para cada distância horizontal a partir da forquilha, qual a maior ALTURA
   que o arremesso consegue alcançar? É o envelope real de alcance — o que
   define onde pode existir alvo. */
const STEP=1000/60, G=1.9*0.001*STEP*STEP, AIR=1-0.0002, MAX=33;
const SLING_Y=900-90-200;
const best=new Array(30).fill(Infinity); // índice = distância/100, valor = menor y (mais alto)
for(let a=0.02;a<1.56;a+=0.004){
  let vx=Math.cos(a)*MAX, vy=-Math.sin(a)*MAX, x=0, y=SLING_Y;
  for(let i=0;i<1400;i++){
    vx*=AIR; vy=vy*AIR+G; x+=vx; y+=vy;
    if(y>900) break;
    const k=Math.round(x/100);
    if(k>=0&&k<best.length&&y<best[k]) best[k]=y;
  }
}
console.log("dist   topo alcançável (y; chão=810, forquilha=610)");
best.forEach((v,i)=>{ if(v<Infinity) console.log(String(i*100).padStart(4)+"   y="+Math.round(v)); });
