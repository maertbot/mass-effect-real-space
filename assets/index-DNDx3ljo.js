import{W as Q,S as G,a as X,P as ee,G as de,A as ue,D as K,M as B,b as Y,c as he,d as W,B as pe,e as q,f as te,C as ae,g as se,R as fe,h as U,F as me,O as ve,E as ye,i as ge,U as be,V as ne,j as ie,k as E,l as oe,m as we,n as Se,o as O,p as Ae}from"./three-BPb0GRa3.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const n of o)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function s(o){const n={};return o.integrity&&(n.integrity=o.integrity),o.referrerPolicy&&(n.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?n.credentials="include":o.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(o){if(o.ep)return;o.ep=!0;const n=s(o);fetch(o.href,n)}})();function xe(e,t,s){return Math.min(s,Math.max(t,e))}function Ce(e,t=2.6,s=2.1){const a=e.sampleRate,o=a*t,n=e.createBuffer(2,o,a);for(let i=0;i<2;i+=1){const c=n.getChannelData(i);for(let r=0;r<o;r+=1){const f=(1-r/o)**s;c[r]=(Math.random()*2-1)*f*.18}}return n}class Me{constructor(){this.context=null,this.started=!1,this.masterGain=null,this.droneGain=null,this.hoverGain=null,this.hoverColorGain=null,this.droneFilter=null,this.hoverOscA=null,this.hoverOscB=null,this.status="standby"}async start(){if(this.started)return this.context?.state==="suspended"&&await this.context.resume(),!0;const t=window.AudioContext||window.webkitAudioContext;if(!t)return this.status="unsupported",!1;this.context=new t,this.context.state==="suspended"&&await this.context.resume();const s=this.context.createGain();s.gain.value=.18,s.connect(this.context.destination),this.masterGain=s;const a=this.context.createConvolver();a.buffer=Ce(this.context);const o=this.context.createGain();o.gain.value=.14,a.connect(o),o.connect(s);const n=this.context.createGain();n.gain.value=.12,n.connect(s),n.connect(a);const i=this.context.createBiquadFilter();i.type="lowpass",i.frequency.value=160,i.Q.value=.3,i.connect(n),this.droneFilter=i;const c=this.context.createOscillator();c.type="sawtooth",c.frequency.value=58,c.connect(i);const r=this.context.createOscillator();r.type="triangle",r.frequency.value=61,r.connect(i);const f=this.context.createOscillator();f.frequency.value=.05;const b=this.context.createGain();b.gain.value=45,f.connect(b),b.connect(i.frequency),c.start(),r.start(),f.start();const y=this.context.createGain();y.gain.value=.06,y.connect(s),y.connect(a);const l=this.context.createBiquadFilter();l.type="bandpass",l.frequency.value=300,l.Q.value=.6,l.connect(y);const m=this.context.createGain();m.gain.value=1e-5,m.connect(l),this.hoverGain=m;const v=this.context.createGain();v.gain.value=1e-5,v.connect(l),this.hoverColorGain=v;const h=this.context.createOscillator();h.type="sine",h.frequency.value=240,h.connect(m);const p=this.context.createOscillator();return p.type="triangle",p.frequency.value=360,p.connect(v),h.start(),p.start(),this.hoverOscA=h,this.hoverOscB=p,this.droneGain=n,this.started=!0,this.status="online",!0}setHoverSystem(t){if(!this.started||!this.context)return;const s=this.context.currentTime,a=Number.isFinite(t?.teff)?t.teff:5200,n=210+xe((a-2600)/9400,0,1)*360,i=t?.typeFlags?.habZone?n*1.25:n*1.45,c=t?.typeFlags?.habZone?.018:.012;this.hoverOscA.frequency.cancelScheduledValues(s),this.hoverOscA.frequency.linearRampToValueAtTime(n,s+.08),this.hoverOscB.frequency.cancelScheduledValues(s),this.hoverOscB.frequency.linearRampToValueAtTime(i,s+.12),this.hoverGain.gain.cancelScheduledValues(s),this.hoverGain.gain.setTargetAtTime(c,s,.05),this.hoverColorGain.gain.cancelScheduledValues(s),this.hoverColorGain.gain.setTargetAtTime(t?.typeFlags?.habZone?.01:.006,s,.08)}clearHover(){if(!this.started||!this.context)return;const t=this.context.currentTime;this.hoverGain.gain.cancelScheduledValues(t),this.hoverGain.gain.setTargetAtTime(1e-5,t,.08),this.hoverColorGain.gain.cancelScheduledValues(t),this.hoverColorGain.gain.setTargetAtTime(1e-5,t,.12)}}function Te(e,t,s){return Math.min(s,Math.max(t,e))}function z(e,t,s){const a=Math.sin(e*127.1+t*311.7+s*74.7)*43758.5453123;return a-Math.floor(a)}function F(e,t,s){const a=Te((s-e)/(t-e),0,1);return a*a*(3-2*a)}function Pe(e,t,s){const a=Math.floor(e),o=Math.floor(t),n=e-a,i=t-o,c=z(a,o,s),r=z(a+1,o,s),f=z(a,o+1,s),b=z(a+1,o+1,s),y=n*n*(3-2*n),l=i*i*(3-2*i),m=c+(r-c)*y,v=f+(b-f)*y;return m+(v-m)*l}function $(e,t,s,a=5){let o=0,n=.5,i=1,c=0;for(let r=0;r<a;r+=1)o+=Pe(e*i,t*i,s+r*17.3)*n,c+=n,n*=.5,i*=2;return o/c}function w(e){const t=e.replace("#",""),s=Number.parseInt(t,16);return{r:s>>16&255,g:s>>8&255,b:s&255}}function M(e,t,s){return{r:Math.round(e.r+(t.r-e.r)*s),g:Math.round(e.g+(t.g-e.g)*s),b:Math.round(e.b+(t.b-e.b)*s)}}function Le(e=""){return[...e].reduce((t,s,a)=>t+s.charCodeAt(0)*(a+3),.1)}function Ie(e){switch(e){case"hot-jupiter":return{base:w("#4b1204"),mid:w("#a63f0b"),accent:w("#ff9f3f"),haze:w("#ffd6a6")};case"rocky-hab-zone":return{base:w("#0f3f5f"),mid:w("#2e8b73"),accent:w("#9ecf6d"),haze:w("#f2f8ff")};case"ice-giant":return{base:w("#c4d8ff"),mid:w("#8ab6ff"),accent:w("#edf6ff"),haze:w("#ffffff")};case"super-earth":return{base:w("#5c4032"),mid:w("#8b6544"),accent:w("#d1ab7a"),haze:w("#f2ddc0")};case"rocky":return{base:w("#464a57"),mid:w("#7f8797"),accent:w("#b7bcc9"),haze:w("#edf1f5")};default:return{base:w("#383d49"),mid:w("#6b7384"),accent:w("#afb6c5"),haze:w("#e9edf4")}}}function Fe(e){const t=document.createElement("canvas"),s=1024,a=512;t.width=s,t.height=a;const o=t.getContext("2d"),n=o.createImageData(s,a),i=Ie(e.categories.visualType),c=Le(`${e.id}:${e.categories.visualType}`);for(let f=0;f<a;f+=1){const b=f/a,y=Math.abs(b-.5)*2;for(let l=0;l<s;l+=1){const m=l/s,v=$(m*6+y*1.3,b*6,c,4),h=$(m*5.5,b*5.5,c+11.7,5),p=$(m*14,b*14,c+28.1,4),A=$(m*22,b*11,c+47.2,3);let S=h,d=i.base;switch(e.categories.visualType){case"hot-jupiter":{const T=.5+.5*Math.sin((b+v*.08)*28+h*5);d=M(i.base,i.mid,T),d=M(d,i.accent,F(.64,.92,p));break}case"rocky-hab-zone":{const T=F(.26,.56,h-y*.12);d=M(i.base,i.mid,T),d=M(d,i.accent,F(.58,.82,h)),d=M(d,i.haze,F(.72,.96,p));break}case"ice-giant":{const T=.5+.5*Math.sin((b+v*.05)*18+h*6);d=M(i.mid,i.base,T*.35),d=M(d,i.haze,F(.63,.94,p));break}case"super-earth":{S=.25+A*.75,d=M(i.base,i.mid,S),d=M(d,i.accent,F(.66,.92,h));break}default:{S=A,d=M(i.base,i.mid,S),d=M(d,i.accent,F(.72,.95,p));break}}const R=F(.72,.98,y);d=M(d,i.haze,R*.22);const C=(f*s+l)*4;n.data[C]=d.r,n.data[C+1]=d.g,n.data[C+2]=d.b,n.data[C+3]=255}}o.putImageData(n,0,0);const r=new se(t);return r.wrapS=fe,r.colorSpace=G,r.anisotropy=8,r}function Z(e){switch(e){case"hot-jupiter":return"#ff7a2a";case"rocky-hab-zone":return"#6bd1ff";case"ice-giant":return"#bfdfff";case"super-earth":return"#d59b56";default:return"#9eb5d9"}}class Ee{constructor(t){this.container=t,this.renderer=new Q({alpha:!0,antialias:!0}),this.renderer.outputColorSpace=G,this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.setClearColor(0,0),this.renderer.domElement.className="planet-preview__canvas",this.container.appendChild(this.renderer.domElement),this.scene=new X,this.camera=new ee(30,1,.1,100),this.camera.position.set(0,.18,4.2),this.group=new de,this.scene.add(this.group),this.scene.add(new ue(11846911,1.25));const s=new K(16760948,2.2);s.position.set(4,2,4),this.scene.add(s);const a=new K(6072575,1.4);a.position.set(-3,-1,2),this.scene.add(a),this.mesh=new B(new Y(1.12,96,96),new he({color:"#7f8797",roughness:.84,metalness:.03})),this.group.add(this.mesh),this.atmosphere=new B(new Y(1.19,72,72),new W({color:"#7bb8ff",transparent:!0,opacity:.18,blending:q,side:pe})),this.group.add(this.atmosphere),this.backHalo=new B(new te(4.2,4.2),new W({color:"#214878",transparent:!0,opacity:.22,blending:q,depthWrite:!1})),this.backHalo.position.set(0,0,-.9),this.scene.add(this.backHalo),this.clock=new ae,this.currentTexture=null,this.currentPlanet=null,this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(this.container),this.resize(),this.animate=this.animate.bind(this),requestAnimationFrame(this.animate)}setPlanet(t){this.currentPlanet=t,this.currentTexture&&this.currentTexture.dispose(),this.currentTexture=Fe(t),this.mesh.material.map=this.currentTexture,this.mesh.material.needsUpdate=!0,this.mesh.material.roughness=t.categories.visualType==="ice-giant"?.55:.84,this.mesh.material.metalness=.02,this.atmosphere.material.color.set(Z(t.categories.visualType)),this.atmosphere.material.opacity=t.categories.visualType==="rocky-hab-zone"?.23:.14,this.backHalo.material.color.set(Z(t.categories.visualType))}resize(){const t=this.container.clientWidth||320,s=this.container.clientHeight||320;this.camera.aspect=t/s,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,s,!1)}animate(){const t=this.clock.getDelta();this.group.rotation.y+=t*.2,this.group.rotation.x=Math.sin(this.clock.elapsedTime*.15)*.08,this.backHalo.lookAt(this.camera.position),this.renderer.render(this.scene,this.camera),requestAnimationFrame(this.animate)}}const re={M:"#ff4400",K:"#ff8800",G:"#ffdd00",F:"#ffffee",A:"#aaccff",B:"#4488ff",O:"#4488ff"},Re=["Kepler","TESS","Ground-based","Other"],ke=["Hot Jupiters","Rocky","Ice Giants","Super-Earths","Hab Zone"],Oe=["M","K","G","F","A","B/O"],qe="#ffffee";function ze(e={}){const s=`${e.st_spectype||e.spectralType||""}`.trim().toUpperCase()[0];if(s&&re[s])return s;const a=Number.parseFloat(e.st_teff??e.teff);return Number.isFinite(a)?a>=3e4?"O":a>=1e4?"B":a>=7500?"A":a>=6e3?"F":a>=5200?"G":a>=3700?"K":"M":"Unknown"}function $e(e={}){const t=typeof e=="string"?e:ze(e);return re[t]??qe}function ce(e){const t=Number.parseFloat(e);return!Number.isFinite(t)||t<=0?5:4+Math.log10(t+1)*14}const V=.05,Be=28,_e=8,He=1.05,Ge=.72,Ve=.05;function L(e,t,s){return Math.min(s,Math.max(t,e))}function je(e){return e<.5?4*e*e*e:1-(-2*e+2)**3/2}function P(e,t=2,s=""){return e==null||Number.isNaN(e)?"N/A":`${Number(e).toLocaleString(void 0,{maximumFractionDigits:t})}${s}`}function _(e=""){return`${e}`.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}function j(e,t){return t.map(s=>`
        <button class="filter-chip" type="button" data-filter-group="${e}" data-filter-value="${s}">
          ${s}
        </button>
      `).join("")}function De(){const e=document.querySelector("#app");e.innerHTML=`
    <main class="app-shell">
      <canvas class="scene-canvas" aria-label="Mass Effect Real Space galaxy map"></canvas>
      <div class="scene-overlay">
        <div class="hud-grid" aria-hidden="true"></div>

        <header class="topbar">
          <section class="brand-panel">
            <div class="brand-eyebrow">Systems Alliance Cartography</div>
            <h1 class="brand-title">Mass Effect:<br />Real Space</h1>
            <p class="brand-subtitle">
              Real NASA exoplanets, projected into galactic 3D space with bloom, scan overlays, and live stellar telemetry.
            </p>
            <div class="brand-stats">
              <div class="status-pill">
                Visible Systems
                <span data-stat-visible>0</span>
              </div>
              <div class="status-pill">
                Total Planets
                <span data-stat-planets>0</span>
              </div>
              <div class="status-pill">
                Spatial Coverage
                <span data-stat-coverage>0</span>
              </div>
            </div>
          </section>

          <section class="search-panel">
            <label class="search-label" for="search-input">Search Planet Or Host Star</label>
            <input
              class="search-input"
              id="search-input"
              name="search-input"
              type="search"
              autocomplete="off"
              placeholder="Try Kepler-442, Proxima Cen, or TOI-700 d"
            />
            <div class="search-results" data-search-results></div>
          </section>

          <aside class="status-pip">
            <div class="status-pip__line">
              <span>Audio</span>
              <span class="audio-status" data-audio-status>Awaiting first click</span>
            </div>
            <div class="status-pip__line">
              <span>Current Focus</span>
              <span data-focus-status>Free navigation</span>
            </div>
            <div class="status-pip__line">
              <span>Filter Mode</span>
              <span data-filter-status>All systems</span>
            </div>
          </aside>
        </header>

        <aside class="filter-panel" data-filter-panel>
          <div class="filter-panel__header">
            <div>
              <div class="panel-label">Tactical Filters</div>
              <div class="filter-count" data-filter-count>0 systems highlighted</div>
            </div>
            <button class="collapse-toggle" type="button" data-filter-toggle>Collapse</button>
          </div>

          <div class="filter-panel__body">
            <section class="filter-group">
              <h2 class="filter-group__title">By Survey</h2>
              <div class="filter-chip-row">${j("survey",Re)}</div>
            </section>

            <section class="filter-group">
              <h2 class="filter-group__title">By Type</h2>
              <div class="filter-chip-row">${j("type",ke)}</div>
            </section>

            <section class="filter-group">
              <h2 class="filter-group__title">By Spectral Class</h2>
              <div class="filter-chip-row">${j("spectral",Oe)}</div>
            </section>
          </div>
        </aside>

        <section class="scan-panel" data-scan-panel>
          <div class="scan-panel__beam" aria-hidden="true"></div>
          <div class="scan-header">
            <div>
              <div class="panel-label">Planet Scan</div>
              <h2 class="scan-title" data-scan-title>System Offline</h2>
              <p class="scan-subtitle" data-scan-subtitle>Select a star to open the planetary dossier.</p>
            </div>
            <button class="close-button" type="button" data-close-panel>Close</button>
          </div>
          <div class="planet-pills" data-planet-pills></div>
          <div class="planet-layout">
            <div class="planet-stage" data-planet-stage></div>
            <div class="data-grid" data-data-grid>
              ${[["Planet Name","planetName"],["Host Star","hostStar"],["Mass","massEarth"],["Radius","radiusEarth"],["Orbital Period","orbitalPeriodDays"],["Equilibrium Temp","equilibriumTempK"],["Semi-Major Axis","semiMajorAxisAu"],["Discovery Method","discoveryMethod"],["Discovery Year","discoveryYear"]].map(([t,s])=>`
                    <div class="data-row" data-field-row="${s}">
                      <div class="data-row__label">${t}</div>
                      <div class="data-row__value" data-field-value="${s}">Awaiting scan...</div>
                    </div>
                  `).join("")}
            </div>
          </div>
        </section>

        <div class="tooltip" data-tooltip></div>

        <footer class="bottom-strip">
          <div class="bottom-strip__copy" data-bottom-copy>
            Normandy hum standby. Use orbit, pan, zoom, or WASD to move through the archive.
          </div>
          <div class="bottom-strip__metrics">
            <div class="fps-badge" hidden data-fps-badge>FPS: --</div>
            <div class="audio-status">NASA Exoplanet Archive</div>
          </div>
        </footer>
      </div>
    </main>
  `}function D(e,t){const s=document.createElement("canvas"),a=1024;s.width=a,s.height=a;const o=s.getContext("2d"),n=o.createRadialGradient(a*.5,a*.5,0,a*.5,a*.5,a*.48);n.addColorStop(0,"rgba(255,255,255,0)"),n.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=n,o.fillRect(0,0,a,a);const i=o.createImageData(a,a),c=new U(t);function r(l,m,v){const h=Math.sin(l*127.1+m*311.7+v*91.13)*43758.5453123;return h-Math.floor(h)}function f(l,m,v){const h=Math.floor(l),p=Math.floor(m),A=l-h,S=m-p,d=A*A*(3-2*A),R=S*S*(3-2*S),C=r(h,p,v),T=r(h+1,p,v),u=r(h,p+1,v),g=r(h+1,p+1,v),x=C+(T-C)*d,I=u+(g-u)*d;return x+(I-x)*R}function b(l,m,v){let h=0,p=.55,A=1,S=0;for(let d=0;d<5;d+=1)h+=f(l*A,m*A,v+d*8.13)*p,S+=p,p*=.5,A*=2;return h/S}for(let l=0;l<a;l+=1){const m=l/a-.5;for(let v=0;v<a;v+=1){const h=v/a-.5,p=Math.sqrt(h*h+m*m),A=b(h*4+e,m*4-e,e*7.1),S=Math.sin((h+m+e)*7+A*10)*.5+.5,d=L((1-p*1.85)*(A*.9+S*.35),0,1),R=d*d*170,C=(l*a+v)*4;i.data[C]=Math.round(c.r*255*L(.4+d,0,1)),i.data[C+1]=Math.round(c.g*255*L(.4+d,0,1)),i.data[C+2]=Math.round(c.b*255*L(.5+d,0,1)),i.data[C+3]=Math.round(R)}}o.putImageData(i,0,0);const y=new se(s);return y.colorSpace=G,y}function Ne(e){return[D(1.2,"#243e7f"),D(3.6,"#3f336f"),D(6.1,"#1b4362")].map((s,a)=>{const o=new W({map:s,transparent:!0,opacity:a===1?.24:.18,blending:q,depthWrite:!1}),n=new B(new te(420,280),o);return n.position.set(a*80-90,a*42-40,-220-a*110),n.rotation.z=a*.34,e.add(n),n})}function We(e){const t=[];for(const s of e.systems){const a=_(s.hostname);t.push({kind:"host",id:s.id,systemId:s.id,label:s.hostname,meta:`${s.spectralBucket||"Unknown"} • ${P(s.distanceLy,1," ly")}`,searchTerms:a})}for(const s of e.planets){const a=`${_(s.name)} ${_(s.hostname)}`;t.push({kind:"planet",id:s.id,systemId:s.systemId,planetId:s.id,label:s.name,meta:`${s.hostname} • ${s.discovery.survey}`,searchTerms:a})}return t}function Ue(e,t){return{planetName:`<strong>${t.name}</strong>`,hostStar:e.hostname,massEarth:P(t.planet.massEarth,2," M⊕"),radiusEarth:P(t.planet.radiusEarth,2," R⊕"),orbitalPeriodDays:P(t.planet.orbitalPeriodDays,2," days"),equilibriumTempK:P(t.planet.equilibriumTempK,0," K"),semiMajorAxisAu:P(t.planet.semiMajorAxisAu,3," AU"),discoveryMethod:t.discovery.method??"N/A",discoveryYear:P(t.discovery.year,0)}}function Ke(e){const t=new Map,s=new Map,a=new Map,o=e.systems.filter(n=>n.renderable&&n.galactic);for(const n of e.systems)a.set(n.id,n);for(const n of e.planets){s.set(n.id,n);const i=t.get(n.systemId)??[];i.push(n),t.set(n.systemId,i)}for(const[n,i]of t.entries())i.sort((c,r)=>(c.discovery.year??9999)!==(r.discovery.year??9999)?(c.discovery.year??9999)-(r.discovery.year??9999):c.name.localeCompare(r.name));return{data:e,renderableSystems:o,planetsBySystemId:t,planetsById:s,systemsById:a,activeFilters:{survey:null,type:null,spectral:null},hoveredSystemId:null,selectedSystemId:null,selectedPlanetId:null,searchResults:[],searchMatchSystemIds:new Set,searchIndex:We(e),flyAnimation:null,keys:new Set,scanTimers:[],filterCollapsed:!1,pointer:new ne(2,2),pointerScreen:{x:0,y:0},needsHoverUpdate:!0,fpsHistory:[],lastFrameTime:performance.now()}}function Ye(e,t){return!(t.survey&&e.survey!==t.survey||t.type&&!{"Hot Jupiters":e.typeFlags.hotJupiters,Rocky:e.typeFlags.rocky,"Ice Giants":e.typeFlags.iceGiants,"Super-Earths":e.typeFlags.superEarths,"Hab Zone":e.typeFlags.habZone}[t.type]||t.spectral&&e.spectralBucket!==t.spectral)}function Ze(e,t){const s=_(t);if(!s){e.searchResults=[],e.searchMatchSystemIds=new Set;return}const a=[];for(const o of e.searchIndex){const n=o.searchTerms.indexOf(s);n!==-1&&a.push({...o,score:n+o.label.length*.01+(o.kind==="host"?-.2:0)})}a.sort((o,n)=>o.score-n.score||o.label.localeCompare(n.label)),e.searchResults=a.slice(0,_e),e.searchMatchSystemIds=new Set(a.map(o=>o.systemId))}function Je(e,t,s){if(!e.searchResults.length){t.searchResults.classList.remove("is-visible"),t.searchResults.innerHTML="";return}t.searchResults.classList.add("is-visible"),t.searchResults.innerHTML=e.searchResults.map(a=>`
        <button class="search-result" type="button" data-result-id="${a.id}" data-system-id="${a.systemId}" ${a.planetId?`data-planet-id="${a.planetId}"`:""}>
          <span class="result-title">${a.label}</span>
          <span class="result-meta">${a.kind==="planet"?"Planet":"Host Star"} • ${a.meta}</span>
        </button>
      `).join(""),t.searchResults.querySelectorAll(".search-result").forEach(a=>{a.addEventListener("click",()=>{s(a.dataset.systemId,a.dataset.planetId??null)})})}function Qe(e){const t=new ie,s=new Float32Array(e.length*3),a=new Float32Array(e.length*3),o=new Float32Array(e.length),n=new Float32Array(e.length),i=new Float32Array(e.length),c=new Float32Array(e.length),r=new Float32Array(e.length);e.forEach((y,l)=>{const{x:m,y:v,z:h}=y.galactic,p=new U($e(y.spectralClass));s[l*3]=m*V,s[l*3+1]=v*V,s[l*3+2]=h*V,a[l*3]=p.r,a[l*3+1]=p.g,a[l*3+2]=p.b,o[l]=ce(y.radius),n[l]=0,i[l]=1,c[l]=0,r[l]=Math.random(),y.renderIndex=l,y.scenePosition=new O(s[l*3],s[l*3+1],s[l*3+2])}),t.setAttribute("position",new E(s,3)),t.setAttribute("aColor",new E(a,3)),t.setAttribute("aSize",new E(o,1)),t.setAttribute("aFocus",new E(n,1)),t.setAttribute("aVisibility",new E(i,1)),t.setAttribute("aSearchMatch",new E(c,1)),t.setAttribute("aPulseOffset",new E(r,1));const f=new Ae({transparent:!0,depthWrite:!1,blending:q,uniforms:{uTime:{value:0}},vertexShader:`
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aFocus;
      attribute float aVisibility;
      attribute float aSearchMatch;
      attribute float aPulseOffset;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float distanceScale = clamp(380.0 / max(1.0, -mvPosition.z), 0.7, 16.0);
        float pulse = 1.0 + aSearchMatch * (0.22 + 0.16 * sin(uTime * 3.6 + aPulseOffset * 6.28318));
        float focusBoost = 1.0 + aFocus * 1.5;
        float visibilityBoost = mix(0.22, 1.0, aVisibility);
        gl_PointSize = aSize * distanceScale * pulse * focusBoost;
        gl_Position = projectionMatrix * mvPosition;
        vColor = mix(aColor * 0.26, aColor * (1.2 + aFocus * 0.65), visibilityBoost);
        vAlpha = mix(0.12, 1.0, visibilityBoost) + aFocus * 0.12;
      }
    `,fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float radius = length(centered);
        if (radius > 0.5) {
          discard;
        }
        float core = smoothstep(0.18, 0.0, radius);
        float glow = smoothstep(0.52, 0.0, radius);
        float halo = pow(max(0.0, 1.0 - radius * 1.85), 3.5);
        vec3 color = vColor * (0.35 + glow * 0.9 + core * 1.5 + halo * 0.55);
        float alpha = (glow * 0.68 + core * 0.42 + halo * 0.32) * vAlpha;
        gl_FragColor = vec4(color, alpha);
      }
    `}),b=new oe(t,f);return{geometry:t,material:f,points:b}}function k(e,t,s){const a=t.geometry.getAttribute("aFocus"),o=t.geometry.getAttribute("aVisibility"),n=t.geometry.getAttribute("aSearchMatch");let i=0;for(const r of e.renderableSystems){const f=Ye(r,e.activeFilters);f&&(i+=1);const b=r.id===e.selectedSystemId,y=r.id===e.hoveredSystemId,l=e.searchMatchSystemIds.has(r.id);o.array[r.renderIndex]=b||f?1:.16,n.array[r.renderIndex]=l?1:0,a.array[r.renderIndex]=b?1:y?.58:0}a.needsUpdate=!0,o.needsUpdate=!0,n.needsUpdate=!0,s.filterCount.textContent=`${i.toLocaleString()} systems highlighted`,s.statVisible.textContent=i.toLocaleString();const c=Object.values(e.activeFilters).filter(Boolean);s.filterStatus.textContent=c.length?c.join(" • "):"All systems"}function N(e,t){const s=e.hoveredSystemId?e.systemsById.get(e.hoveredSystemId):null;if(!s){t.tooltip.classList.remove("is-visible");return}t.tooltip.innerHTML=`
    <div class="tooltip-title">${s.hostname}</div>
    <div class="tooltip-meta">
      ${P(s.distanceLy,1," ly")}<br />
      Spectral: ${s.spectralType||s.spectralClass||"Unknown"}<br />
      Planets: ${s.planetCount}
    </div>
  `,t.tooltip.classList.add("is-visible");const a=220,o=110,n=L(e.pointerScreen.x+18,12,window.innerWidth-a-12),i=L(e.pointerScreen.y+18,12,window.innerHeight-o-12);t.tooltip.style.transform=`translate3d(${n}px, ${i}px, 0)`}function le(e){e.scanTimers.forEach(t=>window.clearTimeout(t)),e.scanTimers=[]}function Xe(e,t,s,a,o){const n=e.planetsBySystemId.get(s.id)??[];t.planetPills.innerHTML=n.map(i=>`
        <button class="planet-pill ${i.id===a?"is-active":""}" type="button" data-planet-select="${i.id}">
          ${i.name}
        </button>
      `).join(""),t.planetPills.querySelectorAll("[data-planet-select]").forEach(i=>{i.addEventListener("click",()=>{o(i.dataset.planetSelect)})})}function et(e,t,s,a){const o=Ue(s,a),n=Object.entries(o);le(e),t.scanPanel.classList.add("is-scanning"),t.scanTitle.textContent=s.hostname,t.scanSubtitle.textContent=`${P(s.distanceLy,1," ly")} • ${s.spectralBucket} star • ${a.discovery.survey}`,n.forEach(([i])=>{t.fieldValues[i].textContent="Scanning...",t.fieldRows[i].classList.remove("is-revealed")}),n.forEach(([i,c],r)=>{const f=window.setTimeout(()=>{t.fieldValues[i].innerHTML=c,t.fieldRows[i].classList.add("is-revealed"),r===n.length-1&&t.scanPanel.classList.remove("is-scanning")},190*r+120);e.scanTimers.push(f)})}function H(e,t,s,a,o=null){const n=e.systemsById.get(a);if(!n||!n.scenePosition)return;const i=e.planetsBySystemId.get(n.id)??[],c=o&&e.planetsById.get(o)||i[0];if(!c)return;e.selectedSystemId=n.id,e.selectedPlanetId=c.id,t.searchResults.classList.remove("is-visible"),t.focusStatus.textContent=c.name,t.bottomCopy.textContent=`${c.name} dossier synced. ${n.hostname} at ${P(n.distanceLy,1," ly")}.`,t.scanPanel.classList.add("is-visible"),Xe(e,t,n,c.id,l=>H(e,t,s,n.id,l)),t.planetPreview.setPlanet(c),et(e,t,n,c);const r=s.object.position.clone().sub(s.target).normalize(),f=L(ce(n.radius)*2+Be,24,88),b=n.scenePosition.clone().add(r.multiplyScalar(f)),y=performance.now();e.flyAnimation={startTime:y,duration:1600,fromPosition:s.object.position.clone(),toPosition:b,fromTarget:s.target.clone(),toTarget:n.scenePosition.clone()}}function J(e,t){e.selectedSystemId=null,e.selectedPlanetId=null,e.flyAnimation=null,le(e),t.scanPanel.classList.remove("is-visible","is-scanning"),t.focusStatus.textContent="Free navigation",t.bottomCopy.textContent="Normandy hum standby. Use orbit, pan, zoom, or WASD to move through the archive."}function tt(e,t){if(!e.flyAnimation)return;const s=performance.now()-e.flyAnimation.startTime,a=L(s/e.flyAnimation.duration,0,1),o=je(a);t.object.position.lerpVectors(e.flyAnimation.fromPosition,e.flyAnimation.toPosition,o),t.target.lerpVectors(e.flyAnimation.fromTarget,e.flyAnimation.toTarget,o),a>=1&&(e.flyAnimation=null)}function at(e,t,s){if(!e.keys.size||e.flyAnimation)return;const a=new O((e.keys.has("KeyD")?1:0)-(e.keys.has("KeyA")?1:0),0,(e.keys.has("KeyS")?1:0)-(e.keys.has("KeyW")?1:0));if(a.lengthSq()===0)return;const o=new O;t.object.getWorldDirection(o);const n=new O().crossVectors(o,t.object.up).normalize(),i=L(t.object.position.distanceTo(t.target)*.75,16,90)*s,c=new O;c.addScaledVector(o,a.z*i),c.addScaledVector(n,a.x*i),t.object.position.add(c),t.target.add(c)}async function st(){De();const e={canvas:document.querySelector(".scene-canvas"),searchInput:document.querySelector(".search-input"),searchResults:document.querySelector("[data-search-results]"),filterPanel:document.querySelector("[data-filter-panel]"),filterToggle:document.querySelector("[data-filter-toggle]"),filterCount:document.querySelector("[data-filter-count]"),scanPanel:document.querySelector("[data-scan-panel]"),scanTitle:document.querySelector("[data-scan-title]"),scanSubtitle:document.querySelector("[data-scan-subtitle]"),planetPills:document.querySelector("[data-planet-pills]"),planetStage:document.querySelector("[data-planet-stage]"),tooltip:document.querySelector("[data-tooltip]"),closePanel:document.querySelector("[data-close-panel]"),bottomCopy:document.querySelector("[data-bottom-copy]"),audioStatus:document.querySelector("[data-audio-status]"),focusStatus:document.querySelector("[data-focus-status]"),filterStatus:document.querySelector("[data-filter-status]"),statVisible:document.querySelector("[data-stat-visible]"),statPlanets:document.querySelector("[data-stat-planets]"),statCoverage:document.querySelector("[data-stat-coverage]"),fpsBadge:document.querySelector("[data-fps-badge]"),fieldValues:Object.fromEntries([...document.querySelectorAll("[data-field-value]")].map(u=>[u.dataset.fieldValue,u])),fieldRows:Object.fromEntries([...document.querySelectorAll("[data-field-row]")].map(u=>[u.dataset.fieldRow,u]))},s=await(await fetch("./data/exoplanets.json")).json(),a=Ke(s),o=new Me;e.planetPreview=new Ee(e.planetStage),e.statPlanets.textContent=s.meta.planetCount.toLocaleString(),e.statCoverage.textContent=`${Math.round(s.meta.renderablePlanetCount/s.meta.planetCount*100)}%`;const n=new Q({canvas:e.canvas,antialias:!0,powerPreference:"high-performance"});n.outputColorSpace=G,n.setPixelRatio(Math.min(window.devicePixelRatio,2)),n.setSize(window.innerWidth,window.innerHeight);const i=new X;i.background=new U(0),i.fog=new me(66314,.0018);const c=new ee(54,window.innerWidth/window.innerHeight,.1,3e3);c.position.set(0,120,450);const r=new ve(c,e.canvas);r.enableDamping=!0,r.dampingFactor=.06,r.minDistance=12,r.maxDistance=1200,r.enablePan=!0,r.target.set(0,0,0);const f=new ye(n),b=new ge(i,c),y=new be(new ne(window.innerWidth,window.innerHeight),He,Ge,Ve);f.addPass(b),f.addPass(y);const l=Qe(a.renderableSystems);i.add(l.points);const m=Ne(i),v=new ie,h=1400,p=new Float32Array(h*3);for(let u=0;u<h;u+=1){const g=260+Math.random()*520,x=Math.random()*Math.PI*2,I=Math.acos(2*Math.random()-1);p[u*3]=g*Math.sin(I)*Math.cos(x),p[u*3+1]=g*Math.sin(I)*Math.sin(x),p[u*3+2]=g*Math.cos(I)*.35}v.setAttribute("position",new E(p,3));const A=new oe(v,new we({color:"#5d7cb6",size:1.1,transparent:!0,opacity:.24,blending:q,depthWrite:!1}));i.add(A);const S=new Se;S.params.Points.threshold=6.5;const d=new ae;function R(){c.aspect=window.innerWidth/window.innerHeight,c.updateProjectionMatrix(),n.setSize(window.innerWidth,window.innerHeight),f.setSize(window.innerWidth,window.innerHeight),y.setSize(window.innerWidth,window.innerHeight)}window.addEventListener("resize",R),e.filterToggle.addEventListener("click",()=>{a.filterCollapsed=!a.filterCollapsed,e.filterPanel.classList.toggle("is-collapsed",a.filterCollapsed),e.filterToggle.textContent=a.filterCollapsed?"Expand":"Collapse"}),document.querySelectorAll("[data-filter-group]").forEach(u=>{u.addEventListener("click",()=>{const{filterGroup:g,filterValue:x}=u.dataset;a.activeFilters[g]=a.activeFilters[g]===x?null:x,document.querySelectorAll(`[data-filter-group="${g}"]`).forEach(I=>{I.classList.toggle("is-active",I.dataset.filterValue===a.activeFilters[g])}),k(a,l,e)})}),e.searchInput.addEventListener("input",()=>{Ze(a,e.searchInput.value),Je(a,e,(u,g)=>H(a,e,r,u,g)),k(a,l,e)}),e.searchInput.addEventListener("keydown",u=>{if(u.key==="Enter"&&a.searchResults.length){const[g]=a.searchResults;H(a,e,r,g.systemId,g.planetId??null),e.searchResults.classList.remove("is-visible")}}),e.closePanel.addEventListener("click",()=>{J(a,e),k(a,l,e)}),e.canvas.addEventListener("pointermove",u=>{const g=e.canvas.getBoundingClientRect();a.pointer.x=(u.clientX-g.left)/g.width*2-1,a.pointer.y=-((u.clientY-g.top)/g.height)*2+1,a.pointerScreen.x=u.clientX,a.pointerScreen.y=u.clientY,a.needsHoverUpdate=!0}),e.canvas.addEventListener("pointerleave",()=>{a.pointer.set(2,2),a.hoveredSystemId=null,a.needsHoverUpdate=!0,o.clearHover()}),e.canvas.addEventListener("click",async()=>{if(!o.started){const u=await o.start();e.audioStatus.textContent=u?"Normandy hum online":"Audio unavailable"}a.hoveredSystemId&&(H(a,e,r,a.hoveredSystemId),k(a,l,e))}),window.addEventListener("keydown",u=>{if(u.key==="Escape"){J(a,e),k(a,l,e);return}["KeyW","KeyA","KeyS","KeyD"].includes(u.code)&&a.keys.add(u.code)}),window.addEventListener("keyup",u=>{a.keys.delete(u.code)});function C(){if(!a.needsHoverUpdate)return;a.needsHoverUpdate=!1,S.params.Points.threshold=L(c.position.distanceTo(r.target)*.02,3.5,12),S.setFromCamera(a.pointer,c);const g=S.intersectObject(l.points)[0],x=g?a.renderableSystems[g.index]?.id??null:null;x!==a.hoveredSystemId?(a.hoveredSystemId=x,x?o.setHoverSystem(a.systemsById.get(x)):o.clearHover(),k(a,l,e),N(a,e)):x?N(a,e):e.tooltip.classList.remove("is-visible")}k(a,l,e);function T(){const u=d.getDelta();l.material.uniforms.uTime.value=d.elapsedTime,at(a,r,u),tt(a,r),r.update(),C(),N(a,e),A.rotation.y+=u*.01,A.rotation.x+=u*.004,m.forEach((g,x)=>{g.lookAt(c.position),g.position.x+=Math.sin(d.elapsedTime*.03+x)*.01}),f.render(),requestAnimationFrame(T)}T()}st().catch(e=>{console.error(e),document.querySelector("#app").innerHTML=`<pre style="padding: 24px; color: white; background: black;">${e.message}</pre>`});
