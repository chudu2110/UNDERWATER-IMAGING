/* Procedural 3D water: ray intersection with moving height field and Fresnel light. */
(() => {
  const canvas = document.querySelector('#ocean');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', {antialias:false, alpha:false, powerPreference:'low-power'});
  if (!gl) { canvas.dataset.oceanState = 'unavailable'; return; }
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    uniform vec2 resolution, pointer; uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float sea(vec2 p){float t=time*.45;float h=sin(p.x*.38+t)*.45+sin(p.y*.53-t*.8+p.x*.12)*.4;float a=.22;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){h+=(noise(p*.8+vec2(t,-t))-.5)*a;p=m*p*2.1;a*=.45;}return h;}
    vec3 sky(vec3 d){float k=pow(max(d.y,0.),.4);vec3 c=mix(vec3(.54,.70,.68),vec3(.14,.31,.36),k);vec3 sun=normalize(vec3(.65,.18,-.7));float glow=pow(max(dot(d,sun),0.),45.);c+=vec3(.9,.87,.68)*glow*.8;float clouds=noise(d.xz/(abs(d.y)+.25)*2.5);c+=vec3(.14,.16,.14)*smoothstep(.45,.8,clouds)*(1.-k)*.25;return c;}
    void main(){vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;vec3 ro=vec3(pointer.x*1.5,3.4+pointer.y*.4,time*.22);vec3 rd=normalize(vec3(uv.x,uv.y-.17+pointer.y*.035,-1.15));float horizon=smoothstep(-.025,.035,rd.y);vec3 color=sky(rd);if(rd.y<.02){float dist=0.;vec3 p=ro;for(int i=0;i<64;i++){p=ro+rd*dist;float h=p.y-sea(p.xz);dist+=max(h*.6,.025);if(h<.008||dist>180.)break;}
    if(dist<180.){float e=.06;vec3 n=normalize(vec3(sea(p.xz-vec2(e,0))-sea(p.xz+vec2(e,0)),2.*e,sea(p.xz-vec2(0,e))-sea(p.xz+vec2(0,e))));vec3 r=reflect(rd,n);float fres=pow(1.-max(dot(n,-rd),0.),4.);vec3 light=normalize(vec3(.65,.18,-.7));float spec=pow(max(dot(r,light),0.),150.);float diffuse=clamp(dot(n,light),0.,1.);vec3 water=mix(vec3(.013,.11,.13),vec3(.035,.28,.27),diffuse*.8);water+=vec3(.06,.17,.14)*pow(max(n.y,0.),12.);color=mix(water,sky(r),.13+fres*.72)+vec3(1.,.91,.67)*spec*.9;float mist=1.-exp(-dist*.012);color=mix(color,vec3(.43,.60,.59),mist*.7);color=mix(color,sky(rd),horizon);}}
    color=pow(color,vec3(.92));float vignette=1.-.17*length(uv);gl_FragColor=vec4(color*vignette,1.);}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function createRenderer() {
  let program;
  try {program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));} catch(e){canvas.dataset.oceanState='unavailable';return null;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const res=gl.getUniformLocation(program,'resolution'), clock=gl.getUniformLocation(program,'time'), pointer=gl.getUniformLocation(program,'pointer');
    canvas.dataset.oceanState = 'ready';
    return () => {
      gl.uniform2f(res, canvas.width, canvas.height);
      gl.uniform1f(clock, t);
      gl.uniform2f(pointer, x, y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
  }
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches, visible=true, t=0, last=0, lastDraw=0, mx=0,my=0,x=0,y=0;
  function resize(){const ratio=Math.min(devicePixelRatio,1.25);canvas.width=Math.round(canvas.clientWidth*ratio*.8);canvas.height=Math.round(canvas.clientHeight*ratio*.8);gl.viewport(0,0,canvas.width,canvas.height);}
  let render = createRenderer();
  resize();addEventListener('resize',resize);
  document.querySelector('.hero').addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/canvas.clientHeight-.5);},{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0;});
  // GPU context loss invalidates shaders and buffers; rebuild them when the browser restores it.
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); render = null; canvas.dataset.oceanState = 'recovering'; });
  canvas.addEventListener('webglcontextrestored', () => { render = createRenderer(); resize(); last = 0; });
  function draw(now){requestAnimationFrame(draw);const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(document.hidden||!visible||!render||now-lastDraw<40)return;lastDraw=now;if(!paused)t+=dt;x+=(mx-x)*.04;y+=(my-y)*.04;render();}
  requestAnimationFrame(draw);
})();
