/* Paquillo World · galería de 24 personajes.
   17 bocetos vectoriales y 7 retratos 3D aprobados; Carla y David con recortes transparentes.
   Sin fotografías de referencia privadas; los avatares personalizados de Supabase
   tienen prioridad sobre los recursos publicados aquí. */
(()=>{'use strict';
const R={
 adri:['Adri','m','#d29d72','#332019','#b8f0df','#27334b','short','tee',0,1],
 carla:['Carla','f','#edbb90','#8a492c','#f9f1e5','#802c63','long','dress',0,0],
 david:['David','m','#d5a17b','#251713','#3268aa','#434551','short','tee',0,1],
 diego:['Diego','m','#efbe99','#533d27','#758064','#606747','short','shirt',1,0],
 ines:['Inés','f','#eab28c','#1f191e','#8e3156','#264368','long','tee',0,0],
 ivan:['Iván','m','#e0b18c','#30211b','#3b8294','#748092','short','tee',0,1],
 javi:['Javi','m','#d6aa80','#271c18','#2782b0','#202a44','short','tee',0,1],
 jb:['JB','m','#deb08b','#35231c','#e8ddc8','#34323e','short','shirt',0,1],
 joaquin:['Joaquín','m','#e2b38f','#2a201a','#f0e9e2','#243b69','short','tee',0,1],
 leti:['Leti','f','#eac3a2','#664734','#242833','#2f4265','long','shirt',0,0],
 alba:['Alba','f','#edc1a2','#231d20','#78367c','#1f233b','long','jacket',0,0],
 'jorge-r':['Jorge R','m','#cc926d','#241b1a','#3547a0','#57654f','short','tee',0,1],
 julia:['Julia','f','#f0b28d','#58352c','#a73257','#1d325b','bun','tee',0,0],
 laura:['Laura','f','#e5b18d','#332419','#f0e8d5','#4f78a9','long','tee',0,0],
 maria:['María','f','#f4c6a3','#a45c39','#93a3b3','#687f9d','long','dress',0,0],
 mireia:['Mireia','f','#e5b894','#24201d','#f1e7d8','#e4ded1','long','jacket',0,0],
 richy:['Richy','m','#dcaf8d','#3b2a24','#252f43','#31639d','short','jacket',0,0],
 roman:['Román','m','#e2b38d','#4d3427','#636c71','#272d34','short','jacket',0,1],
 rodri:['Rodri','m','#e0b18b','#42372b','#232d45','#20283d','short','suit',0,0],
 sara:['Sara','f','#edb48e','#36251d','#c85b83','#ae587d','long','dress',0,0]
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const normSlug=s=>norm(s).replace(/ /g,'-');
const cache=new Map();
function art(id,person){
 const [name,sex,skin,hair,top,pants,style,clothes,glasses,beard]=person;
 const f=sex==='f',p='pw'+id.replace(/[^a-z]/g,'');
 const G='<defs>'+
 '<linearGradient id="'+p+'skin" x1="0" x2=".95" y1="0" y2=".3"><stop stop-color="#fff1d8"/><stop offset=".26" stop-color="'+skin+'"/><stop offset=".78" stop-color="'+skin+'"/><stop offset="1" stop-color="#8c5d59"/></linearGradient>'+
 '<linearGradient id="'+p+'top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".42"/><stop offset=".3" stop-color="'+top+'"/><stop offset="1" stop-color="#1b173d"/></linearGradient>'+
 '<linearGradient id="'+p+'legs" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".19"/><stop offset=".2" stop-color="'+pants+'"/><stop offset="1" stop-color="#181a2c"/></linearGradient>'+
 '<linearGradient id="'+p+'hair" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#96735d"/><stop offset=".28" stop-color="'+hair+'"/><stop offset="1" stop-color="#160f18"/></linearGradient>'+
 '<radialGradient id="'+p+'glow"><stop stop-color="#fff1ba" stop-opacity=".65"/><stop offset="1" stop-color="#ffe7a1" stop-opacity="0"/></radialGradient>'+
 '<filter id="'+p+'shadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#1b083e" flood-opacity=".45"/></filter></defs>';
 const hairBack=style==='long'||style==='bun'?'<path d="M88 92Q78 38 138 27Q199 31 194 92L205 184Q184 198 166 170L111 169Q87 203 77 179Z" fill="url(#'+p+'hair)" stroke="#1a1520" stroke-width="3"/>':'';
 const legs=clothes==='dress'?'<path d="M104 183L91 300L190 300L175 183Z" fill="url(#'+p+'top)" stroke="#331d40" stroke-width="3"/>'+
 '<path d="M111 297L110 335H129L132 297M150 297L151 335H172L173 297" fill="url(#'+p+'skin)" stroke="#8d6560" stroke-width="2"/>':
 '<path d="M103 199L99 325L133 325L142 240L151 325L180 325L181 197Z" fill="url(#'+p+'legs)" stroke="#171828" stroke-width="3"/>'+
 '<path d="M125 207L133 250M153 209L151 248" stroke="#fff" stroke-opacity=".15" stroke-width="4"/>';
 const arms='<path d="M99 170Q78 165 77 187L64 258Q60 274 75 282Q89 280 89 266L108 208Z" fill="url(#'+p+'skin)" stroke="#9d7867" stroke-width="3"/>'+
 '<path d="M182 171Q204 168 208 191L221 261Q224 276 208 283Q194 279 195 268L173 206Z" fill="url(#'+p+'skin)" stroke="#9d7867" stroke-width="3"/>';
 const torso='<path d="M101 160Q114 153 128 152L152 152Q173 153 184 164L194 224Q175 236 143 228Q111 235 87 224Z" fill="url(#'+p+'top)" stroke="#2b2240" stroke-width="3"/>'+
 '<path d="M115 157Q140 186 165 157" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".25"/>'+
 (['jacket','shirt','suit'].includes(clothes)?'<path d="M118 156L137 200L140 224M163 156L144 200L143 224" fill="none" stroke="#ded6d8" stroke-width="4" stroke-opacity=".7"/>'+
 (clothes==='suit'?'<path d="M128 156L140 181L153 156L145 209L140 214L136 209Z" fill="#ffe9ba" stroke="#292340" stroke-width="2"/>':''):'');
 const shoes='<path d="M98 321L131 321L134 341Q130 349 101 348L91 342Z" fill="#ede7e5" stroke="#272139" stroke-width="4"/><path d="M149 322L180 320L192 341Q189 350 156 348L147 341Z" fill="#eee5de" stroke="#272139" stroke-width="4"/>';
 const beardShape=beard?'<path d="M107 117Q113 154 139 151Q166 151 174 116Q159 138 140 140Q120 138 107 117Z" fill="'+hair+'" opacity=".62"/>':'';
 const face='<ellipse cx="140" cy="102" rx="46" ry="57" fill="url(#'+p+'skin)" stroke="#986e66" stroke-width="2"/>'+
 '<ellipse cx="94" cy="110" rx="9" ry="14" fill="url(#'+p+'skin)"/><ellipse cx="186" cy="110" rx="9" ry="14" fill="url(#'+p+'skin)"/>'+
 '<path d="M105 92Q120 85 132 92M149 91Q166 85 178 92" fill="none" stroke="'+hair+'" stroke-width="5" stroke-linecap="round"/>'+
 '<ellipse cx="119" cy="103" rx="8" ry="11" fill="#fff"/><ellipse cx="162" cy="103" rx="8" ry="11" fill="#fff"/>'+
 '<ellipse cx="120" cy="105" rx="4.5" ry="6.5" fill="#33232b"/><ellipse cx="161" cy="105" rx="4.5" ry="6.5" fill="#33232b"/>'+
 '<circle cx="121" cy="102" r="1.9" fill="#fff"/><circle cx="162" cy="102" r="1.9" fill="#fff"/>'+
 '<path d="M139 106L134 123Q138 126 143 122" fill="none" stroke="#ad736e" stroke-width="2.5" stroke-linecap="round"/>'+
 beardShape+'<path d="M124 131Q140 145 156 131" fill="none" stroke="#80413c" stroke-width="3.5" stroke-linecap="round"/>'+
 '<ellipse cx="112" cy="119" rx="11" ry="5" fill="#ef858a" opacity=".25"/><ellipse cx="170" cy="119" rx="11" ry="5" fill="#ef858a" opacity=".25"/>';
 const topHair=style==='long'?'<path d="M90 96Q79 48 110 34Q155 10 185 48Q194 64 188 100Q170 82 167 57Q134 75 95 80Z" fill="url(#'+p+'hair)" stroke="#25131c" stroke-width="3"/>'+
 '<path d="M102 61Q137 25 174 56" fill="none" stroke="#fff" stroke-width="6" opacity=".16"/>':
 style==='bun'?'<circle cx="168" cy="31" r="21" fill="url(#'+p+'hair)" stroke="#38232c" stroke-width="3"/><path d="M95 92Q85 37 127 39Q171 26 187 82L174 70Q147 65 131 55L108 84Z" fill="url(#'+p+'hair)" stroke="#291a22" stroke-width="3"/>':
 '<path d="M94 92Q79 52 102 39Q113 20 138 32Q168 16 187 47Q198 70 182 93L178 68Q154 56 128 67L101 80Z" fill="url(#'+p+'hair)" stroke="#22161d" stroke-width="3"/>'+
 '<path d="M102 56Q141 31 173 55" fill="none" stroke="#e4c7b9" stroke-width="6" opacity=".19"/>';
 const specs=glasses?'<rect x="106" y="95" width="30" height="22" rx="9" fill="#2b2b39" fill-opacity=".1" stroke="#34333b" stroke-width="4"/>'+
 '<rect x="146" y="95" width="30" height="22" rx="9" fill="#2b2b39" fill-opacity=".1" stroke="#34333b" stroke-width="4"/>'+
 '<path d="M136 102L146 102" stroke="#34333b" stroke-width="4"/>':'';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 370" role="img" aria-label="Boceto cartoon de '+name+'">'+G+
 '<ellipse cx="140" cy="340" rx="95" ry="17" fill="#1d1148" opacity=".28"/><circle cx="140" cy="140" r="139" fill="url(#'+p+'glow)"/>'+
 '<g filter="url(#'+p+'shadow)">'+legs+shoes+arms+torso+
 '<path d="M124 143L124 164Q140 173 157 162L157 142" fill="url(#'+p+'skin)" stroke="#a77368" stroke-width="2"/>'+
 hairBack+face+topHair+specs+
 '<path d="M91 178Q74 190 77 217M188 178Q206 195 203 219" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/>'+
 '</g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const APPROVED={
 adri:'paquillo-world-art/adri.webp',
 carla:'paquillo-world-art/carla-cutout-v27.webp',
 david:'paquillo-world-art/david-cutout-v27.webp',
 sandra:'paquillo-world-art/sandra.webp',
 santi:'paquillo-world-art/santi.webp',
 sofia:'paquillo-world-art/sofia.webp',
 ruben:'paquillo-world-art/ruben.webp'
};
const imageFor=name=>{
 const id=normSlug(name);
 if(APPROVED[id])return APPROVED[id];
 const person=R[id];if(!person)return '';
 if(!cache.has(id))cache.set(id,art(id,person));
 return cache.get(id);
};
window.PaquilloWorldCharacters={
 imageFor,has:name=>!!(APPROVED[normSlug(name)]||R[normSlug(name)]),
 names:[...Object.values(R).map(x=>x[0]),'Sandra','Santi','Sofía','Rubén'],
 approvedNames:['Adri','Carla','David','Sandra','Santi','Sofía','Rubén'],
 isPreview:true
};
})();